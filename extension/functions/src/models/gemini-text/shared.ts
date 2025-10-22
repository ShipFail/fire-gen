// functions/src/models/gemini-text/shared.ts
import {z} from "zod";
import * as logger from "firebase-functions/logger";

import {ai} from "../_shared/ai-client.js";
import {PromptSchema} from "../_shared/zod-helpers.js";
import type {ModelAdapter, StartResult, ModelOutput} from "../_shared/base.js";

/**
 * Shared Zod schemas for all Gemini Text models
 */

export const GeminiTextModelIdSchema = z.enum([
  "gemini-2.5-pro",
  "gemini-2.5-flash",
  "gemini-2.5-flash-lite",
  "gemini-2.0-flash",
  "gemini-2.0-flash-lite",
]);
export type GeminiTextModelId = z.infer<typeof GeminiTextModelIdSchema>;

/**
 * Base Zod schema for all Gemini Text models.
 * Specific models extend this and override the `model` field.
 */
export const GeminiTextRequestBaseSchema = z.object({
  type: z.literal("text"),
  model: GeminiTextModelIdSchema,
  prompt: PromptSchema,
  systemInstruction: z.string().optional(),
  temperature: z.number().min(0).max(2).optional(),
  maxOutputTokens: z.number().int().positive().optional(),
  topP: z.number().min(0).max(1).optional(),
  topK: z.number().int().positive().optional(),
  stopSequences: z.array(z.string()).optional(),
});

export type GeminiTextRequestBase = z.infer<typeof GeminiTextRequestBaseSchema>;

/**
 * Base adapter class for all Gemini Text models.
 * Provides shared implementation for synchronous text generation.
 */
export abstract class GeminiTextAdapterBase implements ModelAdapter {
  protected abstract schema: z.ZodSchema;
  protected abstract modelId: string;

  async start(request: any, jobId: string): Promise<StartResult> {
    // Validate with Zod schema
    const validated = this.schema.parse(request);

    logger.info("Starting Gemini text generation", {
      jobId,
      model: this.modelId,
    });

    // Build generation config
    const config: Record<string, unknown> = {};

    if (validated.temperature !== undefined) {
      config.temperature = validated.temperature;
    }
    if (validated.maxOutputTokens !== undefined) {
      config.maxOutputTokens = validated.maxOutputTokens;
    }
    if (validated.topP !== undefined) {
      config.topP = validated.topP;
    }
    if (validated.topK !== undefined) {
      config.topK = validated.topK;
    }
    if (validated.stopSequences) {
      config.stopSequences = validated.stopSequences;
    }

    // Build request
    const requestParams: Record<string, unknown> = {
      model: this.modelId,
      contents: validated.prompt,
    };

    if (Object.keys(config).length > 0) {
      requestParams.config = config;
    }

    if (validated.systemInstruction) {
      requestParams.systemInstruction = validated.systemInstruction;
    }

    // Call Gemini
    // Note: Type assertion needed due to incomplete SDK type definitions for Vertex AI
    const response = await ai.models.generateContent(requestParams as any);

    // Extract text from response
    const text = response.text;

    if (!text || text.trim().length === 0) {
      throw new Error("No text content in Gemini response");
    }

    logger.info("Gemini text generation completed", {jobId, length: text.length});

    // Build metadata
    const metadata: Record<string, unknown> = {
      model: this.modelId,
      promptTokens: response.usageMetadata?.promptTokenCount || 0,
      completionTokens: response.usageMetadata?.candidatesTokenCount || 0,
      totalTokens: response.usageMetadata?.totalTokenCount || 0,
      finishReason: response.candidates?.[0]?.finishReason || "STOP",
    };

    // Text responses don't need GCS storage - return text directly
    const output: ModelOutput = {
      text,
      metadata,
    };

    return {output};
  }

  // Gemini text is synchronous - no polling needed
  // poll() and extractOutput() are not implemented
}
