// functions/src/firebase-admin.ts
import {initializeApp} from "firebase-admin/app";
import {getStorage} from "firebase-admin/storage";
import * as logger from "firebase-functions/logger";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import {execSync} from "child_process";

/**
 * Firebase Admin initialization and derived values.
 * This module is self-validating - it validates and logs on module load.
 */

export const app = initializeApp();

/**
 * Resolve Google Cloud project ID.
 * Resolution order:
 * 1. Firebase app config (most reliable in Cloud Functions)
 * 2. GOOGLE_CLOUD_PROJECT environment variable (platform-provided)
 * 3. ADC credentials file (from `gcloud auth application-default login`)
 * 4. gcloud CLI config (from `gcloud config set project`)
 *
 * @throws {Error} If project ID cannot be determined
 */
function resolveProjectId(): string {
  // 1. Try Firebase app config
  if (app.options.projectId) {
    return app.options.projectId;
  }

  // 2. Try environment variable
  if (process.env.GOOGLE_CLOUD_PROJECT) {
    return process.env.GOOGLE_CLOUD_PROJECT;
  }

  // 3. Try ADC credentials file
  const adcPath = path.join(os.homedir(), ".config/gcloud/application_default_credentials.json");
  try {
    const adcContent = fs.readFileSync(adcPath, "utf-8");
    const adc = JSON.parse(adcContent);
    if (adc.quota_project_id) {
      logger.info("Project ID resolved from ADC credentials", {projectId: adc.quota_project_id});
      return adc.quota_project_id;
    }
  } catch (err) {
    // ADC file doesn't exist or is invalid, continue to next option
  }

  // 4. Try gcloud CLI config
  try {
    const projectId = execSync("gcloud config get-value project", {encoding: "utf-8"}).trim();
    if (projectId && projectId !== "(unset)") {
      logger.info("Project ID resolved from gcloud config", {projectId});
      return projectId;
    }
  } catch (err) {
    // gcloud CLI not available or not configured, continue to error
  }

  throw new Error(
    "Unable to determine Google Cloud project ID. " +
    "Try one of: " +
    "1) Set GOOGLE_CLOUD_PROJECT env var, " +
    "2) Run 'gcloud auth application-default login', " +
    "3) Run 'gcloud config set project YOUR_PROJECT_ID'"
  );
}

/**
 * Google Cloud project ID.
 */
export const PROJECT_ID = resolveProjectId();

/**
 * Resolve Firebase Storage bucket name.
 * Resolution order:
 * 1. FIREGEN_BUCKET - Explicit override
 * 2. Firebase app config storageBucket (production)
 * 3. Return default Firebase Storage bucket name
 */
function resolveBucketName(): string {
  // 1. Try explicit override
  if (process.env.FIREGEN_BUCKET) {
    return process.env.FIREGEN_BUCKET.trim();
  }

  // 2. Try Firebase app config (available in production)
  try {
    const bucket = getStorage().bucket();
    if (bucket.name) {
      return bucket.name;
    }
  } catch (err) {
    // Bucket not configured in Firebase config
  }

  // 3. Return default Firebase Storage bucket name
  return `${PROJECT_ID}.firebasestorage.app`;
}

/**
 * Default Firebase Storage bucket name.
 */
export const BUCKET_NAME = resolveBucketName();

// Log Firebase configuration
logger.info("Firebase Admin initialized", {
  projectId: PROJECT_ID,
  bucketName: BUCKET_NAME,
});
