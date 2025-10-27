// functions/src/models/gemini-tts/gemini-2.5-pro-preview-tts.schema.ts
import {z} from "zod";
import {TextContentSchema} from "../../lib/zod-utils.js";

/**
 * Zod schema for gemini-2.5-pro-preview-tts model.
 *
 * This is the SINGLE SOURCE OF TRUTH for the gemini-2.5-pro-preview-tts request format.
 * Uses Gemini generateContent API with AUDIO modality.
 */

// ============= VOICE ENUM =============

const Gemini25ProPreviewTTSVoiceSchema = z.enum([
  "Zephyr", "Puck", "Charon", "Kore", "Fenrir", "Leda", "Aoede", "Callisto",
  "Dione", "Ganymede", "Helios", "Iapetus", "Juno", "Kairos", "Luna", "Mimas",
  "Nereus", "Oberon", "Proteus", "Rhea", "Selene", "Titan", "Umbriel", "Vesta",
  "Xanthe", "Ymir", "Zelus", "Atlas", "Borealis", "Cygnus",
]);

// ============= CONTENT SCHEMA =============

const Gemini25ProPreviewTTSContentSchema = z.object({
  role: z.literal("user").optional()
    .describe("Message sender role, always user for synthesis requests"),
  parts: z.array(z.object({
    text: TextContentSchema
      .describe("Text content for speech synthesis conversion"),
  })).describe("Content components containing text to synthesize"),
});

// ============= SPEECH CONFIG SCHEMA =============

const Gemini25ProPreviewTTSSpeechConfigSchema = z.object({
  voiceConfig: z.object({
    prebuiltVoiceConfig: z.object({
      voiceName: Gemini25ProPreviewTTSVoiceSchema
        .describe("Voice identity: Zephyr (calm male), Puck (energetic), Charon (deep), Kore (warm female), and others"),
    }).optional()
      .describe("Preset voice selection from available voice profiles"),
  }).optional()
    .describe("Voice characteristics configuration"),
}).optional()
  .describe("Speech synthesis settings including voice selection");

// ============= GENERATION CONFIG SCHEMA =============

const Gemini25ProPreviewTTSGenerationConfigSchema = z.object({
  responseModalities: z.array(z.literal("AUDIO"))
    .describe("Output format specification, must be AUDIO for text-to-speech"),
  speechConfig: Gemini25ProPreviewTTSSpeechConfigSchema
    .describe("Speech generation parameters including voice characteristics"),
}).optional()
  .describe("Generation configuration controlling audio output");

// ============= REQUEST SCHEMA =============

/**
 * Complete REST API request schema for gemini-2.5-pro-preview-tts.
 */
export const Gemini25ProPreviewTTSRequestSchema = z.object({
  model: z.literal("gemini-2.5-pro-preview-tts")
    .describe("Gemini 2.5 Pro model with text-to-speech capability"),
  contents: z.union([
    TextContentSchema.transform(text => [{role: "user" as const, parts: [{text}]}]),
    z.array(Gemini25ProPreviewTTSContentSchema),
  ]).describe("Text content for speech synthesis"),
  generationConfig: Gemini25ProPreviewTTSGenerationConfigSchema.transform(config => ({
    responseModalities: ["AUDIO"],
    speechConfig: config?.speechConfig,
  })).describe("Audio output configuration specifying voice and synthesis parameters"),
});

// ============= TYPE (Inferred from Schema) =============

export type Gemini25ProPreviewTTSRequest = z.infer<typeof Gemini25ProPreviewTTSRequestSchema>;

// ============= RESPONSE SCHEMA =============

/**
 * Gemini generateContent API response for TTS.
 * Returns audio data as base64-encoded inline data.
 */
export const Gemini25ProPreviewTTSResponseSchema = z.object({
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

export type Gemini25ProPreviewTTSResponse = z.infer<typeof Gemini25ProPreviewTTSResponseSchema>;
