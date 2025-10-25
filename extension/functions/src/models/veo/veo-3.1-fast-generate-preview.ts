// functions/src/models/veo/veo-3.1-fast-generate-preview.ts
import {z} from "zod";
import * as logger from "firebase-functions/logger";

import {ai} from "../_shared/ai-client.js";
import {UrlOrGcsUriSchema} from "../_shared/zod-helpers.js";
import {getJobStorageUri} from "../../storage.js";
import {ensureTrailingSlash} from "../../util.js";
import type {ModelAdapter, StartResult, ModelOutput} from "../_shared/base.js";
import type {OperationResult} from "../../poller.js";
import {VEO_COMMON_FIELDS_SCHEMA} from "./shared-schemas.js";
import {pollVeoOperation, extractVeoOutput} from "./shared-polling.js";

// ============= VEO 3.1 SPECIFIC SCHEMAS =============
/**
 * Veo 3.1 specific parameters (not available in 2.0/3.0)
 *
 * Based on official Vertex AI documentation and SDK types:
 * - compressionQuality: Video file size optimization
 * - enhancePrompt: AI-powered prompt improvement
 * - personGeneration: Safety controls for human generation
 * - seed: Reproducible generation
 * - referenceType: How reference images are used (ASSET vs STYLE)
 */
const VEO_31_COMPRESSION_QUALITY_SCHEMA = z.enum(["optimized", "lossless"]);
const VEO_31_PERSON_GENERATION_SCHEMA = z.enum(["dont_allow", "allow_adult"]);
const VEO_31_REFERENCE_TYPE_SCHEMA = z.enum(["asset", "style"]);

// ============= SCHEMA (Single Source of Truth) =============
export const Veo31FastGeneratePreviewRequestSchema = VEO_COMMON_FIELDS_SCHEMA.extend({
  model: z.literal("veo-3.1-fast-generate-preview"),
  // Veo 3.1 specific fields - Image/Video inputs
  imageGcsUri: UrlOrGcsUriSchema.optional(),
  referenceSubjectImages: z.array(UrlOrGcsUriSchema).max(3).optional(),
  videoGcsUri: UrlOrGcsUriSchema.optional(),
  lastFrameGcsUri: UrlOrGcsUriSchema.optional(),
  // Veo 3.1 specific fields - Generation controls
  negativePrompt: z.string().optional(),
  seed: z.number().int().optional(),
  enhancePrompt: z.boolean().optional(),
  personGeneration: VEO_31_PERSON_GENERATION_SCHEMA.optional(),
  compressionQuality: VEO_31_COMPRESSION_QUALITY_SCHEMA.optional(),
  referenceType: VEO_31_REFERENCE_TYPE_SCHEMA.optional(),
});

// ============= TYPE (Inferred from Schema) =============
export type Veo31FastGeneratePreviewRequest = z.infer<typeof Veo31FastGeneratePreviewRequestSchema>;

// ============= CONSTANTS =============
export const VEO_3_1_FAST_GENERATE_PREVIEW_CONFIG = {
  modelId: "veo-3.1-fast-generate-preview" as const,
  displayName: "Veo 3.1 Fast",
  category: "video" as const,
  isAsync: true,
  generationTime: "30-60s",
  schema: Veo31FastGeneratePreviewRequestSchema,
} as const;

// ============= AI HINT =============
export const VEO_3_1_FAST_GENERATE_PREVIEW_AI_HINT = `
- veo-3.1-fast-generate-preview (general use, 30-60s generation)

  Capabilities:
  1. referenceSubjectImages: Array of gs:// URIs for character/object consistency
     - Extract gs:// URIs from prompt (image descriptions, character references)
     - Remove extracted URIs from prompt

  2. videoGcsUri: Single gs:// URI for video-to-video generation
     - Extract gs:// video URI if present
     - Remove from prompt after extracting

  3. Frame transition (imageGcsUri): Single gs:// URI when prompt describes first→last frame change
     - Patterns: "from X to Y", "transition", "First frame: X Last frame: Y"
     - Remove from prompt after extracting

  4. Image animation (imageGcsUri): Single gs:// URI when prompt describes making static image move
     - Never combine with referenceSubjectImages

  5. negativePrompt: String of unwanted elements
     - Extract from "avoid X", "without Y", "no Z" phrases

  6. enhancePrompt: boolean - AI-powered prompt improvement
     - Use when prompt is short/simple or user requests "enhance" or "improve prompt"

  7. personGeneration: "allow_adult" | "dont_allow"
     - Default: allow_adult
     - Use "dont_allow" if user explicitly requests no people/humans

  8. compressionQuality: "optimized" | "lossless"
     - Default: optimized (smaller file size)
     - Use "lossless" when user mentions "high quality", "uncompressed", "best quality"

  9. seed: number - for reproducible generation
     - Extract if user provides a number for "seed" or "reproducible"
`;


// ============= ADAPTER (Standalone - No Inheritance) =============
export class Veo31FastGeneratePreviewAdapter implements ModelAdapter {
  private readonly modelId = "veo-3.1-fast-generate-preview";

  async start(request: any, jobId: string): Promise<StartResult> {
    // Validate with Zod schema
    const validated = Veo31FastGeneratePreviewRequestSchema.parse(request);

    // Veo writes directly to GCS via outputGcsUri
    const outputGcsUri = ensureTrailingSlash(getJobStorageUri(jobId));

    logger.info("Starting Veo 3.1 Fast generation", {
      jobId,
      model: this.modelId,
      outputGcsUri,
    });

    // Build config for Veo 3.1 API
    const config: Record<string, unknown> = {
      numberOfVideos: 1,
      durationSeconds: validated.duration,
      aspectRatio: validated.aspectRatio,
      generateAudio: validated.audio,
      outputGcsUri,
    };

    // Veo 3.1 specific features - Image/Video inputs
    if (validated.imageGcsUri) {
      config.image = validated.imageGcsUri;
    }
    if (validated.referenceSubjectImages && validated.referenceSubjectImages.length > 0) {
      config.referenceImages = {
        subject: validated.referenceSubjectImages,
      };
    }
    if (validated.videoGcsUri) {
      config.video = validated.videoGcsUri;
    }
    if (validated.lastFrameGcsUri) {
      config.lastFrame = validated.lastFrameGcsUri;
    }

    // Veo 3.1 specific features - Generation controls
    if (validated.negativePrompt) {
      config.negativePrompt = validated.negativePrompt;
    }
    if (validated.seed !== undefined) {
      config.seed = validated.seed;
    }
    if (validated.enhancePrompt !== undefined) {
      config.enhancePrompt = validated.enhancePrompt;
    }
    if (validated.personGeneration) {
      config.personGeneration = validated.personGeneration;
    }
    if (validated.compressionQuality) {
      config.compressionQuality = validated.compressionQuality.toUpperCase();
    }

    const op = await ai.models.generateVideos({
      model: this.modelId,
      source: {prompt: validated.prompt},
      config,
    });

    if (!op?.name) {
      throw new Error("Veo did not return an operation name.");
    }

    logger.info("Veo operation started", {jobId, operationName: op.name});

    return {operationName: op.name};
  }

  async poll(operationName: string): Promise<OperationResult> {
    return pollVeoOperation(operationName);
  }

  async extractOutput(result: OperationResult, jobId: string): Promise<ModelOutput> {
    return extractVeoOutput(result, jobId);
  }
}

// ============= EXPORTS =============
export default Veo31FastGeneratePreviewAdapter;
