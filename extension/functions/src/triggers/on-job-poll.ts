// functions/src/triggers/on-job-poll.ts
import {getDatabase} from "firebase-admin/database";
import {onTaskDispatched} from "firebase-functions/v2/tasks";
import * as logger from "firebase-functions/logger";

import {REGION} from "../env.js";
import {MAX_CONCURRENT_POLL_TASKS, POLL_TASK_TIMEOUT_SECONDS} from "../config.js";
import {generateSignedUrl} from "../storage.js";
import {
  enqueuePollTask,
  isJobExpired,
  isJobTerminal,
  incrementPollAttempt,
  recordPollError,
} from "../poller.js";
import {getModelAdapter} from "../models/index.js";
import {isRecord} from "../util.js";
import type {JobNode} from "../types/index.js";

/**
 * Task Queue handler for polling async operations (e.g., Veo).
 * Polls the operation status and updates the job when complete.
 */
export const onFiregenJobPoll = onTaskDispatched(
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
      await jobRef.update({status: "expired"});
      return;
    }

    const operationName = job._meta?.operation;
    if (!operationName) {
      await jobRef.update({
        status: "failed",
        response: {error: {message: "Missing operation name"}},
      });
      return;
    }

    try {
      // Get adapter from model ID
      const modelId = (job.request as any)?.model;
      if (!modelId) {
        throw new Error("Missing model ID in job request");
      }

      const adapter = getModelAdapter(modelId) as any; // Async adapters have poll()
      if (!adapter.poll) {
        throw new Error("Adapter does not support polling");
      }

      const result = await adapter.poll(operationName);

      if (result.done) {
        if (result.error) {
          // Operation failed
          await jobRef.update({
            status: "failed",
            response: {
              error: {
                message: result.error.message || "Unknown error",
                code: result.error.code,
              },
            },
          });
        } else {
          // Operation succeeded
          if (!adapter.extractOutput) {
            throw new Error("Adapter does not support extractOutput");
          }

          const jobId = jobPath.split("/").pop()!;
          const output = await adapter.extractOutput(result, jobId);

          logger.info("Operation completed", {jobId, uri: output.uri});

          const response: Record<string, unknown> = {};

          // Add uri/url for media outputs (async operations like Veo always have uri)
          if (output.uri) {
            response.uri = output.uri;
            const url = await generateSignedUrl(output.uri);
            if (url) response.url = url;
          }

          // Add text if present
          if (output.text) response.text = output.text;

          // Add metadata if present
          if (output.metadata) response.metadata = output.metadata;

          await jobRef.update({
            status: "succeeded",
            response,
          });
        }
        return;
      }

      // Not done - increment attempt and re-enqueue
      await incrementPollAttempt(jobPath, job._meta?.attempt ?? 0);
      await enqueuePollTask(jobPath.split("/").pop()!);
    } catch (err: unknown) {
      logger.error("onFiregenJobPoll error", {jobPath, error: err});

      // Record error and re-enqueue
      await recordPollError(jobPath, job._meta?.attempt ?? 0);
      await enqueuePollTask(jobPath.split("/").pop()!);
    }
  }
);
