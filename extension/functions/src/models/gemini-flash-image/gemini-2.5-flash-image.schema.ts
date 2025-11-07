// functions/src/models/gemini-flash-image/gemini-2.5-flash-image.schema.ts
import { z } from "zod";
import { PromptSchema } from "../../lib/zod-utils.js";

/**
 * Zod schema for gemini-2.5-flash-image model.
 *
 * This is the SINGLE SOURCE OF TRUTH for the gemini-2.5-flash-image request format.
 * 
 * Official Documentation:
 * - Model Overview: https://cloud.google.com/vertex-ai/generative-ai/docs/image/overview
 * - Gemini 2.5 Flash Image Model: https://cloud.google.com/vertex-ai/generative-ai/docs/image/generate-images
 * - generateContent API: https://cloud.google.com/vertex-ai/generative-ai/docs/reference/rest/v1/models/generateContent
 * - Multimodal Inputs: https://cloud.google.com/vertex-ai/generative-ai/docs/multimodal/send-multimodal-prompts
 * 
 * API Endpoint: POST v1/projects/{project}/locations/{location}/publishers/google/models/gemini-2.5-flash-image:generateContent
 * 
 * Schema Structure:
 * - Uses standard Gemini generateContent API format
 * - Supports multimodal parts: text, inlineData (base64), fileData (GCS URIs)
 * - Returns images as base64-encoded inlineData in response
 * - IMAGE modality specified via responseModalities in generationConfig
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

/**
 * Safety settings for content filtering.
 * 
 * Official Documentation:
 * https://cloud.google.com/vertex-ai/generative-ai/docs/multimodal/configure-safety-attributes
 * https://cloud.google.com/vertex-ai/generative-ai/docs/reference/rest/v1/SafetySetting
 */
const SafetySettingSchema = z.object({
  category: z.string()
    .describe("Harmful content category: HARM_CATEGORY_HATE_SPEECH, SEXUALLY_EXPLICIT, HARASSMENT, DANGEROUS_CONTENT"),
  threshold: z.string()
    .describe("Blocking sensitivity: BLOCK_NONE allows all, BLOCK_ONLY_HIGH blocks severe, BLOCK_MEDIUM_AND_ABOVE blocks moderate+"),
});

// ============= PART SCHEMAS =============

/**
 * Part type for multimodal content in Gemini API.
 * 
 * Official Documentation:
 * https://cloud.google.com/vertex-ai/generative-ai/docs/reference/rest/v1/Content#part
 * https://cloud.google.com/vertex-ai/generative-ai/docs/multimodal/send-multimodal-prompts
 * 
 * Supports three mutually exclusive part types:
 * 1. text - Text prompts and instructions
 * 2. inlineData - Base64-encoded media (images, etc.)
 * 3. fileData - GCS URI references (gs://bucket/path)
 * 
 * Each part object contains exactly one of these fields.
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

/**
 * Content object for generateContent API requests.
 * 
 * Official Documentation:
 * https://cloud.google.com/vertex-ai/generative-ai/docs/reference/rest/v1/Content
 * 
 * Structure matches the standard Gemini Content type with role and parts array.
 */
const Gemini25FlashImageContentSchema = z.object({
  role: z.literal("user").optional().describe("Role of the content creator (usually 'user')"),
  parts: z.array(PartSchema)
    .min(1)
    .refine((parts) => parts.some((part) => "text" in part), {
      message: "At least one text part is required for Gemini Flash Image generation/editing",
    })
    .describe("Ordered parts that make up the content. MUST contain at least one text part."),
});

// ============= GENERATION CONFIG SCHEMA =============

/**
 * Generation configuration for image generation.
 * 
 * Official Documentation:
 * https://cloud.google.com/vertex-ai/generative-ai/docs/image/generate-images#api
 * https://cloud.google.com/vertex-ai/generative-ai/docs/reference/rest/v1/GenerationConfig
 * 
 * Key fields:
 * - responseModalities: Must be ["IMAGE"] for image generation
 * - imageConfig.aspectRatio: Controls output image dimensions
 */
const Gemini25FlashImageGenerationConfigSchema = z.object({
  responseModalities: z.array(z.literal("IMAGE"))
    .describe("Output format specification, must be IMAGE for image generation"),
  candidateCount: z.number().int().min(1).max(4).optional()
    .describe("Number of images to generate"),
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
 * Official API Documentation:
 * https://cloud.google.com/vertex-ai/generative-ai/docs/image/generate-images#api
 * https://cloud.google.com/vertex-ai/generative-ai/docs/reference/rest/v1/models/generateContent
 * 
 * API Endpoint:
 * POST https://{REGION}-aiplatform.googleapis.com/v1/projects/{PROJECT}/locations/{REGION}/publishers/google/models/gemini-2.5-flash-image:generateContent
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
 * Request body format (with reference images - multimodal):
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
  contents: z.array(Gemini25FlashImageContentSchema)
    .describe("Multimodal prompt (text, images) for generation or editing"),
  generationConfig: Gemini25FlashImageGenerationConfigSchema.optional()
    .describe("Output configuration specifying IMAGE modality and image parameters"),
  safetySettings: z.array(SafetySettingSchema).optional()
    .describe("Content filtering controls for harmful categories"),
});

// ============= TYPE (Inferred from Schema) =============

export type Gemini25FlashImageRequest = z.infer<typeof Gemini25FlashImageRequestSchema>;

// ============= RESPONSE SCHEMA =============

/**
 * Gemini generateContent API response for image generation.
 * 
 * Official Documentation:
 * https://cloud.google.com/vertex-ai/generative-ai/docs/reference/rest/v1/GenerateContentResponse
 * https://cloud.google.com/vertex-ai/generative-ai/docs/image/generate-images#response
 * 
 * Response Structure:
 * - candidates[].content.parts[].inlineData contains generated images
 * - Images returned as base64-encoded data with mimeType
 * - usageMetadata contains token usage information
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
