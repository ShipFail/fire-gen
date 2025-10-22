// functions/src/models/gemini-tts/index.ts

export * from "./shared.js";
export * from "./gemini-2.5-flash-preview-tts.js";
export * from "./gemini-2.5-pro-preview-tts.js";
export {GEMINI_TTS_AI_HINTS} from "./ai-hints.js";

import Gemini25FlashPreviewTTSAdapter, {GEMINI_2_5_FLASH_PREVIEW_TTS_CONFIG} from "./gemini-2.5-flash-preview-tts.js";
import Gemini25ProPreviewTTSAdapter, {GEMINI_2_5_PRO_PREVIEW_TTS_CONFIG} from "./gemini-2.5-pro-preview-tts.js";

export const GEMINI_TTS_MODELS = {
  "gemini-2.5-flash-preview-tts": {
    adapter: Gemini25FlashPreviewTTSAdapter,
    config: GEMINI_2_5_FLASH_PREVIEW_TTS_CONFIG,
  },
  "gemini-2.5-pro-preview-tts": {
    adapter: Gemini25ProPreviewTTSAdapter,
    config: GEMINI_2_5_PRO_PREVIEW_TTS_CONFIG,
  },
} as const;
