// functions/src/models/imagen/shared.ts
import {z} from "zod";
import * as logger from "firebase-functions/logger";

import {predict} from "../_shared/vertex-ai-client.js";
import {PromptSchema} from "../_shared/zod-helpers.js";
import {uploadToGcs} from "../../storage.js";
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
 * REST API schemas matching official Vertex AI Imagen API
 * https://cloud.google.com/vertex-ai/generative-ai/docs/model-reference/imagen-api
 */

const ImagenInstanceSchema = z.object({
  prompt: PromptSchema,
});

const ImagenParametersSchema = z.object({
  sampleCount: z.number().int().min(1).max(4).optional(),
  aspectRatio: ImagenAspectRatioSchema.optional(),
  enhancePrompt: z.boolean().optional(),
  personGeneration: z.enum(["allow_adult", "dont_allow", "allow_all"]).optional(),
  language: z.string().optional(),
  safetySetting: z.string().optional(), // e.g., "block_medium_and_above"
  seed: z.number().optional(),
  sampleImageSize: z.enum(["1K", "2K"]).optional(),
  addWatermark: z.boolean().optional(),
  negativePrompt: z.string().optional(),
  outputOptions: z.object({
    mimeType: z.enum(["image/png", "image/jpeg"]).optional(),
    compressionQuality: z.number().int().min(0).max(100).optional(),
  }).optional(),
});

/**
 * Base Zod schema for all Imagen models.
 * Specific models extend this and override the `model` field.
 */
export const ImagenRequestBaseSchema = z.object({
  model: ImagenModelIdSchema,
  instances: z.array(ImagenInstanceSchema),
  parameters: ImagenParametersSchema.optional(),
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
      parameters: validated.parameters,
    });

    // Call Imagen via REST API
    const response = await predict(this.modelId, {
      instances: validated.instances,
      parameters: validated.parameters,
    });

    // Extract first prediction (base64 encoded image)
    const prediction = response.predictions[0];
    if (!prediction?.bytesBase64Encoded) {
      throw new Error("No bytesBase64Encoded in Imagen response");
    }

    // Convert base64 to buffer
    const imageData = Buffer.from(prediction.bytesBase64Encoded as string, "base64");
    const mimeType = (prediction.mimeType as string) || "image/png";

    // Upload to GCS (compute outputUri from job metadata)
    // Note: Imagen is synchronous so we need to generate output URI
    const outputUri = `gs://${process.env.FIREBASE_STORAGE_BUCKET}/outputs/${jobId}/image.png`;
    await uploadToGcs(imageData, outputUri, mimeType);

    logger.info("Imagen generation completed", {jobId, uri: outputUri});

    // Build metadata
    const metadata: Record<string, unknown> = {
      mimeType,
      size: imageData.length,
      aspectRatio: validated.parameters?.aspectRatio || "1:1",
    };

    // Include enhanced prompt if available
    if (prediction.prompt) {
      metadata.enhancedPrompt = prediction.prompt;
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
