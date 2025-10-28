// functions/src/config.ts
import * as logger from "firebase-functions/logger";

/**
 * Hard-coded operational constants for FireGen extension.
 *
 * Design Philosophy:
 * - All values are constants (not configurable)
 * - No environment variable dependencies
 * - No Firebase dependencies
 * - Pure configuration values
 */

/**
 * Job TTL in milliseconds (90 minutes).
 * Jobs older than this are marked as "expired" during polling.
 */
export const JOB_TTL_MS = 90 * 60 * 1000;

/**
 * Polling interval in milliseconds (1 second).
 * How often to check Vertex AI for async operation completion.
 */
export const POLL_INTERVAL_MS = 1 * 1000;

/**
 * Signed URL expiration time (24 hours).
 * Provides 24h file lifetime for download operations.
 */
export const SIGNED_URL_EXPIRY_MS = 24 * 60 * 60 * 1000;

/**
 * Maximum concurrent poll tasks.
 * Controls how many jobs can be polled simultaneously.
 */
export const MAX_CONCURRENT_POLL_TASKS = 150;

/**
 * Poll task timeout in seconds.
 * Maximum time for a single poll task execution.
 */
export const POLL_TASK_TIMEOUT_SECONDS = 60;

/**
 * Maximum poll attempts before giving up.
 * At 1 poll per second, this equals 10 minutes of polling.
 * Prevents infinite retry loops and runaway costs.
 */
export const MAX_POLL_ATTEMPTS = 10 * 60; // 10 minutes = 600 attempts

// Log configuration constants
logger.info("Configuration constants loaded", {
  jobTtlMinutes: JOB_TTL_MS / 60000,
  pollIntervalSeconds: POLL_INTERVAL_MS / 1000,
  signedUrlExpiryHours: SIGNED_URL_EXPIRY_MS / (60 * 60 * 1000),
  maxConcurrentPollTasks: MAX_CONCURRENT_POLL_TASKS,
  pollTaskTimeoutSeconds: POLL_TASK_TIMEOUT_SECONDS,
  maxPollAttempts: MAX_POLL_ATTEMPTS,
});
