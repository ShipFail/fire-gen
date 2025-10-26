// functions/src/models/gemini-tts/shared.ts
import {z} from "zod";
import * as logger from "firebase-functions/logger";

import {callVertexAPI} from "../_shared/vertex-ai-client.js";
import {PROJECT_ID} from "../../firebase-admin.js";
import {REGION} from "../../env.js";
import {getOutputFileUri, uploadToGcs} from "../../storage.js";
import type {ModelAdapter, StartResult, ModelOutput} from "../_shared/base.js";

/**
 * Gemini TTS Response type
 * (matches structure from individual model schema files)
 */
type GeminiTTSResponse = {
  candidates?: Array<{
    content: {
      parts: Array<{
        inlineData?: {
          mimeType?: string;
          data?: string;
        };
      }>;
      role?: string;
    };
    finishReason?: string;
  }>;
  usageMetadata?: {
    promptTokenCount: number;
    candidatesTokenCount: number;
    totalTokenCount: number;
  };
};

/**
 * Call Gemini generateContent API for TTS
 */
async function generateSpeech(
  model: string,
  payload: {
    contents: Array<{role?: string; parts: Array<{text: string}>}>;
    generationConfig: {
      responseModalities: string[];
      speechConfig?: Record<string, unknown>;
    };
  }
): Promise<GeminiTTSResponse> {
  const endpoint = `v1/projects/${PROJECT_ID}/locations/${REGION}/publishers/google/models/${model}:generateContent`;
  return callVertexAPI<GeminiTTSResponse>(endpoint, payload);
}

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
      speechConfig: validated.generationConfig?.speechConfig,
    });

    // Call Gemini TTS via REST API
    const response = await generateSpeech(this.modelId, {
      contents: validated.contents,
      generationConfig: validated.generationConfig,
    });

    // Extract audio data from first candidate
    const audioPart = response.candidates?.[0]?.content?.parts?.find(
      (part: {inlineData?: {mimeType?: string; data?: string}}) =>
        part.inlineData?.mimeType?.startsWith("audio/")
    );

    if (!audioPart?.inlineData?.data) {
      throw new Error("No audio data in Gemini TTS response");
    }

    const audioData = Buffer.from(audioPart.inlineData.data, "base64");
    const mimeType = audioPart.inlineData.mimeType || "audio/wav";

    // Upload to GCS
    const outputUri = getOutputFileUri(jobId, {model: this.modelId, type: "audio"});
    await uploadToGcs(audioData, outputUri, mimeType);

    logger.info("Gemini TTS generation completed", {jobId, uri: outputUri});

    // Calculate duration (24kHz, mono, 16-bit PCM)
    const durationSeconds = audioData.length / (24000 * 1 * 2);

    const output: ModelOutput = {
      uri: outputUri,
      metadata: {
        mimeType,
        size: audioData.length,
        voice: validated.generationConfig?.speechConfig?.voiceConfig?.prebuiltVoiceConfig?.voiceName || "auto",
        duration: durationSeconds,
        sampleRate: 24000,
        channels: 1,
      },
    };

    return {output};
  }
}
