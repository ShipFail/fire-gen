// functions/src/poller.ts
import {getDatabase} from "firebase-admin/database";
import {getFunctions} from "firebase-admin/functions";
import * as logger from "firebase-functions/logger";

import {JOB_TTL_MS, POLL_INTERVAL_MS} from "./config.js";
import {getFireGenVersion} from "./version.js";
import type {JobNode} from "./types/index.js";

/**
 * Generic operation result from polling.
 */
export interface OperationResult {
  done: boolean;
  error?: {
    message?: string;
    code?: string;
  };
  data?: unknown; // Model-specific response data
}

/**
 * Enqueue a poll task for a job.
 * Used to schedule periodic polling of async operations.
 */
export async function enqueuePollTask(jobId: string, delayMs = POLL_INTERVAL_MS) {
  const jobPath = `firegen-jobs/${jobId}`;
  const queue = getFunctions().taskQueue("onJobPoll");

  await queue.enqueue(
    {jobPath},
    {
      scheduleDelaySeconds: Math.ceil(delayMs / 1000),
      dispatchDeadlineSeconds: 60,
    }
  );

  logger.info("Enqueued poll task", {jobId, delayMs});
}

/**
 * Check if a job has expired based on TTL.
 */
export function isJobExpired(job: JobNode): boolean {
  if (!job._meta?.ttl) return false;
  return Date.now() > job._meta.ttl;
}

/**
 * Check if a job is in a terminal state.
 */
export function isJobTerminal(job: JobNode): boolean {
  return ["succeeded", "failed", "expired", "canceled"].includes(job.status);
}

/**
 * Initialize job TTL and metadata for polling.
 * Includes version tracking for debugging and support.
 */
export function initializeJobMeta(): {
  version: string;
  ttl: number;
  attempt: number;
  nextPoll: number;
} {
  return {
    version: getFireGenVersion(),
    ttl: Date.now() + JOB_TTL_MS,
    attempt: 0,
    nextPoll: Date.now() + POLL_INTERVAL_MS,
  };
}

/**
 * Increment poll attempt counter.
 */
export async function incrementPollAttempt(jobPath: string, currentAttempt: number) {
  const db = getDatabase();
  const jobRef = db.ref(jobPath);

  await jobRef.update({
    "_meta/attempt": currentAttempt + 1,
    "_meta/nextPoll": Date.now() + POLL_INTERVAL_MS,
  });
}

/**
 * Record a polling error.
 */
export async function recordPollError(jobPath: string, currentAttempt: number) {
  const db = getDatabase();
  const jobRef = db.ref(jobPath);

  await jobRef.update({
    "_meta/attempt": currentAttempt + 1,
    "_meta/nextPoll": Date.now() + POLL_INTERVAL_MS,
    "_meta/lastError": Date.now(),
  });
}
