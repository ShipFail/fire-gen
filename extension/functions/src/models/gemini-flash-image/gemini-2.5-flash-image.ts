// functions/src/models/gemini-flash-image/gemini-2.5-flash-image.ts
import {z} from "zod";
import * as logger from "firebase-functions/logger";

import {callVertexAPI} from "../_shared/vertex-ai-client.js";
import {PROJECT_ID} from "../../firebase-admin.js";
import {REGION} from "../../env.js";
import {PromptSchema} from "../_shared/zod-helpers.js";
import {getOutputFileUri, uploadToGcs} from "../../storage.js";
import type {ModelAdapter, StartResult, ModelOutput} from "../_shared/base.js";

/**
 * Gemini 2.5 Flash Image - Fast image generation
 * Uses Gemini generateContent API with IMAGE modality
 */

/**
 * Gemini 2.5 Flash Image response types (uses generateContent API like Gemini text/TTS)
 */
interface Gemini25FlashImageResponse {
  candidates: Array<{
    content: {
      parts: Array<{
        inlineData?: {
          mimeType: string;
          data: string;
        };
        [key: string]: unknown;
      }>;
      role?: string;
    };
    finishReason?: string;
  }>;
  usageMetadata?: {
    promptTokenCount: number;
    candidatesTokenCount: number;
    totalTokenCount: number;
  };
}

/**
 * Call Gemini generateContent API for image generation
 */
async function generateImage(
  model: string,
  payload: {
    contents: string | Array<{role?: string; parts: Array<{text: string}>}>;
    generationConfig: {
      responseModalities: string[];
      imageConfig?: {
        aspectRatio?: string;
      };
    };
    safetySettings?: Array<{category: string; threshold: string}>;
  }
): Promise<Gemini25FlashImageResponse> {
  const endpoint = `v1/projects/${PROJECT_ID}/locations/${REGION}/publishers/google/models/${model}:generateContent`;
  return callVertexAPI<Gemini25FlashImageResponse>(endpoint, payload);
}

export const Gemini25FlashImageAspectRatioSchema = z.enum([
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
export type Gemini25FlashImageAspectRatio = z.infer<typeof Gemini25FlashImageAspectRatioSchema>;

const SafetySettingSchema = z.object({
  category: z.string(),
  threshold: z.string(),
});

/**
 * REST API schemas matching Vertex AI Gemini API with IMAGE modality
 */

const Gemini25FlashImageContentSchema = z.object({
  role: z.literal("user").optional(),
  parts: z.array(z.object({
    text: PromptSchema,
  })),
});

const Gemini25FlashImageGenerationConfigSchema = z.object({
  responseModalities: z.array(z.literal("IMAGE")),
  imageConfig: z.object({
    aspectRatio: Gemini25FlashImageAspectRatioSchema.optional(),
  }).optional(),
}).optional();

// ============= SCHEMA =============
export const Gemini25FlashImageRequestSchema = z.object({
  model: z.literal("gemini-2.5-flash-image"),
  contents: z.union([
    PromptSchema.transform(text => [{role: "user" as const, parts: [{text}]}]),
    z.array(Gemini25FlashImageContentSchema),
  ]),
  generationConfig: Gemini25FlashImageGenerationConfigSchema.transform(config => ({
    responseModalities: ["IMAGE" as const],
    imageConfig: config?.imageConfig,
  })),
  safetySettings: z.array(SafetySettingSchema).optional(),
});

// ============= TYPE =============
export type Gemini25FlashImageRequest = z.infer<typeof Gemini25FlashImageRequestSchema>;

// ============= CONSTANTS =============
export const GEMINI_25_FLASH_IMAGE_CONFIG = {
  modelId: "gemini-2.5-flash-image" as const,
  displayName: "Gemini 2.5 Flash Image",
  category: "image" as const,
  isAsync: false,
  generationTime: "2-5s",
  schema: Gemini25FlashImageRequestSchema,
} as const;

// ============= AI HINT =============
export const GEMINI_25_FLASH_IMAGE_AI_HINT = `
- **gemini-2.5-flash-image**: Fast image generation (Gemini 2.5 Flash Image)
  - Use when: User requests "image" without quality modifiers, or mentions "quick", "fast", "simple"
  - Generation time: 2-5 seconds
  - DEFAULT CHOICE for image requests
`;

// ============= ADAPTER =============
export class Gemini25FlashImageAdapter implements ModelAdapter {
  protected schema = Gemini25FlashImageRequestSchema;
  protected modelId = "gemini-2.5-flash-image";

  async start(request: any, jobId: string): Promise<StartResult> {
    // Validate with Zod schema
    const validated = this.schema.parse(request);

    logger.info("Starting Gemini 2.5 Flash Image generation", {
      jobId,
      model: this.modelId,
      imageConfig: validated.generationConfig?.imageConfig,
    });

    // Call Gemini 2.5 Flash Image via REST API
    const response = await generateImage(this.modelId, {
      contents: validated.contents,
      generationConfig: validated.generationConfig,
      safetySettings: validated.safetySettings,
    });

    // Extract image data from first candidate
    const imagePart = response.candidates?.[0]?.content?.parts?.find(
      (part) => part.inlineData?.mimeType?.startsWith("image/")
    );

    if (!imagePart?.inlineData?.data) {
      throw new Error("No image data in Nano Banana response");
    }

    // Convert base64 to buffer
    const imageData = Buffer.from(imagePart.inlineData.data, "base64");
    const mimeType = imagePart.inlineData.mimeType || "image/png";

    // Upload to GCS
    const outputUri = getOutputFileUri(jobId, {model: this.modelId, type: "image"});
    await uploadToGcs(imageData, outputUri, mimeType);

    logger.info("Nano Banana generation completed", {jobId, uri: outputUri});

    // Synchronous operation - return output immediately
    const output: ModelOutput = {
      uri: outputUri,
      metadata: {
        mimeType,
        size: imageData.length,
        aspectRatio: validated.generationConfig?.imageConfig?.aspectRatio || "1:1",
      },
    };

    return {output};
  }

  // Gemini 2.5 Flash Image is synchronous - no polling needed
}

export default Gemini25FlashImageAdapter;
