// functions/src/models/gemini-tts/index.ts

export {GeminiTTSAdapterBase} from "./shared.js";
export {
  Gemini25FlashPreviewTTSRequestSchema,
  type Gemini25FlashPreviewTTSRequest,
  GEMINI_2_5_FLASH_PREVIEW_TTS_AI_HINT,
  Gemini25FlashPreviewTTSAdapter,
} from "./gemini-2.5-flash-preview-tts.js";
export {
  Gemini25ProPreviewTTSRequestSchema,
  type Gemini25ProPreviewTTSRequest,
  GEMINI_2_5_PRO_PREVIEW_TTS_AI_HINT,
  Gemini25ProPreviewTTSAdapter,
} from "./gemini-2.5-pro-preview-tts.js";
export {GEMINI_TTS_AI_HINTS} from "./ai-hints.js";

import Gemini25FlashPreviewTTSAdapter from "./gemini-2.5-flash-preview-tts.js";
import Gemini25ProPreviewTTSAdapter from "./gemini-2.5-pro-preview-tts.js";

export const GEMINI_TTS_MODELS = {
  "gemini-2.5-flash-preview-tts": Gemini25FlashPreviewTTSAdapter,
  "gemini-2.5-pro-preview-tts": Gemini25ProPreviewTTSAdapter,
} as const;
