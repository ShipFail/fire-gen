// functions/src/models/gemini-flash-image/gemini-2.5-flash-image.schema.ts
import {z} from "zod";
import {PromptSchema} from "../_shared/zod-helpers.js";

/**
 * Zod schema for gemini-2.5-flash-image model.
 * 
 * This is the SINGLE SOURCE OF TRUTH for the gemini-2.5-flash-image request format.
 * Uses Gemini generateContent API with IMAGE modality.
 */

// ============= ASPECT RATIO ENUM =============

export const Gemini25FlashImageAspectRatioSchema = z.enum([
  "1:1",
  "3:2",
  "2:3",
  "3:4",
  "4:3",
  "4:5",
  "5:4",
  "9:16",
  "16:9",
  "21:9",
]);

export type Gemini25FlashImageAspectRatio = z.infer<typeof Gemini25FlashImageAspectRatioSchema>;

// ============= SAFETY SETTINGS =============

const SafetySettingSchema = z.object({
  category: z.string(),
  threshold: z.string(),
});

// ============= CONTENT SCHEMA =============

const Gemini25FlashImageContentSchema = z.object({
  role: z.literal("user").optional(),
  parts: z.array(z.object({
    text: PromptSchema,
  })),
});

// ============= GENERATION CONFIG SCHEMA =============

const Gemini25FlashImageGenerationConfigSchema = z.object({
  responseModalities: z.array(z.literal("IMAGE")),
  imageConfig: z.object({
    aspectRatio: Gemini25FlashImageAspectRatioSchema.optional(),
  }).optional(),
}).optional();

// ============= REQUEST SCHEMA (Complete) =============

/**
 * Complete REST API request schema for gemini-2.5-flash-image.
 * 
 * Request body format:
 * {
 *   "model": "gemini-2.5-flash-image",
 *   "contents": [{"role": "user", "parts": [{"text": "..."}]}],
 *   "generationConfig": {
 *     "responseModalities": ["IMAGE"],
 *     "imageConfig": {"aspectRatio": "1:1"}
 *   },
 *   "safetySettings": [{"category": "...", "threshold": "..."}]
 * }
 */
export const Gemini25FlashImageRequestSchema = z.object({
  model: z.literal("gemini-2.5-flash-image"),
  contents: z.union([
    PromptSchema.transform(text => [{role: "user" as const, parts: [{text}]}]),
    z.array(Gemini25FlashImageContentSchema),
  ]),
  generationConfig: Gemini25FlashImageGenerationConfigSchema.transform(config => ({
    responseModalities: ["IMAGE" as const],
    imageConfig: config?.imageConfig,
  })),
  safetySettings: z.array(SafetySettingSchema).optional(),
});

// ============= TYPE (Inferred from Schema) =============

export type Gemini25FlashImageRequest = z.infer<typeof Gemini25FlashImageRequestSchema>;

// ============= RESPONSE SCHEMA =============

/**
 * Gemini generateContent API response for image generation.
 * Returns image data as base64-encoded inline data.
 */
export const Gemini25FlashImageResponseSchema = z.object({
  candidates: z.array(z.object({
    content: z.object({
      parts: z.array(z.object({
        inlineData: z.object({
          mimeType: z.string(), // e.g., "image/png"
          data: z.string(), // base64-encoded image
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

export type Gemini25FlashImageResponse = z.infer<typeof Gemini25FlashImageResponseSchema>;
