// functions/src/models/gemini-tts/gemini-2.5-pro-preview-tts.ts
import {GeminiTTSAdapterBase} from "./shared.js";
import {
  Gemini25ProPreviewTTSRequestSchema,
  type Gemini25ProPreviewTTSRequest,
} from "./gemini-2.5-pro-preview-tts.schema.js";

/**
 * Re-export schema for external consumers
 */
export {Gemini25ProPreviewTTSRequestSchema, type Gemini25ProPreviewTTSRequest};

export const GEMINI_2_5_PRO_PREVIEW_TTS_CONFIG = {
  modelId: "gemini-2.5-pro-preview-tts" as const,
  displayName: "Gemini 2.5 Pro TTS",
  category: "audio" as const,
  subtype: "tts" as const,
  isAsync: false,
  generationTime: "2-8s",
  schema: Gemini25ProPreviewTTSRequestSchema,
} as const;

export const GEMINI_2_5_PRO_PREVIEW_TTS_AI_HINT = `
- **gemini-2.5-pro-preview-tts**: High-quality TTS (30 voices, 24 languages)
  - Use when: User explicitly requests "high quality voice", "professional narration"
`;

export class Gemini25ProPreviewTTSAdapter extends GeminiTTSAdapterBase {
  protected schema = Gemini25ProPreviewTTSRequestSchema;
  protected modelId = "gemini-2.5-pro-preview-tts";
}

export default Gemini25ProPreviewTTSAdapter;
