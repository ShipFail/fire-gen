// functions/src/models/lyria/lyria-002.ts
import {z} from "zod";
import * as logger from "firebase-functions/logger";

import {ai} from "../_shared/ai-client.js";
import {PromptSchema} from "../_shared/zod-helpers.js";
import {getOutputFileUri, uploadToGcs} from "../../storage.js";
import type {ModelAdapter, StartResult, ModelOutput} from "../_shared/base.js";

// ============= SCHEMA =============
export const Lyria002RequestSchema = z.object({
  type: z.literal("audio"),
  subtype: z.literal("music"),
  model: z.literal("lyria-002"),
  prompt: PromptSchema, // Music description (US English)
  negativePrompt: z.string().optional(), // Terms to exclude
  seed: z.number().int().optional(), // For reproducible generation
});

export type Lyria002Request = z.infer<typeof Lyria002RequestSchema>;

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
- **lyria-002**: Instrumental music generation (NO SPEECH, NO VOCALS, NO SPOKEN WORDS)
  - Use when: User requests MUSICAL COMPOSITION - "music", "soundtrack", "melody", "beat", "instrumental background"
  - NOT for: Speech, voice, narration, reading aloud, or ANY spoken words
  - Output: Pure instrumental music (musicians playing instruments, no vocals, no speech)
  - Duration: Fixed 32.8 seconds
  - Think: "Would this be played by musicians with instruments?" → YES = Lyria. "Is someone speaking words?" → NO = NOT Lyria

Music Schema Structure (CRITICAL):
- type: "audio" (REQUIRED)
- subtype: "music" (REQUIRED)
- model: "lyria-002" (REQUIRED)
- prompt: "..." (music description - REQUIRED, NOT "text")
- negativePrompt: Optional (terms to exclude)
- seed: Optional (for reproducible generation)

EXAMPLE: {"type":"audio","subtype":"music","model":"lyria-002","prompt":"upbeat electronic music with driving beat"}

**Music vs TTS:**
- Music = Instrumental sounds, melodies, beats → type: "audio", subtype: "music", field: "prompt"
- TTS = Spoken words, voice, narration → type: "audio", subtype: "tts", field: "text"
`;

// ============= ADAPTER =============
export class Lyria002Adapter implements ModelAdapter {
  protected schema = Lyria002RequestSchema;
  protected modelId = "lyria-002";

  async start(request: any, jobId: string): Promise<StartResult> {
    const validated = this.schema.parse(request);

    logger.info("Starting Lyria music generation", {
      jobId,
      model: this.modelId,
      seed: validated.seed,
    });

    const params: Record<string, unknown> = {
      prompt: validated.prompt,
    };

    if (validated.negativePrompt) {
      params.negativePrompt = validated.negativePrompt;
    }
    if (validated.seed !== undefined) {
      params.seed = validated.seed;
    }

    // Call Lyria
    const response = (await (ai.models as any).generateMusic({
      model: this.modelId,
      ...params,
    })) as any;

    // Extract audio data
    const audioPart = response.candidates?.[0]?.content?.parts?.find(
      (part: any) => part.inlineData?.mimeType === "audio/wav"
    );

    if (!audioPart?.inlineData?.data) {
      throw new Error("No audio data in Lyria response");
    }

    const audioData = Buffer.from(audioPart.inlineData.data, "base64");
    const mimeType = "audio/wav";

    const outputUri = getOutputFileUri(jobId, validated);
    await uploadToGcs(audioData, outputUri, mimeType);

    logger.info("Lyria music generation completed", {jobId, uri: outputUri});

    const output: ModelOutput = {
      uri: outputUri,
      metadata: {
        mimeType,
        size: audioData.length,
        duration: 32.8,
        sampleRate: 48000,
        channels: 2,
        seed: validated.seed,
      },
    };

    return {output};
  }
}

export default Lyria002Adapter;
