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
  gcsUri: z.string().optional(),
  bytesBase64Encoded: z.string().optional(),
  mimeType: z.string().optional(),
});

const ReferenceImageSchema = z.object({
  image: MediaSchema,
  referenceType: z.enum(["ASSET", "STYLE"]).optional(),
});

// ============= INSTANCE SCHEMA =============

const Veo31FastInstanceSchema = z.object({
  prompt: z.string(),
  image: MediaSchema.optional(),
  video: MediaSchema.optional(),
  lastFrame: MediaSchema.optional(),
  referenceImages: z.array(ReferenceImageSchema).max(3).optional(),
});

// ============= PARAMETERS SCHEMA =============

const Veo31FastParametersSchema = z.object({
  aspectRatio: z.enum(["16:9", "9:16", "1:1", "21:9", "3:4", "4:3"]).default("16:9"),
  compressionQuality: z.enum(["OPTIMIZED", "LOSSLESS"]).optional(),
  durationSeconds: z.union([z.literal(4), z.literal(6), z.literal(8)]).default(8),
  enhancePrompt: z.boolean().optional(),
  generateAudio: z.boolean().default(true),
  negativePrompt: z.string().optional(),
  personGeneration: z.enum(["dont_allow", "allow_adult"]).optional(),
  sampleCount: z.number().int().default(1),
  seed: z.number().int().optional(),
  storageUri: z.string().optional(), // Made optional - adapter adds this
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
 * Same structure as standard Veo model.
 */
export const Veo31FastGeneratePreviewResponseSchema = z.object({
  name: z.string(), // Operation name: "projects/.../operations/..."
  done: z.boolean().optional(),
  error: z.object({
    code: z.number().optional(),
    message: z.string().optional(),
  }).optional(),
  response: z.object({
    generatedVideos: z.array(z.object({
      video: z.object({
        uri: z.string(), // gs:// URI of generated video
      }).optional(),
    })).optional(),
  }).optional(),
});

export type Veo31FastGeneratePreviewResponse = z.infer<typeof Veo31FastGeneratePreviewResponseSchema>;
