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

// ============= SCHEMA (Single Source of Truth) =============
export const Veo31FastGeneratePreviewRequestSchema = VEO_COMMON_FIELDS_SCHEMA.extend({
  model: z.literal("veo-3.1-fast-generate-preview"),
  // Veo 3.1 specific fields
  imageGcsUri: UrlOrGcsUriSchema.optional(),
  referenceSubjectImages: z.array(UrlOrGcsUriSchema).max(3).optional(),
  videoGcsUri: UrlOrGcsUriSchema.optional(),
  lastFrameGcsUri: UrlOrGcsUriSchema.optional(),
  negativePrompt: z.string().optional(),
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
- **veo-3.1-fast-generate-preview**: Latest generation, fast video generation (8s default)
  - Use when: User requests "video" without quality modifiers, OR mentions "quick", "fast"
  - Generation time: 30-60 seconds
  - New features: Multi-subject references, video extension, frame-specific generation
  - **THIS IS THE DEFAULT CHOICE - use this for ALL video requests unless user explicitly asks for high quality**
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

    // Veo 3.1 specific features
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
    if (validated.negativePrompt) {
      config.negativePrompt = validated.negativePrompt;
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
