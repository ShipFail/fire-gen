// functions/src/models/imagen/shared.ts
import {z} from "zod";
import * as logger from "firebase-functions/logger";

import {ai} from "../_shared/ai-client.js";
import {PromptSchema} from "../_shared/zod-helpers.js";
import {getOutputFileUri, uploadToGcs} from "../../storage.js";
import type {ModelAdapter, StartResult, ModelOutput} from "../_shared/base.js";

/**
 * Shared Zod schemas for all Imagen models
 */

export const ImagenAspectRatioSchema = z.enum([
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
export type ImagenAspectRatio = z.infer<typeof ImagenAspectRatioSchema>;

export const ImagenModelIdSchema = z.enum([
  "imagen-4.0-generate-001",
  "imagen-4.0-fast-generate-001",
  "imagen-4.0-ultra-generate-001",
]);
export type ImagenModelId = z.infer<typeof ImagenModelIdSchema>;

export const SafetySettingSchema = z.object({
  category: z.string(),
  threshold: z.string(),
});

/**
 * Base Zod schema for all Imagen models.
 * Specific models extend this and override the `model` field.
 */
export const ImagenRequestBaseSchema = z.object({
  type: z.literal("image"),
  model: ImagenModelIdSchema,
  prompt: PromptSchema,
  aspectRatio: ImagenAspectRatioSchema.default("1:1").optional(),
  safetySettings: z.array(SafetySettingSchema).optional(),
  // Imagen-specific optional parameters
  enhancePrompt: z.boolean().optional(),
  sampleCount: z.number().int().min(1).max(4).optional(),
  personGeneration: z.enum(["allow_adult", "dont_allow"]).optional(),
  language: z.string().optional(),
});

export type ImagenRequestBase = z.infer<typeof ImagenRequestBaseSchema>;

/**
 * Base adapter class for all Imagen models.
 * Provides shared implementation for synchronous image generation.
 */
export abstract class ImagenAdapterBase implements ModelAdapter {
  protected abstract schema: z.ZodSchema;
  protected abstract modelId: string;

  async start(request: any, jobId: string): Promise<StartResult> {
    // Validate with Zod schema
    const validated = this.schema.parse(request);

    logger.info("Starting Imagen generation", {
      jobId,
      model: this.modelId,
      aspectRatio: validated.aspectRatio,
    });

    // Build request parameters
    const params: Record<string, unknown> = {
      prompt: validated.prompt,
    };

    if (validated.aspectRatio) {
      params.aspectRatio = validated.aspectRatio;
    }

    if (validated.enhancePrompt !== undefined) {
      params.enhancePrompt = validated.enhancePrompt;
    }
    if (validated.sampleCount !== undefined) {
      params.sampleCount = validated.sampleCount;
    }
    if (validated.personGeneration) {
      params.personGeneration = validated.personGeneration;
    }
    if (validated.language) {
      params.language = validated.language;
    }

    // Call Imagen via Vertex AI
    // Note: Type assertion needed - SDK doesn't expose Imagen methods in TypeScript types
    const response = (await (ai.models as any).generateImages({
      model: this.modelId,
      ...params,
      safetySettings: validated.safetySettings,
    })) as any;

    // Extract first image from response
    const imagePart = response.candidates?.[0]?.content?.parts?.find(
      (part: any) => part.inlineData?.mimeType?.startsWith("image/")
    );

    if (!imagePart?.inlineData?.data) {
      throw new Error("No image data in Imagen response");
    }

    // Convert base64 to buffer
    const imageData = Buffer.from(imagePart.inlineData.data, "base64");
    const mimeType = imagePart.inlineData.mimeType || "image/png";

    // Upload to GCS
    const outputUri = getOutputFileUri(jobId, validated);
    await uploadToGcs(imageData, outputUri, mimeType);

    logger.info("Imagen generation completed", {jobId, uri: outputUri});

    // Build metadata
    const metadata: Record<string, unknown> = {
      mimeType,
      size: imageData.length,
      aspectRatio: validated.aspectRatio || "1:1",
    };

    // Include enhanced prompt if available
    if (response.enhancedPrompt) {
      metadata.enhancedPrompt = response.enhancedPrompt;
    }

    // Synchronous operation - return output immediately
    const output: ModelOutput = {
      uri: outputUri,
      metadata,
    };

    return {output};
  }

  // Imagen is synchronous - no polling needed
  // poll() and extractOutput() are not implemented
}
