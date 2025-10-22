// functions/src/models/gemini-tts/gemini-2.5-pro-preview-tts.ts
import {z} from "zod";
import {GeminiTTSRequestBaseSchema, GeminiTTSAdapterBase} from "./shared.js";

export const Gemini25ProPreviewTTSRequestSchema = GeminiTTSRequestBaseSchema.extend({
  model: z.literal("gemini-2.5-pro-preview-tts"),
});

export type Gemini25ProPreviewTTSRequest = z.infer<typeof Gemini25ProPreviewTTSRequestSchema>;

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
