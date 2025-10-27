// functions/src/assisted-mode/orchestrator.ts

/**
 * Assisted Mode Pipeline Orchestrator
 *
 * Coordinates 3-step AI reasoning chain for prompt-to-request conversion.
 * Pre-process → Step 1 → Step 2 → Step 3 → Post-process
 */

import {preprocessUrls} from "./preprocess-urls.js";
import {step1ModelSelection} from "./step1-model-selection.js";
import {step2ParameterInference} from "./step2-parameter-inference.js";
import {step3JsonGeneration} from "./step3-json-generation.js";
import {validateFinalJson} from "./validate-json.js";
import {restoreUrls} from "./restore-urls.js";
import {getModelAdapter, VEO_AI_HINTS, GEMINI_25_FLASH_IMAGE_AI_HINT, GEMINI_TTS_AI_HINTS, type ModelId} from "../models/index.js";

/**
 * Final result from analyzer
 */
export interface AnalyzeResult {
  request: Record<string, unknown>;
  reasons: string[];
  model: string;
}

/**
 * Get AI hints for a specific model
 */
function getModelHints(modelId: ModelId): string {
  if (modelId === "veo-3.1-fast-generate-preview") {
    return VEO_AI_HINTS;
  } else if (modelId === "gemini-2.5-flash-image") {
    return GEMINI_25_FLASH_IMAGE_AI_HINT;
  } else if (modelId === "gemini-2.5-flash-preview-tts") {
    return GEMINI_TTS_AI_HINTS;
  }
  return "";
}

/**
 * Process user prompt using AI-assisted mode.
 *
 * Converts natural language prompt into structured model request through
 * a 3-step AI pipeline with full reasoning transparency.
 *
 * Architecture:
 * 1. Pre-process: Extract URLs → tags
 * 2. Step 1: AI selects model (JSON mode)
 * 3. Step 2: AI infers parameters (reasoning with JSON Schema)
 * 4. Step 3: AI generates JSON (schema mode)
 * 5. Post-process: Validate + restore URLs
 *
 * @example
 * ```typescript
 * const result = await assistedRequest(
 *   "Create a 6-second vertical waterfall video",
 *   "job-abc123"
 * );
 *
 * console.log(result.model);    // "veo-3.1-fast-generate-preview"
 * console.log(result.request);  // {instances: [...], parameters: {...}}
 * console.log(result.reasons);  // ["Selected model: veo-3.1...", ...]
 * ```
 *
 * @param prompt - Natural language prompt from user
 * @param jobId - Unique job identifier for tracking
 * @returns Structured request with reasoning chain
 * @throws {Error} If model selection fails or validation fails
 */
export async function assistedRequest(
  prompt: string,
  jobId: string,
): Promise<AnalyzeResult> {
  // Pre-process: URL extraction
  const {taggedPrompt, extractedUrls} = preprocessUrls(prompt);

  // Step 1: Model selection (AI JSON mode)
  const step1 = await step1ModelSelection(taggedPrompt, jobId);

  // Get model hints based on selected model
  const modelHints = getModelHints(step1.model as ModelId);

  // Step 2: Parameter inference (AI reasoning)
  const step2Reasons = await step2ParameterInference(
    taggedPrompt,
    step1.model,
    step1.reasoning,
    modelHints,
    jobId,
  );

  // Combine all reasoning
  const allReasons = [...step1.reasoning, ...step2Reasons];

  // Get model adapter and schema
  const adapter = getModelAdapter(step1.model as ModelId);
  const ModelAdapterClass = adapter.constructor as any;
  const modelSchema = ModelAdapterClass.schema;

  // Step 3: JSON generation (AI JSON schema mode)
  const jsonWithTags = await step3JsonGeneration(
    taggedPrompt,
    allReasons,
    modelSchema,
    jobId,
  );

  // Post-process: Validation
  const validatedJson = validateFinalJson(jsonWithTags, modelSchema, jobId);

  // Post-process: URL restoration
  const finalRequest = restoreUrls(validatedJson, extractedUrls);

  return {
    request: finalRequest,
    reasons: allReasons,
    model: step1.model,
  };
}
