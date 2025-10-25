// functions/src/models/index.ts

/**
 * Central model registry for FireGen.
 * All AI models are registered here and exported for use throughout the system.
 */

// Import all model families
import {VEO_MODELS, VEO_AI_HINTS} from "./veo/index.js";
import {IMAGEN_MODELS, IMAGEN_AI_HINTS} from "./imagen/index.js";
import {NANO_BANANA_MODELS, NANO_BANANA_AI_HINT} from "./nano-banana/index.js";
import {GEMINI_TTS_MODELS, GEMINI_TTS_AI_HINTS} from "./gemini-tts/index.js";
import {GEMINI_TEXT_MODELS, GEMINI_TEXT_AI_HINTS} from "./gemini-text/index.js";
import {LYRIA_MODELS, LYRIA_AI_HINTS} from "./lyria/index.js";

// Re-export everything from model families
export * from "./veo/index.js";
export * from "./imagen/index.js";
export * from "./nano-banana/index.js";
export * from "./gemini-tts/index.js";
export * from "./gemini-text/index.js";
export * from "./lyria/index.js";

// Re-export shared base types
export * from "./_shared/base.js";
export * from "./_shared/zod-helpers.js";

/**
 * Complete model registry.
 * Maps model IDs to their adapter classes and configs.
 */
export const MODEL_REGISTRY = {
  ...VEO_MODELS,
  ...IMAGEN_MODELS,
  ...NANO_BANANA_MODELS,
  ...GEMINI_TTS_MODELS,
  ...GEMINI_TEXT_MODELS,
  ...LYRIA_MODELS,
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
  const entry = MODEL_REGISTRY[modelId];
  if (!entry) {
    throw new Error(`Unknown model ID: ${modelId}`);
  }
  return new entry.adapter();
}

/**
 * Get model configuration by model ID.
 */
export function getModelConfig(modelId: ModelId) {
  const entry = MODEL_REGISTRY[modelId];
  if (!entry) {
    throw new Error(`Unknown model ID: ${modelId}`);
  }
  return entry.config;
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

${LYRIA_AI_HINTS}

${VEO_AI_HINTS}

${NANO_BANANA_AI_HINT}

${IMAGEN_AI_HINTS}

${GEMINI_TEXT_AI_HINTS}

## Analysis Rules

1. **Determine media type from keywords (PRIORITY MATTERS - check in this order):**

   **CRITICAL FIRST: Check for TTS (Text-to-Speech)**
   - TTS: "say", "speak", "voice", "read", "narrate", "announce", "tell", "pronounce"
     * If request contains ANY SPOKEN WORDS → ALWAYS classify as TTS, NOT music
     * Semantic understanding: "speak hello" = someone speaking words out loud = TTS
     * Examples: "speak hello", "say welcome", "read this text", "narrate story" → TTS
     * NOT music, NOT instrumental, NOT soundtrack

   **Then check other types:**
   - Music: "music", "song", "soundtrack", "audio background", "instrumental", "melody", "beat"
     * ONLY if NO TTS/speech keywords present
     * Must be MUSICAL COMPOSITION (instruments playing), not spoken words
   - Video: "video", "clip", "footage", "movie", "animation", "motion"
   - Image: "image", "picture", "photo", "illustration", "drawing", "render"
   - Text: "write", "generate text", "explain", "describe", "summarize", "analyze"

2. **ALWAYS choose fastest model by default (CRITICAL):**
   - Video: **veo-3.1-fast-generate-preview** is the smart default (fast, high quality)
   - Image: nano-banana (gemini-2.5-flash-image) - fast image generation
   - TTS: gemini-2.5-flash-preview-tts
   - Music: lyria-002 (only option)
   - Text: gemini-2.5-flash (ONLY use Pro if "complex", "detailed", "high quality" mentioned)

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
   - If truly ambiguous, default to text generation with explanation

5. **Prompt refinement:**
   - For video/image: Extract visual description, remove meta instructions
   - For TTS: Extract exact text to speak
   - For music: Extract style/mood/instruments
   - For text: Keep full request as prompt

## Response Format

Return ONLY valid JSON matching the JobRequest schema. No explanations, no markdown, just JSON.`;
}
