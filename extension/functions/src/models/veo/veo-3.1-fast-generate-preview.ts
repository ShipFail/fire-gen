// functions/src/models/veo/veo-3.1-fast-generate-preview.ts
import {z} from "zod";
import * as logger from "firebase-functions/logger";

import {predictLongRunning} from "../_shared/vertex-ai-client.js";
import {getJobStorageUri} from "../../storage.js";
import {ensureTrailingSlash} from "../../util.js";
import type {ModelAdapter, StartResult, ModelOutput} from "../_shared/base.js";
import type {OperationResult} from "../../poller.js";
import {pollVeoOperation, extractVeoOutput} from "./shared-polling.js";

// ============= OFFICIAL VERTEX AI REST API SCHEMA =============
/**
 * Matches official Vertex AI API for veo-3.1-fast-generate-preview:
 * https://cloud.google.com/vertex-ai/generative-ai/docs/model-reference/veo
 *
 * Request body format:
 * {
 *   "instances": [{
 *     "prompt": string,
 *     "image": { "gcsUri": string } | { "bytesBase64Encoded": string },
 *     "video": { "gcsUri": string } | { "bytesBase64Encoded": string },
 *     "lastFrame": { "gcsUri": string } | { "bytesBase64Encoded": string },
 *     "referenceImages": [{ "image": {...}, "referenceType": string }]
 *   }],
 *   "parameters": {
 *     "aspectRatio": "16:9" | "9:16" | "1:1" | "21:9" | "3:4" | "4:3",
 *     "compressionQuality": "OPTIMIZED" | "LOSSLESS",
 *     "durationSeconds": 4 | 6 | 8,
 *     "enhancePrompt": boolean,
 *     "generateAudio": boolean,
 *     "negativePrompt": string,
 *     "personGeneration": "dont_allow" | "allow_adult",
 *     "sampleCount": number,
 *     "seed": number,
 *     "storageUri": string  // gs:// path for output
 *   }
 * }
 */

// Image/Video input schemas
const MediaSchema = z.object({
  gcsUri: z.string().optional(),
  bytesBase64Encoded: z.string().optional(),
  mimeType: z.string().optional(),
});

const ReferenceImageSchema = z.object({
  image: MediaSchema,
  referenceType: z.enum(["ASSET", "STYLE"]).optional(),
});

// Instance schema (per-request input)
const Veo31InstanceSchema = z.object({
  prompt: z.string(),
  image: MediaSchema.optional(),
  video: MediaSchema.optional(),
  lastFrame: MediaSchema.optional(),
  referenceImages: z.array(ReferenceImageSchema).max(3).optional(),
});

// Parameters schema (generation config)
const Veo31ParametersSchema = z.object({
  aspectRatio: z.enum(["16:9", "9:16", "1:1", "21:9", "3:4", "4:3"]).default("16:9"),
  compressionQuality: z.enum(["OPTIMIZED", "LOSSLESS"]).optional(),
  durationSeconds: z.union([z.literal(4), z.literal(6), z.literal(8)]).default(8),
  enhancePrompt: z.boolean().optional(),
  generateAudio: z.boolean().default(true),
  negativePrompt: z.string().optional(),
  personGeneration: z.enum(["dont_allow", "allow_adult"]).optional(),
  sampleCount: z.number().int().default(1),
  seed: z.number().int().optional(),
  storageUri: z.string().optional(), // Made optional - adapter adds this
});

// Complete REST API request schema
export const Veo31FastGeneratePreviewRequestSchema = z.object({
  model: z.literal("veo-3.1-fast-generate-preview"),
  instances: z.array(Veo31InstanceSchema),
  parameters: Veo31ParametersSchema.optional(),
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

    // Set output storage URI
    const storageUri = ensureTrailingSlash(getJobStorageUri(jobId));

    // Update parameters with output location
    const parameters = {
      ...validated.parameters,
      storageUri,
    };

    logger.info("Starting Veo 3.1 Fast generation via REST API", {
      jobId,
      model: this.modelId,
      storageUri,
      instances: validated.instances,
      parameters,
    });

    // Call Vertex AI REST API
    const op = await predictLongRunning(this.modelId, {
      instances: validated.instances,
      parameters,
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
