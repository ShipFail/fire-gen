// functions/src/triggers/on-job-poll.ts
import {getDatabase} from "firebase-admin/database";
import {onTaskDispatched} from "firebase-functions/v2/tasks";
import * as logger from "firebase-functions/logger";

import {REGION} from "../env.js";
import {MAX_CONCURRENT_POLL_TASKS, POLL_TASK_TIMEOUT_SECONDS} from "../config.js";
import {generateSignedUrl} from "../storage.js";
import {serializeError} from "../lib/error-utils.js";
import {
  enqueuePollTask,
  isJobExpired,
  isJobTerminal,
  incrementPollAttempt,
  recordPollError,
} from "../poller.js";
import {getModelAdapter} from "../models/index.js";
import {isRecord} from "../util.js";
import type {JobNode, FileInfo} from "../types/index.js";

/**
 * Helper to get file extension from URI or mimeType
 */
function getFileExtension(uri?: string, mimeType?: string): string {
  if (uri) {
    const match = uri.match(/\.([a-z0-9]+)$/i);
    if (match) return `.${match[1]}`;
  }
  if (mimeType) {
    const typeMap: Record<string, string> = {
      "video/mp4": ".mp4",
      "image/png": ".png",
      "image/jpeg": ".jpg",
      "audio/wav": ".wav",
      "audio/mpeg": ".mp3",
    };
    return typeMap[mimeType] || "";
  }
  return "";
}

/**
 * Task Queue handler for polling async operations (e.g., Veo).
 * Polls the operation status and updates the job when complete.
 */
export const onJobPoll = onTaskDispatched(
  {
    rateLimits: {maxConcurrentDispatches: MAX_CONCURRENT_POLL_TASKS},
    timeoutSeconds: POLL_TASK_TIMEOUT_SECONDS,
    region: REGION,
  },
  async (req) => {
    // Validate request data
    const data = req.data as unknown;
    if (!isRecord(data) || typeof data.jobPath !== "string") {
      logger.warn("onFiregenJobPoll invoked without valid jobPath");
      return;
    }
    const jobPath = data.jobPath;

    const db = getDatabase();
    const jobRef = db.ref(jobPath);
    const snap = await jobRef.get();
    if (!snap.exists()) return;

    const job = snap.val() as JobNode;

    // Skip if job is already in terminal state
    if (isJobTerminal(job)) {
      return;
    }

    // Check for TTL expiry
    if (isJobExpired(job)) {
      await jobRef.update({
        status: "expired",
        "metadata/updatedAt": Date.now(),
      });
      return;
    }

    const operationName = job.metadata?.operation;
    if (!operationName) {
      await jobRef.update({
        status: "failed",
        error: {
          code: "MISSING_OPERATION",
          message: "Missing operation name",
        },
        "metadata/updatedAt": Date.now(),
      });
      return;
    }

    try {
      // Get adapter from model ID
      const modelId = job.model;
      if (!modelId) {
        throw new Error("Missing model ID in job");
      }

      const adapter = getModelAdapter(modelId as any) as any; // Async adapters have poll()
      if (!adapter.poll) {
        throw new Error("Adapter does not support polling");
      }

      const result = await adapter.poll(operationName);

      if (result.done) {
        if (result.error) {
          // Operation failed
          await jobRef.update({
            status: "failed",
            error: {
              code: result.error.code || "MODEL_ERROR",
              message: result.error.message || "Unknown error",
            },
            response: result.data || {},  // Store raw error response
            "metadata/updatedAt": Date.now(),
          });
        } else {
          // Operation succeeded
          if (!adapter.extractOutput) {
            throw new Error("Adapter does not support extractOutput");
          }

          const jobId = jobPath.split("/").pop()!;
          const output = await adapter.extractOutput(result, jobId);

          logger.info("Operation completed", {jobId, uri: output.uri});

          // Build files array
          const files: FileInfo[] = [];
          if (output.uri) {
            const ext = getFileExtension(output.uri, output.metadata?.mimeType as string);
            const filename = `file0${ext}`;
            const signedUrl = await generateSignedUrl(output.uri);

            files.push({
              name: filename,
              gs: output.uri,
              https: signedUrl || "",
              mimeType: output.metadata?.mimeType as string,
              size: output.metadata?.size as number,
            });
          }

          await jobRef.update({
            status: "succeeded",
            response: result.data || {},  // Store raw model response
            files: files.length > 0 ? files : undefined,
            "metadata/updatedAt": Date.now(),
          });
        }
        return;
      }

      // Not done - increment attempt and re-enqueue
      await incrementPollAttempt(jobPath, job.metadata?.attempt ?? 0);
      await enqueuePollTask(jobPath.split("/").pop()!);
    } catch (err: unknown) {
      logger.error("onFiregenJobPoll error", {jobPath, error: serializeError(err)});

      // Record error and re-enqueue
      await recordPollError(jobPath, job.metadata?.attempt ?? 0);
      await enqueuePollTask(jobPath.split("/").pop()!);
    }
  }
);
