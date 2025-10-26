// functions/src/models/gemini-flash-image/index.ts

// Only export what's needed by models/index.ts (parent module)
// Keep all schemas, types, and implementation details private to this module
export {GEMINI_25_FLASH_IMAGE_AI_HINT} from "./gemini-2.5-flash-image.js";

import Gemini25FlashImageAdapter from "./gemini-2.5-flash-image.js";

/**
 * Gemini 2.5 Flash Image model registry (single model family).
 * Registry key must match actual REST API model name.
 */
export const GEMINI_FLASH_IMAGE_MODELS = {
  "gemini-2.5-flash-image": Gemini25FlashImageAdapter,
} as const;
