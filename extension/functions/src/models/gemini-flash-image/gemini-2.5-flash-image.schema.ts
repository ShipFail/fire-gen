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
    .describe("Harmful content category: HARM_CATEGORY_HATE_SPEECH, SEXUALLY_EXPLICIT, HARASSMENT, DANGEROUS_CONTENT"),
  threshold: z.string()
    .describe("Blocking sensitivity: BLOCK_NONE allows all, BLOCK_ONLY_HIGH blocks severe, BLOCK_MEDIUM_AND_ABOVE blocks moderate+"),
});

// ============= PART SCHEMAS =============

/**
 * Part type for multimodal content in Gemini API.
 * Supports text, inline data (base64), and file data (GCS URIs).
 * Each part can be one of three types (mutually exclusive fields).
 */
const TextPartSchema = z.object({
  text: PromptSchema
    .describe("Text content for prompts or instructions"),
});

const InlineDataPartSchema = z.object({
  inlineData: z.object({
    mimeType: z.string()
      .describe("Media MIME type: image/jpeg, image/png, image/webp, etc."),
    data: z.string()
      .describe("Base64-encoded media data"),
  }).describe("Inline media data encoded as base64"),
});

const FileDataPartSchema = z.object({
  fileData: z.object({
    mimeType: z.string()
      .describe("Media MIME type: image/jpeg, image/png, image/webp, etc."),
    fileUri: z.string()
      .describe("Google Cloud Storage URI (gs://bucket/path) referencing media file"),
  }).describe("Reference to media file stored in Google Cloud Storage"),
});

/**
 * Union of all possible part types.
 * At runtime, each part object will have exactly one of: text, inlineData, or fileData.
 */
const PartSchema = z.union([
  TextPartSchema,
  InlineDataPartSchema,
  FileDataPartSchema,
]);

// ============= CONTENT SCHEMA =============

const Gemini25FlashImageContentSchema = z.object({
  role: z.literal("user")
    .describe("Message sender role, always user for generation requests"),
  parts: z.array(PartSchema)
    .describe("Content components: text prompts, inline media, or GCS file references"),
});

// ============= GENERATION CONFIG SCHEMA =============

const Gemini25FlashImageGenerationConfigSchema = z.object({
  responseModalities: z.array(z.literal("IMAGE"))
    .describe("Output format specification, must be IMAGE for image generation"),
  imageConfig: z.object({
    aspectRatio: Gemini25FlashImageAspectRatioSchema.optional()
      .describe("Image dimensions: 1:1 square, 16:9 landscape, 9:16 portrait, 21:9 ultrawide, 3:4/4:3 traditional"),
  }).optional()
    .describe("Image-specific generation parameters"),
}).optional()
  .describe("Generation configuration controlling output modality and format");

// ============= REQUEST SCHEMA (Complete) =============

/**
 * Complete REST API request schema for gemini-2.5-flash-image.
 *
 * Request body format (text only):
 * {
 *   "model": "gemini-2.5-flash-image",
 *   "contents": [{"role": "user", "parts": [{"text": "..."}]}],
 *   "generationConfig": {
 *     "responseModalities": ["IMAGE"],
 *     "imageConfig": {"aspectRatio": "1:1"}
 *   },
 *   "safetySettings": [{"category": "...", "threshold": "..."}]
 * }
 *
 * Request body format (with reference images):
 * {
 *   "model": "gemini-2.5-flash-image",
 *   "contents": [{
 *     "role": "user",
 *     "parts": [
 *       {"text": "merge these images..."},
 *       {"fileData": {"mimeType": "image/jpeg", "fileUri": "gs://bucket/image1.jpg"}},
 *       {"fileData": {"mimeType": "image/png", "fileUri": "gs://bucket/image2.png"}}
 *     ]
 *   }],
 *   "generationConfig": {
 *     "responseModalities": ["IMAGE"],
 *     "imageConfig": {"aspectRatio": "1:1"}
 *   }
 * }
 */
export const Gemini25FlashImageRequestSchema = z.object({
  model: z.literal("gemini-2.5-flash-image")
    .describe("Gemini 2.5 Flash model with image generation capability"),
  contents: z.union([
    PromptSchema.transform(text => [{role: "user" as const, parts: [{text}]}]),
    z.array(Gemini25FlashImageContentSchema),
  ]).describe("User prompt describing desired image content and characteristics"),
  generationConfig: Gemini25FlashImageGenerationConfigSchema.transform(config => ({
    responseModalities: ["IMAGE" as const],
    imageConfig: config?.imageConfig,
  })).describe("Output configuration specifying IMAGE modality and image parameters"),
  safetySettings: z.array(SafetySettingSchema).optional()
    .describe("Content filtering controls for harmful categories"),
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
