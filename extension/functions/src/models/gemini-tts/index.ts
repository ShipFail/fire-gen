// functions/src/models/gemini-tts/index.ts

// Only export what's needed by models/index.ts (parent module)
// Keep all schemas, types, and implementation details private to this module
export {GEMINI_TTS_AI_HINTS} from "./ai-hints.js";

import Gemini25FlashPreviewTTSAdapter from "./gemini-2.5-flash-preview-tts.js";
import Gemini25ProPreviewTTSAdapter from "./gemini-2.5-pro-preview-tts.js";

export const GEMINI_TTS_MODELS = {
  "gemini-2.5-flash-preview-tts": Gemini25FlashPreviewTTSAdapter,
  "gemini-2.5-pro-preview-tts": Gemini25ProPreviewTTSAdapter,
} as const;
