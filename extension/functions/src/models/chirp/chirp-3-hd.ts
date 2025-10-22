// functions/src/models/chirp/chirp-3-hd.ts
import {z} from "zod";
import * as logger from "firebase-functions/logger";

import {ai} from "../_shared/ai-client.js";
import {TextContentSchema, Bcp47LanguageSchema} from "../_shared/zod-helpers.js";
import {getOutputFileUri, uploadToGcs} from "../../storage.js";
import type {ModelAdapter, StartResult, ModelOutput} from "../_shared/base.js";

// ============= SCHEMA =============
export const Chirp3HDRequestSchema = z.object({
  type: z.literal("audio"),
  subtype: z.literal("chirp-tts"),
  model: z.literal("chirp-3-hd"),
  text: TextContentSchema,
  voice: z.string(), // Required - 248 voices available (BCP-47 format like "en-US-Journey-F")
  language: Bcp47LanguageSchema.optional(),
  sampleRate: z.number().int().positive().optional(),
});

export type Chirp3HDRequest = z.infer<typeof Chirp3HDRequestSchema>;

// ============= CONSTANTS =============
export const CHIRP_3_HD_CONFIG = {
  modelId: "chirp-3-hd" as const,
  displayName: "Chirp 3 HD TTS",
  category: "audio" as const,
  subtype: "chirp-tts" as const,
  isAsync: false,
  generationTime: "2-8s",
  schema: Chirp3HDRequestSchema,
} as const;

// ============= AI HINT =============
export const CHIRP_3_HD_AI_HINT = `
- **chirp-3-hd**: Chirp TTS (248 voices, 31 languages)
  - Use when: User requests specific language not well-supported by Gemini TTS, or needs specific voice style
  - Voice format: BCP-47 like "en-US-Journey-F", "es-ES-Neural2-A"
`;

// ============= ADAPTER =============
export class Chirp3HDAdapter implements ModelAdapter {
  protected schema = Chirp3HDRequestSchema;
  protected modelId = "chirp-3-hd";

  async start(request: any, jobId: string): Promise<StartResult> {
    const validated = this.schema.parse(request);

    logger.info("Starting Chirp TTS generation", {
      jobId,
      model: this.modelId,
      voice: validated.voice,
    });

    const params: Record<string, unknown> = {
      text: validated.text,
      voice: validated.voice,
    };

    if (validated.language) {
      params.language = validated.language;
    }
    if (validated.sampleRate !== undefined) {
      params.sampleRate = validated.sampleRate;
    }

    // Call Chirp TTS
    const response = await (ai.models as any).synthesizeSpeech({
      model: this.modelId,
      ...params,
    });

    const audioData = Buffer.from(response.audioContent, "base64");
    const mimeType = "audio/wav";

    const outputUri = getOutputFileUri(jobId, validated);
    await uploadToGcs(audioData, outputUri, mimeType);

    logger.info("Chirp TTS generation completed", {jobId, uri: outputUri});

    const output: ModelOutput = {
      uri: outputUri,
      metadata: {
        mimeType,
        size: audioData.length,
        voice: validated.voice,
        language: validated.language,
        sampleRate: validated.sampleRate || 24000,
      },
    };

    return {output};
  }
}

export default Chirp3HDAdapter;
