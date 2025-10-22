// functions/src/models/nano-banana/nano-banana.ts
import {z} from "zod";
import * as logger from "firebase-functions/logger";

import {ai} from "../_shared/ai-client.js";
import {PromptSchema} from "../_shared/zod-helpers.js";
import {getOutputFileUri, uploadToGcs} from "../../storage.js";
import type {ModelAdapter, StartResult, ModelOutput} from "../_shared/base.js";

/**
 * Nano Banana (Gemini 2.5 Flash Image) - Fast image generation
 */

export const NanoBananaAspectRatioSchema = z.enum([
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
export type NanoBananaAspectRatio = z.infer<typeof NanoBananaAspectRatioSchema>;

const SafetySettingSchema = z.object({
  category: z.string(),
  threshold: z.string(),
});

// ============= SCHEMA =============
export const NanoBananaRequestSchema = z.object({
  type: z.literal("image"),
  model: z.literal("nano-banana"),
  prompt: PromptSchema,
  aspectRatio: NanoBananaAspectRatioSchema.default("1:1").optional(),
  safetySettings: z.array(SafetySettingSchema).optional(),
});

// ============= TYPE =============
export type NanoBananaRequest = z.infer<typeof NanoBananaRequestSchema>;

// ============= CONSTANTS =============
export const NANO_BANANA_CONFIG = {
  modelId: "nano-banana" as const,
  displayName: "Nano Banana (Gemini 2.5 Flash Image)",
  category: "image" as const,
  isAsync: false,
  generationTime: "2-5s",
  schema: NanoBananaRequestSchema,
} as const;

// ============= AI HINT =============
export const NANO_BANANA_AI_HINT = `
- **nano-banana**: Fast image generation (Gemini 2.5 Flash Image)
  - Use when: User requests "image" without quality modifiers, or mentions "quick", "fast", "simple"
  - Generation time: 2-5 seconds
  - DEFAULT CHOICE for image requests
`;

// ============= ADAPTER =============
export class NanoBananaAdapter implements ModelAdapter {
  protected schema = NanoBananaRequestSchema;
  protected modelId = "nano-banana";

  async start(request: any, jobId: string): Promise<StartResult> {
    // Validate with Zod schema
    const validated = this.schema.parse(request);

    logger.info("Starting Nano Banana generation", {
      jobId,
      model: this.modelId,
      aspectRatio: validated.aspectRatio,
    });

    // Call Gemini 2.5 Flash Image
    // Note: Type assertion needed - SDK types don't include imageConfig
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-image",
      contents: validated.prompt,
      config: {
        responseModalities: ["IMAGE"],
        ...(validated.aspectRatio ? {
          imageConfig: {
            aspectRatio: validated.aspectRatio,
          },
        } : {}),
      },
      safetySettings: validated.safetySettings,
    } as any);

    // Extract image data from response
    const imagePart = response.candidates?.[0]?.content?.parts?.find(
      (part: any) => part.inlineData?.mimeType?.startsWith("image/")
    );

    if (!imagePart?.inlineData?.data) {
      throw new Error("No image data in Nano Banana response");
    }

    // Convert base64 to buffer
    const imageData = Buffer.from(imagePart.inlineData.data, "base64");
    const mimeType = imagePart.inlineData.mimeType || "image/png";

    // Upload to GCS
    const outputUri = getOutputFileUri(jobId, validated);
    await uploadToGcs(imageData, outputUri, mimeType);

    logger.info("Nano Banana generation completed", {jobId, uri: outputUri});

    // Synchronous operation - return output immediately
    const output: ModelOutput = {
      uri: outputUri,
      metadata: {
        mimeType,
        size: imageData.length,
        aspectRatio: validated.aspectRatio || "1:1",
      },
    };

    return {output};
  }

  // Nano Banana is synchronous - no polling needed
}

export default NanoBananaAdapter;
