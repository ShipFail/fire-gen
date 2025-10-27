// functions/src/models/veo/shared-polling.ts
/**
 * Shared polling and output extraction logic for ALL Veo models.
 *
 * Uses the fetchPredictOperation endpoint for publisher models (Veo).
 * This is different from the standard operations.get endpoint.
 */
import * as logger from "firebase-functions/logger";

import {getOperation} from "../../lib/vertex-ai-client.js";
import type {ModelOutput} from "../../lib/model-adapter.js";
import type {OperationResult} from "../../poller.js";

/**
 * Poll a Veo generation operation using the fetchPredictOperation endpoint.
 *
 * Publisher models (like Veo) use a different polling endpoint than standard models.
 * The getOperation() function automatically handles this by detecting publisher models.
 */
export async function pollVeoOperation(operationName: string): Promise<OperationResult> {
  // Poll using fetchPredictOperation endpoint (for publisher models like Veo)
  const updated = await getOperation(operationName);

  return {
    done: updated?.done ?? false,
    error: updated?.error as {message?: string; code?: string} | undefined,
    data: updated?.response as {
      videos?: Array<{gcsUri?: string; mimeType?: string}>;
      raiMediaFilteredCount?: number;
      raiMediaFilteredReasons?: string[];
    } | undefined,
  };
}

/**
 * Extract output URI from a completed Veo operation.
 * Used by ALL Veo models (2.0, 3.0, 3.1+).
 */
export async function extractVeoOutput(
  result: OperationResult,
  jobId: string
): Promise<ModelOutput> {
  const response = result.data as {
    videos?: Array<{gcsUri?: string; mimeType?: string}>;
  } | undefined;

  const video = response?.videos?.[0];
  const uri = video?.gcsUri;

  if (!uri) {
    throw new Error("No video URI in Veo response");
  }

  const mimeType = video?.mimeType || "video/mp4";
  logger.info("Extracted Veo output", {jobId, uri, mimeType});

  return {uri, mimeType};
}
