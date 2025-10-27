// functions/src/models/index.ts

/**
 * Central model registry for FireGen.
 * All AI models are registered here and exported for use throughout the system.
 */

import {z} from "zod";

// Import all model families
import {VEO_MODELS, VEO_AI_HINTS} from "./veo/index.js";
import {GEMINI_FLASH_IMAGE_MODELS, GEMINI_25_FLASH_IMAGE_AI_HINT} from "./gemini-flash-image/index.js";
import {GEMINI_TTS_MODELS, GEMINI_TTS_AI_HINTS} from "./gemini-tts/index.js";

// Import schemas for getModelSchema() function
import {Veo31GeneratePreviewRequestSchema} from "./veo/veo-3.1-generate-preview.js";
import {Veo31FastGeneratePreviewRequestSchema} from "./veo/veo-3.1-fast-generate-preview.js";
import {Gemini25FlashImageRequestSchema} from "./gemini-flash-image/gemini-2.5-flash-image.js";
import {Gemini25FlashPreviewTTSRequestSchema} from "./gemini-tts/gemini-2.5-flash-preview-tts.js";
import {Gemini25ProPreviewTTSRequestSchema} from "./gemini-tts/gemini-2.5-pro-preview-tts.js";

// Export only what's needed by external modules (triggers, ai-request-analyzer)
// DO NOT export schemas, types, or adapters - those are internal to model families
export {VEO_AI_HINTS} from "./veo/index.js";
export {GEMINI_25_FLASH_IMAGE_AI_HINT} from "./gemini-flash-image/index.js";
export {GEMINI_TTS_AI_HINTS} from "./gemini-tts/index.js";

/**
 * Complete model registry.
 * Maps model IDs to their adapter classes.
 */
export const MODEL_REGISTRY = {
  ...VEO_MODELS,
  ...GEMINI_FLASH_IMAGE_MODELS,
  ...GEMINI_TTS_MODELS,
} as const;

/**
 * Extract model IDs as a type
 */
export type ModelId = keyof typeof MODEL_REGISTRY;

/**
 * Get model adapter instance by model ID.
 * This is the primary way to retrieve adapters in the system.
 */
export function getModelAdapter(modelId: ModelId) {
  const AdapterClass = MODEL_REGISTRY[modelId];
  if (!AdapterClass) {
    throw new Error(`Unknown model ID: ${modelId}`);
  }
  return new AdapterClass();
}

/**
 * Check if a model ID exists in the registry.
 */
export function isValidModelId(modelId: string): modelId is ModelId {
  return modelId in MODEL_REGISTRY;
}

/**
 * Get all model IDs as an array.
 */
export function getAllModelIds(): ModelId[] {
  return Object.keys(MODEL_REGISTRY) as ModelId[];
}

/**
 * Get Zod schema for validating model IDs.
 * Auto-generated from MODEL_REGISTRY.
 *
 * Used by AI request analyzer to ensure only valid models are selected.
 *
 * @returns Zod enum schema with all registered model IDs
 * @throws {Error} If MODEL_REGISTRY is empty
 */
export function getModelIdSchema(): z.ZodEnum<[string, ...string[]]> {
  const modelIds = getAllModelIds();

  if (modelIds.length === 0) {
    throw new Error("MODEL_REGISTRY is empty - no models registered");
  }

  return z.enum(modelIds as [string, ...string[]]);
}

/**
 * Map of model IDs to their request Zod schemas.
 * Used by assisted-mode Step 2 to generate model-specific parameter guidance.
 */
const MODEL_SCHEMA_MAP: Record<ModelId, z.ZodType<any>> = {
  "veo-3.1-generate-preview": Veo31GeneratePreviewRequestSchema,
  "veo-3.1-fast-generate-preview": Veo31FastGeneratePreviewRequestSchema,
  "gemini-2.5-flash-image": Gemini25FlashImageRequestSchema,
  "gemini-2.5-flash-preview-tts": Gemini25FlashPreviewTTSRequestSchema,
  "gemini-2.5-pro-preview-tts": Gemini25ProPreviewTTSRequestSchema,
};

/**
 * Get Zod schema for a model's request format.
 * Used by assisted-mode to generate JSON Schema guidance for parameter inference.
 *
 * @param modelId - Model identifier (e.g., "veo-3.1-fast-generate-preview")
 * @returns Zod schema for the model's request format
 * @throws {Error} If model ID is not recognized
 *
 * @example
 * ```typescript
 * const schema = getModelSchema("veo-3.1-fast-generate-preview");
 * const jsonSchema = zodToJsonSchema(schema);
 * // Use jsonSchema in AI prompt for precise parameter inference
 * ```
 */
export function getModelSchema(modelId: string): z.ZodType<any> {
  const schema = MODEL_SCHEMA_MAP[modelId as ModelId];
  if (!schema) {
    throw new Error(`No schema found for model: ${modelId}`);
  }
  return schema;
}

/**
 * Build complete system instruction for AI request analyzer.
 * Assembles all AI hints from all model families.
 */
export function buildSystemInstruction(): string {
  return `You are an AI media generation job analyzer for the FireGen system.

Given a user's natural language request, analyze it and return a structured JobRequest in JSON format.

## Available Models

**PRIORITY: Check for speech/voice requests FIRST**

${GEMINI_TTS_AI_HINTS}

${VEO_AI_HINTS}

${GEMINI_25_FLASH_IMAGE_AI_HINT}

`;
}
