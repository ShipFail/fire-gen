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
 * Analyze user prompt and generate model request.
 *
 * Architecture:
 * 1. Pre-process: Extract URLs → tags
 * 2. Step 1: AI selects model (JSON mode)
 * 3. Step 2: AI infers parameters (reasoning)
 * 4. Step 3: AI generates JSON (schema mode)
 * 5. Post-process: Validate + restore URLs
 */
export async function analyzePrompt(
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
