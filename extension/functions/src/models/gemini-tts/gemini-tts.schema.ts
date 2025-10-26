// functions/src/models/gemini-tts/gemini-tts.schema.ts
import {z} from "zod";
import {TextContentSchema} from "../_shared/zod-helpers.js";

/**
 * Shared Zod schemas for Gemini TTS models.
 * 
 * This is the SINGLE SOURCE OF TRUTH for Gemini TTS request format.
 * Uses Gemini generateContent API with AUDIO modality.
 */

// ============= VOICE ENUM =============

export const GeminiTTSVoiceSchema = z.enum([
  "Zephyr", "Puck", "Charon", "Kore", "Fenrir", "Leda", "Aoede", "Callisto",
  "Dione", "Ganymede", "Helios", "Iapetus", "Juno", "Kairos", "Luna", "Mimas",
  "Nereus", "Oberon", "Proteus", "Rhea", "Selene", "Titan", "Umbriel", "Vesta",
  "Xanthe", "Ymir", "Zelus", "Atlas", "Borealis", "Cygnus",
]);

export type GeminiTTSVoice = z.infer<typeof GeminiTTSVoiceSchema>;

// ============= MODEL ID ENUM =============

export const GeminiTTSModelIdSchema = z.enum([
  "gemini-2.5-flash-preview-tts",
  "gemini-2.5-pro-preview-tts",
]);

export type GeminiTTSModelId = z.infer<typeof GeminiTTSModelIdSchema>;

// ============= CONTENT SCHEMA =============

const GeminiTTSContentSchema = z.object({
  role: z.literal("user").optional(),
  parts: z.array(z.object({
    text: TextContentSchema,
  })),
});

// ============= SPEECH CONFIG SCHEMA =============

const GeminiTTSSpeechConfigSchema = z.object({
  voiceConfig: z.object({
    prebuiltVoiceConfig: z.object({
      voiceName: GeminiTTSVoiceSchema,
    }).optional(),
  }).optional(),
}).optional();

// ============= GENERATION CONFIG SCHEMA =============

const GeminiTTSGenerationConfigSchema = z.object({
  responseModalities: z.array(z.literal("AUDIO")),
  speechConfig: GeminiTTSSpeechConfigSchema,
}).optional();

// ============= BASE REQUEST SCHEMA =============

/**
 * Base schema for all Gemini TTS models.
 * Individual models extend this with specific model literal.
 */
export const GeminiTTSRequestBaseSchema = z.object({
  model: GeminiTTSModelIdSchema,
  contents: z.union([
    TextContentSchema.transform(text => [{role: "user" as const, parts: [{text}]}]),
    z.array(GeminiTTSContentSchema),
  ]),
  generationConfig: GeminiTTSGenerationConfigSchema.transform(config => ({
    responseModalities: ["AUDIO"],
    speechConfig: config?.speechConfig,
  })),
});

export type GeminiTTSRequestBase = z.infer<typeof GeminiTTSRequestBaseSchema>;

// ============= RESPONSE SCHEMA =============

/**
 * Gemini generateContent API response for TTS.
 * Returns audio data as base64-encoded inline data.
 */
export const GeminiTTSResponseSchema = z.object({
  candidates: z.array(z.object({
    content: z.object({
      parts: z.array(z.object({
        inlineData: z.object({
          mimeType: z.string(), // e.g., "audio/wav"
          data: z.string(), // base64-encoded audio
        }).optional(),
      })),
      role: z.string().optional(),
    }),
    finishReason: z.string().optional(),
  })),
  usageMetadata: z.object({
    promptTokenCount: z.number(),
    candidatesTokenCount: z.number(),
    totalTokenCount: z.number(),
  }).optional(),
});

export type GeminiTTSResponse = z.infer<typeof GeminiTTSResponseSchema>;
