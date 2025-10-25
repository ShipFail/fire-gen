// functions/src/models/gemini-text/shared.ts
import {z} from "zod";
import * as logger from "firebase-functions/logger";

import {generateContent} from "../_shared/vertex-ai-client.js";
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
 * REST API schemas matching official Vertex AI Gemini API
 * https://cloud.google.com/vertex-ai/generative-ai/docs/model-reference/gemini
 */

const GeminiPartSchema = z.object({
  text: PromptSchema,
});

const GeminiContentSchema = z.object({
  role: z.enum(["user", "model"]).optional(),
  parts: z.array(GeminiPartSchema),
});

const GeminiGenerationConfigSchema = z.object({
  temperature: z.number().min(0).max(2).optional(),
  maxOutputTokens: z.number().int().positive().optional(),
  topP: z.number().min(0).max(1).optional(),
  topK: z.number().int().positive().optional(),
  stopSequences: z.array(z.string()).optional(),
  candidateCount: z.number().int().min(1).max(8).optional(),
  presencePenalty: z.number().min(-2).max(2).optional(),
  frequencyPenalty: z.number().min(-2).max(2).optional(),
  responseMimeType: z.enum(["application/json", "text/plain"]).optional(),
  responseSchema: z.record(z.unknown()).optional(),
  seed: z.number().int().optional(),
}).optional();

const GeminiSystemInstructionSchema = z.object({
  role: z.literal("user").optional(),
  parts: z.array(GeminiPartSchema),
}).optional();

/**
 * Base Zod schema for all Gemini Text models.
 * Specific models extend this and override the `model` field.
 */
export const GeminiTextRequestBaseSchema = z.object({
  model: GeminiTextModelIdSchema,
  contents: z.union([
    PromptSchema.transform(text => [{role: "user" as const, parts: [{text}]}]),
    z.array(GeminiContentSchema),
  ]),
  systemInstruction: GeminiSystemInstructionSchema,
  generationConfig: GeminiGenerationConfigSchema,
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

    // Call Gemini via REST API
    const response = await generateContent(this.modelId, {
      contents: validated.contents,
      systemInstruction: validated.systemInstruction,
      generationConfig: validated.generationConfig,
    });

    // Extract text from first candidate
    const text = response.candidates?.[0]?.content?.parts?.[0]?.text;

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
