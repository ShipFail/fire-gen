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
    .describe("Google Cloud Storage URI in gs:// format"),
  bytesBase64Encoded: z.string().optional()
    .describe("Base64-encoded media bytes (alternative to gcsUri)"),
  mimeType: z.string().optional()
    .describe("MIME type (e.g., image/png, video/mp4)"),
});

const ReferenceImageSchema = z.object({
  image: MediaSchema
    .describe("Reference image for subject or style"),
  referenceType: z.enum(["ASSET", "STYLE"]).optional()
    .describe("Type of reference: ASSET for subjects/objects, STYLE for artistic style"),
});

// ============= INSTANCE SCHEMA =============

const Veo31FastInstanceSchema = z.object({
  prompt: z.string()
    .describe("Text description of the video to generate. Describe the scene, action, and visual elements without including URLs."),
  image: MediaSchema.optional()
    .describe("Starting image for image-to-video generation. First keyframe when creating video from a still image."),
  video: MediaSchema.optional()
    .describe("Source video for video extension. Used when continuing or extending an existing video."),
  lastFrame: MediaSchema.optional()
    .describe("Target ending image for video generation. Final keyframe to transition toward."),
  referenceImages: z.array(ReferenceImageSchema).max(3).optional()
    .describe("Reference images for subjects or styles (maximum 3). Used to maintain consistency of characters, objects, or artistic style."),
});

// ============= PARAMETERS SCHEMA =============

const Veo31FastParametersSchema = z.object({
  aspectRatio: z.enum(["16:9", "9:16", "1:1", "21:9", "3:4", "4:3"]).default("16:9")
    .describe("Video aspect ratio. 16:9 for landscape, 9:16 for vertical/mobile, 1:1 for square."),
  compressionQuality: z.enum(["OPTIMIZED", "LOSSLESS"]).optional()
    .describe("Video compression quality. OPTIMIZED for smaller files, LOSSLESS for maximum quality."),
  // Vertex AI requires type: "string" for all enum fields, even for numeric values
  durationSeconds: z.union([z.literal("4"), z.literal("6"), z.literal("8")]).default("8")
    .describe("Video duration in seconds. Must be 4, 6, or 8 seconds."),
  enhancePrompt: z.boolean().optional()
    .describe("Whether to enhance the prompt with additional details automatically."),
  generateAudio: z.boolean().default(true)
    .describe("Whether to generate audio track for the video."),
  negativePrompt: z.string().optional()
    .describe("Description of elements to avoid in the generated video."),
  personGeneration: z.enum(["dont_allow", "allow_adult"]).optional()
    .describe("Person generation policy. dont_allow prevents any people, allow_adult permits adult humans only."),
  sampleCount: z.number().int().default(1)
    .describe("Number of video variations to generate."),
  seed: z.number().int().optional()
    .describe("Random seed for reproducible generation."),
  storageUri: z.string().optional()
    .describe("GCS bucket path for storing generated videos."),
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
