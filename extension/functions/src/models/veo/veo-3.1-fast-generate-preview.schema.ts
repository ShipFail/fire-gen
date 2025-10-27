// functions/src/models/veo/veo-3.1-fast-generate-preview.schema.ts
import {z} from "zod";

/**
 * Zod schema for veo-3.1-fast-generate-preview model.
 *
 * This is the SINGLE SOURCE OF TRUTH for the veo-3.1-fast-generate-preview request format.
 * Matches official Vertex AI API:
 * https://cloud.google.com/vertex-ai/generative-ai/docs/model-reference/veo
 */

// ============= MEDIA SCHEMAS (Shared) =============

const MediaSchema = z.object({
  gcsUri: z.string().optional()
    .describe("Google Cloud Storage URI (gs://bucket/path format) to media file location"),
  bytesBase64Encoded: z.string().optional()
    .describe("Base64-encoded media bytes as alternative to Cloud Storage reference"),
  mimeType: z.string().optional()
    .describe("Media MIME type specifying format: image/png, image/jpeg, video/mp4, video/mov"),
});

const ReferenceImageSchema = z.object({
  image: MediaSchema
    .describe("Reference image providing visual guidance for video generation"),
  referenceType: z.enum(["asset", "style"]).optional()
    .describe("Reference purpose: asset maintains subject/object consistency, style applies artistic qualities"),
});

// ============= INSTANCE SCHEMA =============

const Veo31FastInstanceSchema = z.object({
  prompt: z.string()
    .describe("Text description guiding video generation: scene composition, actions, visual style, camera movement"),
  image: MediaSchema.optional()
    .describe("Starting keyframe for image-to-video generation, defines initial visual state before animation begins"),
  video: MediaSchema.optional()
    .describe("Source video to extend, continues generation from existing video content"),
  lastFrame: MediaSchema.optional()
    .describe("Target ending keyframe, guides video to transition toward specific final composition"),
  referenceImages: z.array(ReferenceImageSchema).max(3).optional()
    .describe("Visual references (max 3) maintaining character, object, or style consistency across generated content"),
});

// ============= PARAMETERS SCHEMA =============

const Veo31FastParametersSchema = z.object({
  aspectRatio: z.enum(["16:9", "9:16", "1:1", "21:9", "3:4", "4:3"]).default("16:9")
    .describe("Output frame dimensions: 16:9 landscape, 9:16 mobile vertical, 1:1 square, 21:9 ultrawide cinema"),
  compressionQuality: z.enum(["optimized", "lossless"]).optional()
    .describe("Encoding quality: optimized reduces file size with minimal quality loss, lossless preserves maximum fidelity"),
  durationSeconds: z.union([z.literal(4), z.literal(6), z.literal(8)]).default(8)
    .describe("Generated video length in seconds, accepts 4, 6, or 8"),
  enhancePrompt: z.boolean().optional()
    .describe("Automatically enrich prompt with additional descriptive details for improved generation"),
  generateAudio: z.boolean().default(true)
    .describe("Generate synchronized audio track matching video content"),
  negativePrompt: z.string().optional()
    .describe("Elements to suppress: unwanted objects, styles, compositions, or visual features"),
  personGeneration: z.enum(["dont_allow", "allow_adult"]).optional()
    .describe("Human depiction control: dont_allow excludes all people, allow_adult permits adult humans only"),
  sampleCount: z.number().int().default(1)
    .describe("Number of video variations to generate from same prompt"),
  seed: z.number().int().optional()
    .describe("Random seed for deterministic generation, identical seeds produce consistent outputs"),
  storageUri: z.string().optional()
    .describe("Google Cloud Storage destination (gs://bucket/path) for generated video files"),
});

// ============= REQUEST SCHEMA (Complete) =============

/**
 * Complete REST API request schema for veo-3.1-fast-generate-preview.
 */
export const Veo31FastGeneratePreviewRequestSchema = z.object({
  model: z.literal("veo-3.1-fast-generate-preview"),
  instances: z.array(Veo31FastInstanceSchema),
  parameters: Veo31FastParametersSchema.optional(),
});

// ============= TYPE (Inferred from Schema) =============

export type Veo31FastGeneratePreviewRequest = z.infer<typeof Veo31FastGeneratePreviewRequestSchema>;

// ============= RESPONSE SCHEMA =============

/**
 * Vertex AI Long-Running Operation response for Veo Fast.
 * Matches official API response format from:
 * https://cloud.google.com/vertex-ai/generative-ai/docs/model-reference/veo-video-generation
 */
export const Veo31FastGeneratePreviewResponseSchema = z.object({
  name: z.string(), // Operation name: "projects/.../operations/..."
  done: z.boolean().optional(),
  error: z.object({
    code: z.number().optional(),
    message: z.string().optional(),
  }).optional(),
  response: z.object({
    "@type": z.string().optional(), // "type.googleapis.com/cloud.ai.large_models.vision.GenerateVideoResponse"
    raiMediaFilteredCount: z.number().optional(),
    raiMediaFilteredReasons: z.array(z.string()).optional(),
    videos: z.array(z.object({
      gcsUri: z.string().optional(), // gs:// URI of generated video
      bytesBase64Encoded: z.string().optional(), // base64-encoded video bytes (if no storageUri)
      mimeType: z.string().optional(), // e.g., "video/mp4"
    })).optional(),
  }).optional(),
});

export type Veo31FastGeneratePreviewResponse = z.infer<typeof Veo31FastGeneratePreviewResponseSchema>;
