// functions/src/models/gemini-tts/shared.ts
import {z} from "zod";
import * as logger from "firebase-functions/logger";

import {ai} from "../_shared/ai-client.js";
import {TextContentSchema} from "../_shared/zod-helpers.js";
import {getOutputFileUri, uploadToGcs} from "../../storage.js";
import type {ModelAdapter, StartResult, ModelOutput} from "../_shared/base.js";

/**
 * Shared Zod schemas for Gemini TTS models
 */

export const GeminiTTSVoiceSchema = z.enum([
  "Zephyr", "Puck", "Charon", "Kore", "Fenrir", "Leda", "Aoede", "Callisto",
  "Dione", "Ganymede", "Helios", "Iapetus", "Juno", "Kairos", "Luna", "Mimas",
  "Nereus", "Oberon", "Proteus", "Rhea", "Selene", "Titan", "Umbriel", "Vesta",
  "Xanthe", "Ymir", "Zelus", "Atlas", "Borealis", "Cygnus",
]);
export type GeminiTTSVoice = z.infer<typeof GeminiTTSVoiceSchema>;

export const GeminiTTSModelIdSchema = z.enum([
  "gemini-2.5-flash-preview-tts",
  "gemini-2.5-pro-preview-tts",
]);
export type GeminiTTSModelId = z.infer<typeof GeminiTTSModelIdSchema>;

export const GeminiTTSRequestBaseSchema = z.object({
  type: z.literal("audio"),
  subtype: z.literal("tts"),
  model: GeminiTTSModelIdSchema,
  text: TextContentSchema,
  voice: GeminiTTSVoiceSchema.optional(),
  language: z.string().optional(),
});

export type GeminiTTSRequestBase = z.infer<typeof GeminiTTSRequestBaseSchema>;

/**
 * Base adapter for Gemini TTS models
 */
export abstract class GeminiTTSAdapterBase implements ModelAdapter {
  protected abstract schema: z.ZodSchema;
  protected abstract modelId: string;

  async start(request: any, jobId: string): Promise<StartResult> {
    const validated = this.schema.parse(request);

    logger.info("Starting Gemini TTS generation", {
      jobId,
      model: this.modelId,
      voice: validated.voice,
    });

    // Build speech config
    const speechConfig: Record<string, unknown> = {};

    if (validated.voice) {
      speechConfig.voiceConfig = {
        prebuiltVoiceConfig: {
          voiceName: validated.voice,
        },
      };
    }

    // Call Gemini TTS
    const response = await ai.models.generateContent({
      model: this.modelId,
      contents: [{
        role: "user",
        parts: [{text: validated.text}],
      }],
      config: {
        responseModalities: ["AUDIO"],
        speechConfig,
      },
    } as any);

    // Extract audio data
    const audioPart = response.candidates?.[0]?.content?.parts?.find(
      (part: any) => part.inlineData?.mimeType?.startsWith("audio/")
    );

    if (!audioPart?.inlineData?.data) {
      throw new Error("No audio data in Gemini TTS response");
    }

    const audioData = Buffer.from(audioPart.inlineData.data, "base64");
    const mimeType = audioPart.inlineData.mimeType || "audio/wav";

    // Upload to GCS
    const outputUri = getOutputFileUri(jobId, validated);
    await uploadToGcs(audioData, outputUri, mimeType);

    logger.info("Gemini TTS generation completed", {jobId, uri: outputUri});

    // Calculate duration (24kHz, mono, 16-bit PCM)
    const durationSeconds = audioData.length / (24000 * 1 * 2);

    const output: ModelOutput = {
      uri: outputUri,
      metadata: {
        mimeType,
        size: audioData.length,
        voice: validated.voice || "auto",
        language: validated.language || "auto",
        duration: durationSeconds,
        sampleRate: 24000,
        channels: 1,
      },
    };

    return {output};
  }
}
