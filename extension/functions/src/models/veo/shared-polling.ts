// functions/src/models/veo/shared-polling.ts
/**
 * Shared polling and output extraction logic for ALL Veo models.
 * All Veo models use the same polling mechanism via REST API operations.
 */
import * as logger from "firebase-functions/logger";

import {getOperation} from "../_shared/vertex-ai-client.js";
import type {ModelOutput} from "../_shared/base.js";
import type {OperationResult} from "../../poller.js";

/**
 * Poll a Veo generation operation.
 * Used by ALL Veo models (2.0, 3.0, 3.1+).
 */
export async function pollVeoOperation(operationName: string): Promise<OperationResult> {
  const updated = await getOperation(operationName);

  return {
    done: updated?.done ?? false,
    error: updated?.error as {message?: string; code?: string} | undefined,
    data: updated?.response as {
      generatedVideos?: Array<{video?: {uri?: string}}>;
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
    generatedVideos?: Array<{video?: {uri?: string}}>;
  } | undefined;

  const uri = response?.generatedVideos?.[0]?.video?.uri;

  if (!uri) {
    throw new Error("No video URI in Veo response");
  }

  logger.info("Extracted Veo output", {jobId, uri});

  return {uri};
}
