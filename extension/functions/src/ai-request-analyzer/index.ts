// functions/src/ai-request-analyzer/index.ts
import * as logger from "firebase-functions/logger";

import {MODEL_REGISTRY} from "../models/index.js";
import {preprocessAllUrls, restoreUrlsInRequest, restoreUrlsInText} from "./url-utils.js";
import {step1Preprocess} from "./passes/step1-preprocess.js";
import {step2Analyze} from "./passes/step2-analyze.js";

/**
 * Result of analyzing a user prompt.
 * @property {object} request - The FireGen job request object
 * @property {string[]} reasons - Array of reasoning strings (augmented context chain)
 */
export interface AnalyzeResult {
  request: any;      // JobRequest structure (for firegen-jobs/{jobId}/request)
  reasons: string[]; // Reasoning chain from all analysis steps
}

const MAX_RETRIES = 3;

/**
 * Analyze natural language prompt and generate structured JobRequest.
 *
 * Uses semantic understanding rather than keyword matching.
 * Utilizes Zod for schema validation.
 *
 * PURE FUNCTION: No RTDB operations, no side effects.
 * Returns data structure that caller can write to RTDB.
 *
 * UNIX Philosophy: 2-Step Pipeline + Validation with Augmented Context
 *
 * Step 1: Pre-Analysis (Candidate Generation)
 *   - Input: [prompt]
 *   - URL preprocessing: Replace URLs with semantic XML tags
 *   - Gather all AI hints, call AI to generate top 3 model candidates
 *   - Output: Plain text with candidates, parameters, and reasoning
 *
 * Step 2: Final Selection
 *   - Input: [prompt, step1Context, validationErrors...]
 *   - Review candidates, make final decision
 *   - Output: Plain text with JobRequest JSON + reasoning
 *   - URL restoration: Convert XML tags to gs:// URIs, clean prompt
 *
 * Orchestrator (Validation & Retry):
 *   - Parse JobRequest from Step 2
 *   - Validate with Zod (using MODEL_REGISTRY schemas)
 *   - If validation fails: add error to context, retry Step 2 (max 3×)
 *
 * Total latency: ~3-4s per attempt
 *
 * Key improvements:
 * - PURE FUNCTION: No RTDB operations (caller handles database)
 * - UNIX philosophy: Plain text between steps
 * - Zod validation: Type-safe using model schemas
 * - AI-native: Semantic understanding throughout
 * - Augmented context: Full reasoning chain preserved
 * - Retry at orchestrator level: Clean separation of concerns
 * - Smart URL handling: MIME-type-aware tags, automatic cleanup
 *
 * @param {string} userPrompt - User's natural language prompt
 * @param {string} jobId - Job ID for logging (optional, defaults to "default")
 * @returns {Promise<AnalyzeResult>} {request: object, reasons: string[]}
 */
export async function analyzePrompt(
  userPrompt: string,
  jobId: string = "default"
): Promise<AnalyzeResult> {
  logger.info("Starting analysis pipeline", {
    jobId,
    promptLength: userPrompt.length,
  });

  // Validate input
  if (!userPrompt || userPrompt.trim().length === 0) {
    throw new Error("Empty prompt provided");
  }

  if (userPrompt.length > 10000) {
    throw new Error("Prompt too long (max 10000 characters)");
  }

  //  Preprocess URLs at top level
  const {processedContexts, replacements} = preprocessAllUrls([userPrompt]);
  const processedPrompt = processedContexts[0];

  if (replacements.length > 0) {
    logger.info("URLs preprocessed for analysis", {
      jobId,
      urlCount: replacements.length,
      categories: replacements.map(r => r.category).join(", ")
    });
  }

  const reasons: string[] = [];

  try {
    // Step 1: Generate top 3 candidates (uses processed prompt)
    logger.info("Step 1: Generating candidates", {jobId});
    const step1Context = await step1Preprocess([processedPrompt], jobId);
    reasons.push(step1Context);

    // Step 2: Make final selection (with retry on validation failure)
    let request: any = null;

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        logger.info(`Step 2: Final selection (attempt ${attempt}/${MAX_RETRIES})`, {jobId});

        // Build contexts for Step 2 (use processed prompt)
        const contexts = [processedPrompt, ...reasons]; // prompt + all reasoning so far

        // Call Step 2
        const step2Context = await step2Analyze(contexts, jobId);
        reasons.push(step2Context);

        // Extract Job Request from Step 2 output
        request = extractJobRequestFromText(step2Context);

        // Restore URLs in request and prompt
        const {cleanedRequest, cleanedPrompt} = restoreUrlsInRequest(
          request,
          request.prompt || "",
          replacements
        );

        // Update request with cleaned versions
        request = cleanedRequest;
        if (request.prompt) {
          request.prompt = cleanedPrompt;
        }

        logger.info("URLs restored in final request", {
          jobId,
          hasVideoGcsUri: !!request.videoGcsUri,
          hasImageGcsUri: !!request.imageGcsUri,
          hasReferenceImages: !!request.referenceSubjectImages,
        });

        // Validate with Zod
        validateJobRequest(request);

        // Success!
        logger.info("Validation successful", {
          jobId,
          model: request.model,
          type: request.type,
          attempt,
        });
        break;

      } catch (error: any) {
        if (attempt === MAX_RETRIES) {
          // Max retries reached
          throw error;
        }

        // Add error to reasoning context for retry
        const errorMessage = `Validation Error (Attempt ${attempt}): ${error.message}`;
        reasons.push(errorMessage);
        logger.warn(errorMessage, {jobId, attempt});
      }
    }

    // Restore URLs in reasoning texts
    const restoredReasons = reasons.map(reason => restoreUrlsInText(reason, replacements));

    logger.info("Analysis pipeline complete", {
      jobId,
      model: request.model,
      type: request.type,
      reasonsCount: restoredReasons.length,
    });

    return {request, reasons: restoredReasons};

  } catch (err: unknown) {
    const message =
      err && typeof err === "object" && "message" in err && typeof err.message === "string"
        ? err.message
        : "Analysis failed";

    logger.error("analyzePrompt failed", {
      jobId,
      error: err,
      prompt: userPrompt.substring(0, 200),
    });

    throw new Error(message);
  }
}

/**
 * Extract JSON job request from Step 2 plain text output.
 * Step 2 outputs plain text with reasoning + JSON embedded.
 * Uses balanced brace matching to handle nested objects correctly.
 */
function extractJobRequestFromText(text: string): any {
  // Find first opening brace
  const start = text.indexOf("{");
  if (start === -1) {
    throw new Error("No JSON found in Step 2 output");
  }

  // Find matching closing brace using balanced counting
  let depth = 0;
  let end = -1;
  for (let i = start; i < text.length; i++) {
    if (text[i] === "{") depth++;
    else if (text[i] === "}") {
      depth--;
      if (depth === 0) {
        end = i + 1;
        break;
      }
    }
  }

  if (end === -1) {
    throw new Error("Unbalanced braces in Step 2 JSON output");
  }

  const jsonStr = text.substring(start, end);
  try {
    return JSON.parse(jsonStr);
  } catch (error: any) {
    throw new Error(`Failed to parse JSON from Step 2: ${error.message}`);
  }
}

/**
 * Validate job request using Zod schema from MODEL_REGISTRY.
 * Throws error if validation fails (caught by retry logic).
 */
function validateJobRequest(request: any): void {
  // 1. Check model exists
  if (!request.model) {
    throw new Error("Missing 'model' field in job request");
  }

  if (!(request.model in MODEL_REGISTRY)) {
    throw new Error(
      `Invalid model: ${request.model}. Available models: ${Object.keys(MODEL_REGISTRY).join(", ")}`
    );
  }

  // 2. Get Zod schema for this model
  const modelEntry = MODEL_REGISTRY[request.model as keyof typeof MODEL_REGISTRY];
  const schema = modelEntry.config.schema;

  // 3. Validate with Zod (throws ZodError if invalid)
  try {
    schema.parse(request);
  } catch (error: any) {
    // Zod error - format it nicely
    if (error.errors) {
      const errorMessages = error.errors
        .map((err: any) => `${err.path.join(".")}: ${err.message}`)
        .join(", ");
      throw new Error(errorMessages);
    }
    throw error;
  }
}
