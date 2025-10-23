// functions/src/models/gemini-text/index.ts

// Export all types and schemas
export * from "./shared.js";
export * from "./gemini-2.5-pro.js";
export * from "./gemini-2.5-flash.js";
export * from "./gemini-2.5-flash-lite.js";
export * from "./gemini-2.0-flash.js";
export * from "./gemini-2.0-flash-lite.js";
export {GEMINI_TEXT_AI_HINTS} from "./ai-hints.js";

// Import for registry
import Gemini25ProAdapter, {GEMINI_2_5_PRO_CONFIG} from "./gemini-2.5-pro.js";
import Gemini25FlashAdapter, {GEMINI_2_5_FLASH_CONFIG} from "./gemini-2.5-flash.js";
import Gemini25FlashLiteAdapter, {GEMINI_2_5_FLASH_LITE_CONFIG} from "./gemini-2.5-flash-lite.js";
import Gemini20FlashAdapter, {GEMINI_2_0_FLASH_CONFIG} from "./gemini-2.0-flash.js";
import Gemini20FlashLiteAdapter, {GEMINI_2_0_FLASH_LITE_CONFIG} from "./gemini-2.0-flash-lite.js";

/**
 * Gemini Text models registry.
 * Maps model IDs to their adapter classes and configs.
 */
export const GEMINI_TEXT_MODELS = {
  "gemini-2.5-pro": {
    adapter: Gemini25ProAdapter,
    config: GEMINI_2_5_PRO_CONFIG,
  },
  "gemini-2.5-flash": {
    adapter: Gemini25FlashAdapter,
    config: GEMINI_2_5_FLASH_CONFIG,
  },
  "gemini-2.5-flash-lite": {
    adapter: Gemini25FlashLiteAdapter,
    config: GEMINI_2_5_FLASH_LITE_CONFIG,
  },
  "gemini-2.0-flash": {
    adapter: Gemini20FlashAdapter,
    config: GEMINI_2_0_FLASH_CONFIG,
  },
  "gemini-2.0-flash-lite": {
    adapter: Gemini20FlashLiteAdapter,
    config: GEMINI_2_0_FLASH_LITE_CONFIG,
  },
} as const;
