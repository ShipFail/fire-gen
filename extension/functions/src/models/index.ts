// functions/src/models/index.ts

/**
 * Central model registry for FireGen.
 * All AI models are registered here and exported for use throughout the system.
 */

// Import all model families
import {VEO_MODELS, VEO_AI_HINTS} from "./veo/index.js";
import {GEMINI_FLASH_IMAGE_MODELS, GEMINI_25_FLASH_IMAGE_AI_HINT} from "./gemini-flash-image/index.js";
import {GEMINI_TTS_MODELS, GEMINI_TTS_AI_HINTS} from "./gemini-tts/index.js";

// Re-export everything from model families
export {
  VEO_MODELS,
  VEO_AI_HINTS,
  pollVeoOperation,
  extractVeoOutput,
  Veo31GeneratePreviewRequestSchema,
  Veo31GeneratePreviewResponseSchema,
  type Veo31GeneratePreviewRequest,
  type Veo31GeneratePreviewResponse,
  VEO_3_1_GENERATE_PREVIEW_AI_HINT,
  Veo31GeneratePreviewAdapter,
  Veo31FastGeneratePreviewRequestSchema,
  Veo31FastGeneratePreviewResponseSchema,
  type Veo31FastGeneratePreviewRequest,
  type Veo31FastGeneratePreviewResponse,
  VEO_3_1_FAST_GENERATE_PREVIEW_AI_HINT,
  Veo31FastGeneratePreviewAdapter,
} from "./veo/index.js";
export {
  GEMINI_FLASH_IMAGE_MODELS,
  GEMINI_25_FLASH_IMAGE_AI_HINT,
  Gemini25FlashImageRequestSchema,
  Gemini25FlashImageResponseSchema,
  Gemini25FlashImageAspectRatioSchema,
  type Gemini25FlashImageRequest,
  type Gemini25FlashImageResponse,
  type Gemini25FlashImageAspectRatio,
  Gemini25FlashImageAdapter,
} from "./gemini-flash-image/index.js";
export {
  GEMINI_TTS_MODELS,
  GEMINI_TTS_AI_HINTS,
  GeminiTTSAdapterBase,
  Gemini25FlashPreviewTTSRequestSchema,
  type Gemini25FlashPreviewTTSRequest,
  GEMINI_2_5_FLASH_PREVIEW_TTS_AI_HINT,
  Gemini25FlashPreviewTTSAdapter,
  Gemini25ProPreviewTTSRequestSchema,
  type Gemini25ProPreviewTTSRequest,
  GEMINI_2_5_PRO_PREVIEW_TTS_AI_HINT,
  Gemini25ProPreviewTTSAdapter,
} from "./gemini-tts/index.js";

// Re-export shared base types
export {
  type ModelOutput,
  type StartResult,
  type ModelAdapter,
} from "../lib/model-adapter.js";
export {
  zodToJsonExample,
  GcsUriSchema,
  UrlOrGcsUriSchema,
  Bcp47LanguageSchema,
  PromptSchema,
  TextContentSchema,
  PositiveIntSchema,
  SampleRateSchema,
} from "../lib/zod-utils.js";

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

## Analysis Rules

1. **Determine media type from keywords (PRIORITY MATTERS - check in this order):**

   **CRITICAL FIRST: Check for TTS (Text-to-Speech)**
   - TTS: "say", "speak", "voice", "read", "narrate", "announce", "tell", "pronounce"
     * If request contains ANY SPOKEN WORDS → ALWAYS classify as TTS
     * Semantic understanding: "speak hello" = someone speaking words out loud = TTS
     * Examples: "speak hello", "say welcome", "read this text", "narrate story" → TTS

   **Then check other types:**
   - Video: "video", "clip", "footage", "movie", "animation", "motion"
   - Image: "image", "picture", "photo", "illustration", "drawing", "render"

2. **ALWAYS choose fastest model by default (CRITICAL):**
   - Video: **veo-3.1-fast-generate-preview** is the smart default (fast, high quality)
   - Image: gemini-2.5-flash-image - fast image generation
   - TTS: gemini-2.5-flash-preview-tts

3. **Extract parameters intelligently:**
   - Duration from "4 second", "short", "long", "brief" (video: 4/6/8s only)

   - **CRITICAL: Aspect ratio detection - SEMANTIC UNDERSTANDING**
     * **VIDEO aspect ratios (ALWAYS extract if orientation mentioned):**
       • "vertical" or "portrait" = TALLER than wide = **"9:16"** (height > width, standing, tall)
       • "horizontal" or "landscape" = WIDER than tall = **"16:9"** (width > height, lying down, wide)
       • "square" = equal dimensions = **"1:1"**
       • Default if not mentioned: "16:9"

     * **IMAGE aspect ratios (MUST extract when orientation mentioned):**
       • "portrait" = TALLER than wide = **"2:3"** (standard photo orientation)
       • "vertical" = TALLER than wide = **"9:16"** (phone/social media)
       • "landscape" or "horizontal" = WIDER than tall = **"3:2"** (standard photo)
       • "square" = equal dimensions = **"1:1"**
       • Explicit ratio (e.g., "9:16 aspect ratio") → use exact value
       • Default if not mentioned: "1:1"

     * **REMEMBER: "vertical" and "portrait" both mean TALLER (height > width), NOT wider!**

   - Resolution from "720p", "1080p", "4K" (map 4K→1080p)
   - Audio preference from "silent", "no audio", "with sound"
   - Understand user intent and context - use your intelligence, not keyword matching

4. **Handle ambiguity:**
   - If request could be multiple types, choose most likely based on context

5. **Prompt refinement:**
   - For video/image: Extract visual description, remove meta instructions
   - For TTS: Extract exact text to speak

## Response Format

Return ONLY valid JSON matching the JobRequest schema. No explanations, no markdown, just JSON.`;
}
