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
 * Base Zod schema for all Veo models.
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
 * Base adapter class for all Veo models.
 * Provides shared implementation for start/poll/extractOutput.
 */
export abstract class VeoAdapterBase implements ModelAdapter {
  protected abstract schema: z.ZodSchema;
  protected abstract modelId: string;

  async start(request: any, jobId: string): Promise<StartResult> {
    // Validate with Zod schema
    const validated = this.schema.parse(request);

    // Veo writes directly to GCS via outputGcsUri
    const outputGcsUri = ensureTrailingSlash(getJobStorageUri(jobId));

    logger.info("Starting Veo generation", {
      jobId,
      model: this.modelId,
      outputGcsUri,
    });

    const op = await ai.models.generateVideos({
      model: this.modelId,
      source: {prompt: validated.prompt},
      config: {
        numberOfVideos: 1,
        durationSeconds: validated.duration,
        aspectRatio: validated.aspectRatio,
        resolution: validated.resolution,
        generateAudio: validated.audio,
        outputGcsUri,
        ...(validated.referenceImageGcsUri && {
          referenceImageGcsUri: validated.referenceImageGcsUri,
        }),
      },
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
