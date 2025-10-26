// functions/src/models/gemini-tts/gemini-2.5-flash-preview-tts.schema.ts
import {z} from "zod";
import {GeminiTTSRequestBaseSchema} from "./gemini-tts.schema.js";

/**
 * Zod schema for gemini-2.5-flash-preview-tts model.
 *
 * This is the SINGLE SOURCE OF TRUTH for the gemini-2.5-flash-preview-tts request format.
 */

// ============= REQUEST SCHEMA =============

/**
 * Complete REST API request schema for gemini-2.5-flash-preview-tts.
 * Extends base TTS schema with specific model literal.
 */
export const Gemini25FlashPreviewTTSRequestSchema = GeminiTTSRequestBaseSchema.extend({
  model: z.literal("gemini-2.5-flash-preview-tts"),
});

// ============= TYPE (Inferred from Schema) =============

export type Gemini25FlashPreviewTTSRequest = z.infer<typeof Gemini25FlashPreviewTTSRequestSchema>;
