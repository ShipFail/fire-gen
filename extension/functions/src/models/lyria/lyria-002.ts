// functions/src/models/lyria/lyria-002.ts
import {z} from "zod";
import * as logger from "firebase-functions/logger";

import {predict} from "../_shared/vertex-ai-client.js";
import {PromptSchema} from "../_shared/zod-helpers.js";
import {getOutputFileUri, uploadToGcs} from "../../storage.js";
import type {ModelAdapter, StartResult, ModelOutput} from "../_shared/base.js";

// ============= OFFICIAL VERTEX AI REST API SCHEMA =============
/**
 * Matches official Vertex AI API for lyria-002:
 * https://cloud.google.com/vertex-ai/generative-ai/docs/model-reference/lyria-music-generation
 *
 * Request body format:
 * {
 *   "instances": [{
 *     "prompt": string,           // Music description (US English)
 *     "negative_prompt": string,  // Optional - what to exclude
 *     "seed": integer             // Optional - for reproducibility
 *   }],
 *   "parameters": {
 *     "sample_count": integer     // Optional - number of samples (cannot use with seed)
 *   }
 * }
 *
 * Response format:
 * {
 *   "predictions": [{
 *     "audioContent": "BASE64_STRING",  // Base64-encoded WAV
 *     "mimeType": "audio/wav"           // Always WAV, 48kHz, 30s
 *   }]
 * }
 */

// Instance schema
const LyriaInstanceSchema = z.object({
  prompt: PromptSchema,
  negative_prompt: z.string().optional(),
  seed: z.number().int().optional(),
});

// Parameters schema
const LyriaParametersSchema = z.object({
  sample_count: z.number().int().min(1).optional(),
});

// Complete REST API request schema
export const Lyria002RequestSchema = z.object({
  model: z.literal("lyria-002"),
  instances: z.array(LyriaInstanceSchema),
  parameters: LyriaParametersSchema.optional(),
});

export type Lyria002Request = z.infer<typeof Lyria002RequestSchema>;

// Lyria response type
interface LyriaPredictResponse {
  predictions: Array<{
    audioContent: string;  // Base64-encoded WAV
    mimeType: string;      // "audio/wav"
  }>;
  deployedModelId?: string;
  model?: string;
  modelDisplayName?: string;
}

// ============= CONSTANTS =============
export const LYRIA_002_CONFIG = {
  modelId: "lyria-002" as const,
  displayName: "Lyria 2.0",
  category: "audio" as const,
  subtype: "music" as const,
  isAsync: false,
  generationTime: "10-20s",
  schema: Lyria002RequestSchema,
} as const;

// ============= AI HINT =============
export const LYRIA_002_AI_HINT = `
- **lyria-002**: Instrumental music generation (30s WAV, 48kHz)
  - Use when: User requests MUSICAL COMPOSITION - "music", "soundtrack", "melody", "beat", "instrumental"
  - NOT for: Speech, voice, narration, or ANY spoken words
  - Duration: Fixed 30 seconds
  - Output: Pure instrumental music (no vocals, no speech)

REST API Format:
{
  "model": "lyria-002",
  "instances": [{
    "prompt": "...",              // Music description (US English)
    "negative_prompt": "...",     // Optional - what to exclude
    "seed": 123                   // Optional - for reproducibility
  }],
  "parameters": {
    "sample_count": 1             // Optional - number of samples (cannot use with seed)
  }
}

EXAMPLE: {"model":"lyria-002","instances":[{"prompt":"upbeat electronic music with driving beat"}]}

**Music vs TTS:**
- Music = Instrumental sounds, melodies, beats → lyria-002
- TTS = Spoken words, voice → gemini-2.5-flash-preview-tts
`;

// ============= ADAPTER =============
export class Lyria002Adapter implements ModelAdapter {
  private readonly modelId = "lyria-002";

  async start(request: any, jobId: string): Promise<StartResult> {
    // Validate with Zod schema
    const validated = Lyria002RequestSchema.parse(request);

    logger.info("Starting Lyria music generation", {
      jobId,
      model: this.modelId,
      hasSeed: validated.instances[0]?.seed !== undefined,
      sampleCount: validated.parameters?.sample_count || 1,
    });

    // Call Lyria REST API using predict()
    const response = await predict(
      this.modelId,
      {
        instances: validated.instances,
        parameters: validated.parameters || {},
      }
    ) as LyriaPredictResponse;

    // Extract audio from first prediction
    const prediction = response.predictions?.[0];
    if (!prediction?.audioContent) {
      throw new Error("No audio data in Lyria response");
    }

    const audioData = Buffer.from(prediction.audioContent, "base64");
    const mimeType = prediction.mimeType || "audio/wav";

    // Upload to GCS
    const outputUri = getOutputFileUri(jobId, {model: this.modelId});
    await uploadToGcs(audioData, outputUri, mimeType);

    logger.info("Lyria music generation completed", {
      jobId,
      uri: outputUri,
      audioSize: audioData.length,
    });

    const output: ModelOutput = {
      uri: outputUri,
      metadata: {
        mimeType,
        size: audioData.length,
        duration: 30, // Lyria generates 30-second clips
        sampleRate: 48000,
        channels: 2,
        seed: validated.instances[0]?.seed,
      },
    };

    return {output};
  }
}

export default Lyria002Adapter;
