// functions/src/models/gemini-flash-image/index.ts

export * from "./gemini-2.5-flash-image.js";

import Gemini25FlashImageAdapter, {GEMINI_25_FLASH_IMAGE_AI_HINT} from "./gemini-2.5-flash-image.js";

/**
 * Gemini 2.5 Flash Image model registry (single model family).
 * Registry key must match actual REST API model name.
 */
export const GEMINI_FLASH_IMAGE_MODELS = {
  "gemini-2.5-flash-image": Gemini25FlashImageAdapter,
} as const;

// Export AI hints for registry
export {GEMINI_25_FLASH_IMAGE_AI_HINT};
