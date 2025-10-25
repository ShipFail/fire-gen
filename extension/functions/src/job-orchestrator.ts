// functions/src/job-orchestrator.ts
import {getDatabase} from "firebase-admin/database";
import type {Reference} from "firebase-admin/database";
import * as logger from "firebase-functions/logger";
import {z} from "zod";

import {JOB_TTL_MS, POLL_INTERVAL_MS} from "./config.js";
import {generateSignedUrl} from "./storage.js";
import {enqueuePollTask, initializeJobMeta} from "./poller.js";
import {analyzePrompt} from "./ai-request-analyzer/index.js";
import {getModelAdapter, isValidModelId} from "./models/index.js";
import {getFireGenVersion} from "./version.js";
import type {JobNode} from "./types/index.js";

/**
 * Start a job by invoking the appropriate model adapter.
 * Handles both sync and async operations.
 */
export async function startJob(jobId: string, job: JobNode): Promise<void> {
  const db = getDatabase();
  const jobPath = `firegen-jobs/${jobId}`;
  const jobRef = db.ref(jobPath);

  try {
    await jobRef.update({status: "starting"});

    // Get adapter from registry - validates model ID exists
    const modelId = (job.request as any).model;
    if (!isValidModelId(modelId)) {
      throw new Error(`Unknown model ID: ${modelId}`);
    }

    const adapter = getModelAdapter(modelId);
    const result = await adapter.start(job.request, jobId);

    if (result.operationName) {
      // Async operation (e.g., Veo) - set up polling
      // Preserve existing _meta (contains prompt, aiAssisted, analyzedAt for AI-assisted jobs)
      const existingMeta = job._meta || {};
      const meta = initializeJobMeta();

      await jobRef.update({
        status: "running",
        _meta: {
          ...existingMeta,  // Preserve prompt, aiAssisted, analyzedAt, etc.
          ...meta,          // Update ttl, attempt, nextPoll
          operation: result.operationName,
        },
      });

      await enqueuePollTask(jobId);
      logger.info("Job started (async)", {jobId, operationName: result.operationName});
    } else if (result.output) {
      // Sync operation (e.g., Nano Banana, Gemini Text, Chirp STT) - complete immediately
      const response: Record<string, unknown> = {};

      // Add uri/url for media outputs (not for text/STT)
      if (result.output.uri) {
        response.uri = result.output.uri;
        const url = await generateSignedUrl(result.output.uri);
        if (url) response.url = url;
      }

      // Add text for text/STT outputs
      if (result.output.text) response.text = result.output.text;

      // Add metadata if present
      if (result.output.metadata) response.metadata = result.output.metadata;

      // Preserve existing _meta (contains prompt, aiAssisted, analyzedAt for AI-assisted jobs)
      // and add version tracking
      const existingMeta = job._meta || {};

      await jobRef.update({
        status: "succeeded",
        response,
        _meta: {
          ...existingMeta,
          version: getFireGenVersion(),
        },
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
      response: {error: {message, code}},
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
    const completeJob: JobNode = {
      uid,
      status: "requested",
      request: analyzed.request,      // From analyzer
      _meta: {
        // Job orchestration metadata
        ttl: Date.now() + JOB_TTL_MS,
        attempt: 0,
        nextPoll: Date.now() + POLL_INTERVAL_MS,
        // AI-assisted metadata
        prompt,
        aiAssisted: true,
        analyzedAt: Date.now(),
        reasons: analyzed.reasons,    // Store AI reasoning chain
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
    await jobRef.set({
      uid,
      status: "failed",
      response: {
        error: {
          message: `AI analysis failed: ${message}`,
          code: "AI_ANALYSIS_FAILED",
          details: err instanceof Error ? err.name : undefined, // Include error type for debugging
        },
      },
      _meta: {
        prompt, // Save original prompt even on failure
        aiAssisted: true,
        analyzedAt: Date.now(),
        reasons: [], // Empty array for consistency
        errorType: err instanceof Error ? err.name : typeof err, // Save error type for analytics
      },
    });
  }
}
