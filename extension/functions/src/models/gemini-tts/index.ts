// functions/src/models/gemini-tts/index.ts

export * from "./shared.js";
export * from "./gemini-2.5-flash-preview-tts.js";
export * from "./gemini-2.5-pro-preview-tts.js";
export {GEMINI_TTS_AI_HINTS} from "./ai-hints.js";

import Gemini25FlashPreviewTTSAdapter from "./gemini-2.5-flash-preview-tts.js";
import Gemini25ProPreviewTTSAdapter from "./gemini-2.5-pro-preview-tts.js";

export const GEMINI_TTS_MODELS = {
  "gemini-2.5-flash-preview-tts": Gemini25FlashPreviewTTSAdapter,
  "gemini-2.5-pro-preview-tts": Gemini25ProPreviewTTSAdapter,
} as const;
