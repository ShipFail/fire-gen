// functions/src/env.ts
import * as logger from "firebase-functions/logger";

/**
 * Environment variable resolution and validation.
 * This module is self-validating - it validates and logs on module load.
 */

/**
 * Valid GCP regions for Cloud Functions and Vertex AI.
 */
const VALID_REGIONS = [
  "us-central1",
  "us-east1",
  "us-east4",
  "us-west1",
  "us-west2",
  "us-west3",
  "us-west4",
  "europe-west1",
  "europe-west2",
  "europe-west3",
  "europe-west4",
  "asia-east1",
  "asia-northeast1",
  "asia-southeast1",
] as const;

type GcpRegion = typeof VALID_REGIONS[number] | string;

/**
 * Resolve region from environment variables.
 * Resolution order:
 * 1. FIREGEN_REGION - Explicit override (for local development/testing)
 * 2. FUNCTION_REGION - Production (auto-set by Cloud Functions platform)
 * 3. Default - For deployment analysis (Firebase loads modules before deploying)
 *
 * In production, FUNCTION_REGION is always auto-set by Cloud Functions.
 * For local development/testing, set FIREGEN_REGION explicitly.
 */
function resolveRegion(): GcpRegion {
  // 1. Try FIREGEN_REGION env var (explicit override)
  if (process.env.FIREGEN_REGION) {
    return process.env.FIREGEN_REGION.trim();
  }

  // 2. Try FUNCTION_REGION (production - auto-set by Cloud Functions)
  if (process.env.FUNCTION_REGION) {
    return process.env.FUNCTION_REGION.trim();
  }

  // 3. Default for deployment analysis context
  // During "firebase deploy", neither variable is set because Firebase
  // loads modules to analyze exports before actual deployment
  return "us-central1";
}

/**
 * Region for both Cloud Functions deployment and Vertex AI API calls.
 * Using the same region ensures low latency.
 */
export const REGION: GcpRegion = resolveRegion();

// Self-validation: Check if region is standard
if (!VALID_REGIONS.includes(REGION as any)) {
  logger.warn("Using non-standard region - ensure it supports Vertex AI", {
    region: REGION,
    standardRegions: VALID_REGIONS,
  });
}

// Log configuration
logger.info("Environment configuration loaded", {
  region: REGION,
});
