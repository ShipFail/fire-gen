// functions/src/models/veo/shared.ts
import {z} from "zod";
import {GenerateVideosOperation} from "@google/genai";
import * as logger from "firebase-functions/logger";

import {ai} from "../_shared/ai-client.js";
import {PromptSchema, UrlOrGcsUriSchema} from "../_shared/zod-helpers.js";
import {getJobStorageUri} from "../../storage.js";
import {ensureTrailingSlash} from "../../util.js";
import type {ModelAdapter, StartResult, ModelOutput} from "../_shared/base.js";
import type {OperationResult} from "../../poller.js";

/**
 * Shared Zod schemas for all Veo models
 */

export const VeoAspectRatioSchema = z.enum(["16:9", "9:16", "1:1", "21:9", "3:4", "4:3"]);
export type VeoAspectRatio = z.infer<typeof VeoAspectRatioSchema>;

export const VeoResolutionSchema = z.enum(["1080p", "720p"]);
export type VeoResolution = z.infer<typeof VeoResolutionSchema>;

export const VeoDurationSchema = z.union([z.literal(4), z.literal(6), z.literal(8)]);
export type VeoDuration = z.infer<typeof VeoDurationSchema>;

/**
 * Base Zod schema for Veo 2.0 and 3.0 models.
 * Includes resolution parameter (deprecated in 3.1).
 * Specific models extend this and override the `model` field.
 */
export const VeoRequestBaseSchema = z.object({
  type: z.literal("video"),
  model: z.string(), // Overridden in specific models
  prompt: PromptSchema,
  duration: VeoDurationSchema.default(8),
  aspectRatio: VeoAspectRatioSchema.default("16:9"),
  resolution: VeoResolutionSchema.default("1080p"),
  audio: z.boolean().default(true),
  referenceImageGcsUri: UrlOrGcsUriSchema.optional(),
});

export type VeoRequestBase = z.infer<typeof VeoRequestBaseSchema>;

/**
 * Base Zod schema for Veo 3.1 models.
 * New features: video extension, frame-specific generation, multi-subject references, negative prompts.
 * Deprecated: resolution parameter (removed from API).
 */
export const Veo31RequestBaseSchema = z.object({
  type: z.literal("video"),
  model: z.string(), // Overridden in specific models
  prompt: PromptSchema,
  duration: VeoDurationSchema.default(8),
  aspectRatio: VeoAspectRatioSchema.default("16:9"),
  audio: z.boolean().default(true),
  // New 3.1 features
  imageGcsUri: UrlOrGcsUriSchema.optional(), // For image-to-video
  referenceSubjectImages: z.array(UrlOrGcsUriSchema).max(3).optional(),
  videoGcsUri: UrlOrGcsUriSchema.optional(), // For video extension
  lastFrameGcsUri: UrlOrGcsUriSchema.or(z.null()).optional(), // For frame-specific generation (null = backend extracts)
  negativePrompt: z.string().optional(), // What NOT to include in the video
});

export type Veo31RequestBase = z.infer<typeof Veo31RequestBaseSchema>;

/**
 * Base adapter class for all Veo models.
 * Provides shared implementation for start/poll/extractOutput.
 */
export abstract class VeoAdapterBase implements ModelAdapter {
  protected abstract schema: z.ZodSchema;
  protected abstract modelId: string;
  protected abstract isVeo31: boolean; // Flag to determine API version

  async start(request: any, jobId: string): Promise<StartResult> {
    // Validate with Zod schema
    const validated = this.schema.parse(request);

    // Veo writes directly to GCS via outputGcsUri
    const outputGcsUri = ensureTrailingSlash(getJobStorageUri(jobId));

    logger.info("Starting Veo generation", {
      jobId,
      model: this.modelId,
      outputGcsUri,
      isVeo31: this.isVeo31,
    });

    // Build config based on Veo version
    const config: any = {
      numberOfVideos: 1,
      durationSeconds: validated.duration,
      aspectRatio: validated.aspectRatio,
      generateAudio: validated.audio,
      outputGcsUri,
    };

    // Veo 3.0 and earlier: use resolution and referenceImageGcsUri
    if (!this.isVeo31) {
      config.resolution = validated.resolution;
      if (validated.referenceImageGcsUri) {
        config.referenceImageGcsUri = validated.referenceImageGcsUri;
      }
    }
    // Veo 3.1+: use image, referenceImages.subject, video, lastFrame, negativePrompt (resolution deprecated)
    else {
      // Image-to-video base frame
      if (validated.imageGcsUri) {
        config.image = validated.imageGcsUri;
      }
      // Multi-subject reference images
      if (validated.referenceSubjectImages && validated.referenceSubjectImages.length > 0) {
        config.referenceImages = {
          subject: validated.referenceSubjectImages,
        };
      }
      // Video extension mode
      if (validated.videoGcsUri) {
        config.video = validated.videoGcsUri;
      }
      // Frame-specific generation (null means backend should extract)
      if (validated.lastFrameGcsUri !== undefined && validated.lastFrameGcsUri !== null) {
        config.lastFrame = validated.lastFrameGcsUri;
      }
      // Negative prompt
      if (validated.negativePrompt) {
        config.negativePrompt = validated.negativePrompt;
      }
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

    // Async operation - return operation name for polling
    return {operationName: op.name};
  }

  async poll(operationName: string): Promise<OperationResult> {
    const opForPolling = new GenerateVideosOperation();
    opForPolling.name = operationName;

    const updated = await ai.operations.getVideosOperation({
      operation: opForPolling,
    });

    return {
      done: updated?.done ?? false,
      error: updated?.error as {message?: string; code?: string} | undefined,
      data: updated?.response as {
        generatedVideos?: Array<{video?: {uri?: string}}>;
      } | undefined,
    };
  }

  async extractOutput(result: OperationResult, jobId: string): Promise<ModelOutput> {
    const response = result.data as {
      generatedVideos?: Array<{video?: {uri?: string}}>;
    } | undefined;

    const uri = response?.generatedVideos?.[0]?.video?.uri;

    if (!uri) {
      throw new Error("No video URI in Veo response");
    }

    logger.info("Extracted Veo output", {jobId, uri});

    return {uri};
  }
}
