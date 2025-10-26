// functions/src/models/gemini-flash-image/index.ts

export {
  Gemini25FlashImageRequestSchema,
  Gemini25FlashImageResponseSchema,
  Gemini25FlashImageAspectRatioSchema,
  type Gemini25FlashImageRequest,
  type Gemini25FlashImageResponse,
  type Gemini25FlashImageAspectRatio,
  GEMINI_25_FLASH_IMAGE_AI_HINT,
  Gemini25FlashImageAdapter,
} from "./gemini-2.5-flash-image.js";

import Gemini25FlashImageAdapter from "./gemini-2.5-flash-image.js";

/**
 * Gemini 2.5 Flash Image model registry (single model family).
 * Registry key must match actual REST API model name.
 */
export const GEMINI_FLASH_IMAGE_MODELS = {
  "gemini-2.5-flash-image": Gemini25FlashImageAdapter,
} as const;
