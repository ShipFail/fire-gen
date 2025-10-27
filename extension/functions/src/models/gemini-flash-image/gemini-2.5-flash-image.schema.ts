// functions/src/models/gemini-flash-image/gemini-2.5-flash-image.schema.ts
import {z} from "zod";
import {PromptSchema} from "../../lib/zod-utils.js";

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
  category: z.string()
    .describe("Safety category to filter (e.g., HARM_CATEGORY_HATE_SPEECH, HARM_CATEGORY_SEXUALLY_EXPLICIT)."),
  threshold: z.string()
    .describe("Blocking threshold level (e.g., BLOCK_MEDIUM_AND_ABOVE, BLOCK_ONLY_HIGH)."),
});

// ============= CONTENT SCHEMA =============

const Gemini25FlashImageContentSchema = z.object({
  role: z.literal("user").optional()
    .describe("Role of the content sender. Always 'user' for user-provided prompts."),
  parts: z.array(z.object({
    text: PromptSchema
      .describe("Text prompt describing the desired image to generate."),
  })).describe("Content parts containing the generation prompt."),
});

// ============= GENERATION CONFIG SCHEMA =============

const Gemini25FlashImageGenerationConfigSchema = z.object({
  responseModalities: z.array(z.literal("IMAGE"))
    .describe("Output modality types. Must be ['IMAGE'] for image generation."),
  imageConfig: z.object({
    aspectRatio: Gemini25FlashImageAspectRatioSchema.optional()
      .describe("Image aspect ratio. 1:1 for square, 16:9 for landscape, 9:16 for vertical/mobile."),
  }).optional()
    .describe("Image-specific generation configuration."),
}).optional()
  .describe("Model generation parameters for image output.");

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
  model: z.literal("gemini-2.5-flash-image")
    .describe("Model identifier for Gemini 2.5 Flash image generation."),
  contents: z.union([
    PromptSchema.transform(text => [{role: "user" as const, parts: [{text}]}]),
    z.array(Gemini25FlashImageContentSchema),
  ]).describe("User prompt content describing the desired image."),
  generationConfig: Gemini25FlashImageGenerationConfigSchema.transform(config => ({
    responseModalities: ["IMAGE" as const],
    imageConfig: config?.imageConfig,
  })).describe("Generation configuration specifying output modality and image settings."),
  safetySettings: z.array(SafetySettingSchema).optional()
    .describe("Safety filtering settings to control harmful content blocking."),
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
