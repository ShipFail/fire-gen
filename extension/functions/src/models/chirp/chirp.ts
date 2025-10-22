// functions/src/models/chirp/chirp.ts
import {z} from "zod";
import * as logger from "firebase-functions/logger";

import {ai} from "../_shared/ai-client.js";
import {GcsUriSchema, Bcp47LanguageSchema} from "../_shared/zod-helpers.js";
import type {ModelAdapter, StartResult, ModelOutput} from "../_shared/base.js";

// ============= SCHEMA =============
export const ChirpSTTRequestSchema = z.object({
  type: z.literal("audio"),
  subtype: z.literal("chirp-stt"),
  model: z.literal("chirp"),
  audioUri: GcsUriSchema, // Required - GCS path to audio file
  language: Bcp47LanguageSchema.optional(),
  encoding: z.string().optional(),
  sampleRate: z.number().int().positive().optional(),
});

export type ChirpSTTRequest = z.infer<typeof ChirpSTTRequestSchema>;

// ============= CONSTANTS =============
export const CHIRP_CONFIG = {
  modelId: "chirp" as const,
  displayName: "Chirp STT",
  category: "audio" as const,
  subtype: "chirp-stt" as const,
  isAsync: false,
  generationTime: "1-10s",
  schema: ChirpSTTRequestSchema,
} as const;

// ============= AI HINT =============
export const CHIRP_AI_HINT = `
- **chirp**: Universal speech recognition
  - Use when: User requests "transcribe", "speech to text", "convert audio to text"
  - Requires audioUri (GCS path to audio file)
`;

// ============= ADAPTER =============
export class ChirpSTTAdapter implements ModelAdapter {
  protected schema = ChirpSTTRequestSchema;
  protected modelId = "chirp";

  async start(request: any, jobId: string): Promise<StartResult> {
    const validated = this.schema.parse(request);

    logger.info("Starting Chirp STT", {
      jobId,
      model: this.modelId,
      audioUri: validated.audioUri,
    });

    const params: Record<string, unknown> = {
      audioUri: validated.audioUri,
    };

    if (validated.language) {
      params.language = validated.language;
    }
    if (validated.encoding) {
      params.encoding = validated.encoding;
    }
    if (validated.sampleRate !== undefined) {
      params.sampleRate = validated.sampleRate;
    }

    // Call Chirp STT
    const response = await (ai.models as any).transcribeAudio({
      model: this.modelId,
      ...params,
    });

    const text = response.transcript || response.text || "";

    if (!text || text.trim().length === 0) {
      throw new Error("No transcription text in Chirp STT response");
    }

    logger.info("Chirp STT completed", {jobId, textLength: text.length});

    const output: ModelOutput = {
      text, // No file output - text only
      metadata: {
        model: this.modelId,
        audioUri: validated.audioUri,
        language: validated.language,
        detectedLanguage: response.detectedLanguage,
        confidence: response.confidence,
      },
    };

    return {output};
  }
}

export default ChirpSTTAdapter;
