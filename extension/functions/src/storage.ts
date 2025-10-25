// functions/src/storage.ts
import {getStorage} from "firebase-admin/storage";
import * as logger from "firebase-functions/logger";

import {BUCKET_NAME} from "./firebase-admin.js";
import {SIGNED_URL_EXPIRY_MS} from "./config.js";
// JobRequest type moved to models/index.ts
type JobRequest = any;

/**
 * Generate storage filename based on media type and model ID.
 * Pattern: {mediaType}-{modelId}.{ext}
 *
 * Examples:
 * - video-veo-3.1-fast-generate-preview.mp4
 * - image-gemini-2.5-flash-image.png
 * - audio-tts-gemini-2.5-flash-preview-tts.wav
 */
export function generateStorageFilename(request: JobRequest): string {
  if (request.type === "video") {
    return `video-${request.model}.mp4`;
  } else if (request.type === "image") {
    return `image-${request.model}.png`;
  } else if (request.type === "audio") {
    const audioReq = request as any;
    if (audioReq.subtype === "tts") {
      return `audio-tts-${audioReq.model}.wav`;
    }
  }
  throw new Error(`Unsupported job type: ${(request as any).type}`);
}

/**
 * Get the GCS directory path for a job.
 * Pattern: gs://{bucket}/firegen-jobs/{jobId}/
 */
export function getJobStorageUri(jobId: string): string {
  return `gs://${BUCKET_NAME}/firegen-jobs/${jobId}/`;
}

/**
 * Get the full GCS URI for a job's output file.
 * Pattern: gs://{bucket}/firegen-jobs/{jobId}/{mediaType}-{modelId}.{ext}
 */
export function getOutputFileUri(jobId: string, request: JobRequest): string {
  const filename = generateStorageFilename(request);
  return `${getJobStorageUri(jobId)}${filename}`;
}

/**
 * Generate a signed URL for a GCS URI.
 * Signed URLs allow temporary unauthenticated access (25h expiry).
 */
export async function generateSignedUrl(gcsUri: string): Promise<string | undefined> {
  if (!gcsUri || !gcsUri.startsWith("gs://")) {
    return undefined;
  }

  try {
    const bucket = getStorage().bucket();
    const filePath = gcsUri.replace(`gs://${bucket.name}/`, "");
    const file = bucket.file(filePath);

    const [signedUrl] = await file.getSignedUrl({
      action: "read",
      expires: Date.now() + SIGNED_URL_EXPIRY_MS,
    });

    logger.info("Generated signed URL", {gcsUri, signedUrl});
    return signedUrl;
  } catch (err) {
    logger.error("Failed to generate signed URL", {gcsUri, error: err});
    return undefined;
  }
}

/**
 * Upload data to GCS and return the URI.
 * Used for models that return inline data (e.g., Nano Banana).
 */
export async function uploadToGcs(
  data: Buffer,
  gcsUri: string,
  contentType: string
): Promise<string> {
  const bucket = getStorage().bucket();
  const filePath = gcsUri.replace(`gs://${bucket.name}/`, "");
  const file = bucket.file(filePath);

  await file.save(data, {
    metadata: {
      contentType,
    },
  });

  logger.info("Uploaded file to GCS", {gcsUri, contentType});
  return gcsUri;
}
