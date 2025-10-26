// functions/src/models/gemini-tts/gemini-2.5-flash-preview-tts.schema.ts
import {z} from "zod";
import {TextContentSchema} from "../../lib/zod-utils.js";

/**
 * Zod schema for gemini-2.5-flash-preview-tts model.
 *
 * This is the SINGLE SOURCE OF TRUTH for the gemini-2.5-flash-preview-tts request format.
 * Uses Gemini generateContent API with AUDIO modality.
 */

// ============= VOICE ENUM =============

const Gemini25FlashPreviewTTSVoiceSchema = z.enum([
  "Zephyr", "Puck", "Charon", "Kore", "Fenrir", "Leda", "Aoede", "Callisto",
  "Dione", "Ganymede", "Helios", "Iapetus", "Juno", "Kairos", "Luna", "Mimas",
  "Nereus", "Oberon", "Proteus", "Rhea", "Selene", "Titan", "Umbriel", "Vesta",
  "Xanthe", "Ymir", "Zelus", "Atlas", "Borealis", "Cygnus",
]);

// ============= CONTENT SCHEMA =============

const Gemini25FlashPreviewTTSContentSchema = z.object({
  role: z.literal("user").optional(),
  parts: z.array(z.object({
    text: TextContentSchema,
  })),
});

// ============= SPEECH CONFIG SCHEMA =============

const Gemini25FlashPreviewTTSSpeechConfigSchema = z.object({
  voiceConfig: z.object({
    prebuiltVoiceConfig: z.object({
      voiceName: Gemini25FlashPreviewTTSVoiceSchema,
    }).optional(),
  }).optional(),
}).optional();

// ============= GENERATION CONFIG SCHEMA =============

const Gemini25FlashPreviewTTSGenerationConfigSchema = z.object({
  responseModalities: z.array(z.literal("AUDIO")),
  speechConfig: Gemini25FlashPreviewTTSSpeechConfigSchema,
}).optional();

// ============= REQUEST SCHEMA =============

/**
 * Complete REST API request schema for gemini-2.5-flash-preview-tts.
 */
export const Gemini25FlashPreviewTTSRequestSchema = z.object({
  model: z.literal("gemini-2.5-flash-preview-tts"),
  contents: z.union([
    TextContentSchema.transform(text => [{role: "user" as const, parts: [{text}]}]),
    z.array(Gemini25FlashPreviewTTSContentSchema),
  ]),
  generationConfig: Gemini25FlashPreviewTTSGenerationConfigSchema.transform(config => ({
    responseModalities: ["AUDIO"],
    speechConfig: config?.speechConfig,
  })),
});

// ============= TYPE (Inferred from Schema) =============

export type Gemini25FlashPreviewTTSRequest = z.infer<typeof Gemini25FlashPreviewTTSRequestSchema>;

// ============= RESPONSE SCHEMA =============

/**
 * Gemini generateContent API response for TTS.
 * Returns audio data as base64-encoded inline data.
 */
export const Gemini25FlashPreviewTTSResponseSchema = z.object({
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

export type Gemini25FlashPreviewTTSResponse = z.infer<typeof Gemini25FlashPreviewTTSResponseSchema>;
