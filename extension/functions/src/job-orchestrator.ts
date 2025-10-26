// functions/src/job-orchestrator.ts
import {getDatabase} from "firebase-admin/database";
import type {Reference} from "firebase-admin/database";
import * as logger from "firebase-functions/logger";
import {z} from "zod";

import {JOB_TTL_MS, POLL_INTERVAL_MS} from "./config.js";
import {generateSignedUrl} from "./storage.js";
import {enqueuePollTask} from "./poller.js";
import {analyzePrompt} from "./ai-request-analyzer/index.js";
import {getModelAdapter, isValidModelId} from "./models/index.js";
import {getFireGenVersion} from "./version.js";
import type {JobNode, FileInfo} from "./types/index.js";

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
 * Start a job by invoking the appropriate model adapter.
 * Handles both sync and async operations.
 */
export async function startJob(jobId: string, job: JobNode): Promise<void> {
  const db = getDatabase();
  const jobPath = `firegen-jobs/${jobId}`;
  const jobRef = db.ref(jobPath);

  try {
    await jobRef.update({
      status: "starting",
      "metadata/updatedAt": Date.now(),
    });

    // Get adapter from registry - validates model ID exists
    const modelId = job.model;
    if (!isValidModelId(modelId)) {
      throw new Error(`Unknown model ID: ${modelId}`);
    }

    const adapter = getModelAdapter(modelId);
    const result = await adapter.start(job.request, jobId);

    if (result.operationName) {
      // Async operation (e.g., Veo) - set up polling
      const now = Date.now();
      await jobRef.update({
        status: "running",
        "metadata/updatedAt": now,
        "metadata/operation": result.operationName,
        "metadata/ttl": now + JOB_TTL_MS,
        "metadata/attempt": 0,
        "metadata/nextPoll": now + POLL_INTERVAL_MS,
      });

      await enqueuePollTask(jobId);
      logger.info("Job started (async)", {jobId, operationName: result.operationName});
    } else if (result.output) {
      // Sync operation - complete immediately
      const files: Record<string, FileInfo> = {};

      // Build files map
      if (result.output.uri) {
        const ext = getFileExtension(result.output.uri, result.output.metadata?.mimeType as string);
        const filename = `file0${ext}`;
        const signedUrl = await generateSignedUrl(result.output.uri);

        files[filename] = {
          gs: result.output.uri,
          https: signedUrl || "",
          mimeType: result.output.metadata?.mimeType as string,
          size: result.output.metadata?.size as number,
        };
      }

      await jobRef.update({
        status: "succeeded",
        response: result.rawResponse || {},  // Store raw model response
        files: Object.keys(files).length > 0 ? files : undefined,
        "metadata/updatedAt": Date.now(),
      });

      // Log appropriate field based on output type
      if (result.output.uri) {
        logger.info("Job completed (sync)", {jobId, uri: result.output.uri});
      } else if (result.output.text) {
        logger.info("Job completed (sync)", {jobId, textLength: result.output.text.length});
      } else {
        logger.info("Job completed (sync)", {jobId});
      }
    } else {
      throw new Error("Model adapter returned invalid result");
    }
  } catch (err: unknown) {
    let message = "Start failed";
    let code = "START_FAILED";

    // Handle Zod validation errors
    if (err instanceof z.ZodError) {
      message = `Validation failed: ${err.errors.map(e => `${e.path.join(".")}: ${e.message}`).join(", ")}`;
      code = "VALIDATION_ERROR";
    } else if (err && typeof err === "object" && "message" in err && typeof err.message === "string") {
      message = err.message;
    }

    logger.error("startJob failed", {jobId, error: err, code});

    await jobRef.update({
      status: "failed",
      error: {code, message},
      "metadata/updatedAt": Date.now(),
    });
  }
}

/**
 * Analyze AI-assisted job (natural language prompt) and transform to structured request.
 * This function handles the complete transformation flow:
 * 1. Call AI to analyze prompt
 * 2. Build complete JobNode structure
 * 3. Replace string value with structured object
 * 4. Process job normally
 */
export async function analyzeAndTransformJob(
  jobId: string,
  prompt: string,
  uid: string,
  jobRef: Reference
): Promise<void> {
  logger.info("Analyzing AI-assisted job", {jobId, uid, promptLength: prompt.length});

  try {
    // Step 1: Analyze prompt with AI (pure function - no RTDB operations)
    const analyzed = await analyzePrompt(prompt, jobId);

    logger.info("Prompt analyzed successfully", {
      jobId,
      analyzedType: analyzed.request.type,
      analyzedModel: analyzed.request.model,
    });

    // Step 2: Build complete job structure
    const now = Date.now();
    const completeJob: JobNode = {
      uid,
      model: analyzed.request.model,      // Model at root level
      status: "requested",
      request: analyzed.request,          // Raw request to model
      metadata: {
        version: getFireGenVersion(),
        createdAt: now,
        updatedAt: now,
        prompt,                           // Original prompt
        aiAssisted: true,
        reasons: analyzed.reasons,        // AI reasoning chain
        // Polling metadata (will be set when job starts)
        ttl: now + JOB_TTL_MS,
        attempt: 0,
        nextPoll: now + POLL_INTERVAL_MS,
      },
    };

    // Step 3: Replace the string value with complete job structure
    // This updates the existing node rather than creating a new one
    await jobRef.set(completeJob);

    logger.info("Job transformed to structured request", {
      jobId,
      type: analyzed.request.type,
      model: analyzed.request.model,
    });

    // Step 4: Start processing immediately (no need to wait for another trigger)
    await startJob(jobId, completeJob);
  } catch (err: unknown) {
    const message =
      err && typeof err === "object" && "message" in err && typeof err.message === "string"
        ? err.message
        : "AI analysis failed";

    // Enhanced error logging for debugging
    const errorDetails = {
      jobId,
      uid,
      prompt: prompt.substring(0, 200), // First 200 chars for debugging
      errorMessage: err instanceof Error ? err.message : String(err),
      errorName: err instanceof Error ? err.name : typeof err,
      errorStack: err instanceof Error ? err.stack : undefined,
    };

    logger.error("analyzeAndTransformJob failed", errorDetails);

    // Write failure to database
    const now = Date.now();
    await jobRef.set({
      uid,
      model: "unknown",                  // Model unknown since analysis failed
      status: "failed",
      request: {},                       // Empty request
      error: {
        code: "AI_ANALYSIS_FAILED",
        message: `AI analysis failed: ${message}`,
        details: err instanceof Error ? {name: err.name, stack: err.stack} : undefined,
      },
      metadata: {
        version: getFireGenVersion(),
        createdAt: now,
        updatedAt: now,
        prompt,                          // Save original prompt even on failure
        aiAssisted: true,
        reasons: [],                     // Empty array for consistency
      },
    });
  }
}
