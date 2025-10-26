// functions/src/models/gemini-tts/gemini-2.5-flash-preview-tts.ts
import {GeminiTTSAdapterBase} from "./shared.js";
import {
  Gemini25FlashPreviewTTSRequestSchema,
  type Gemini25FlashPreviewTTSRequest,
} from "./gemini-2.5-flash-preview-tts.schema.js";

/**
 * Re-export schema for external consumers
 */
export {Gemini25FlashPreviewTTSRequestSchema, type Gemini25FlashPreviewTTSRequest};

export const GEMINI_2_5_FLASH_PREVIEW_TTS_AI_HINT = `
- **gemini-2.5-flash-preview-tts**: Fast TTS for spoken words (30 voices, 24 languages)
  - **CRITICAL: Use TTS for ANY request involving SPOKEN WORDS**
  - Use when: User wants to HEAR WORDS SPOKEN - "say", "speak", "voice", "read aloud", "narrate", "announce", "tell"
  - Semantic understanding: If request involves CONVERTING TEXT TO SPEECH → Use TTS (not music, not instrumental)
  - Voices: Zephyr (bright), Puck (upbeat), Charon (informative), Kore (warm), etc.
  - Think: "Are words being spoken out loud?" → YES = TTS
  - DEFAULT CHOICE for TTS
`;

export class Gemini25FlashPreviewTTSAdapter extends GeminiTTSAdapterBase {
  static readonly modelId = "gemini-2.5-flash-preview-tts" as const;
  static readonly displayName = "Gemini 2.5 Flash TTS";
  static readonly category = "audio" as const;
  static readonly subtype = "tts" as const;
  static readonly isAsync = false;
  static readonly generationTime = "2-8s";
  static readonly schema = Gemini25FlashPreviewTTSRequestSchema;

  protected schema = Gemini25FlashPreviewTTSRequestSchema;
  protected modelId = Gemini25FlashPreviewTTSAdapter.modelId;
}

export default Gemini25FlashPreviewTTSAdapter;
