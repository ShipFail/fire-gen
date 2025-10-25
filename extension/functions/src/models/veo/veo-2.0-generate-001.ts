// functions/src/models/veo/veo-2.0-generate-001.ts
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
export const Veo20Generate001RequestSchema = VEO_COMMON_FIELDS_SCHEMA.extend({
  model: z.literal("veo-2.0-generate-001"),
  // Veo 2.0 specific fields
  resolution: z.enum(["1080p", "720p"]).default("1080p"),
  referenceImageGcsUri: UrlOrGcsUriSchema.optional(),
});

// ============= TYPE (Inferred from Schema) =============
export type Veo20Generate001Request = z.infer<typeof Veo20Generate001RequestSchema>;

// ============= CONSTANTS =============
export const VEO_2_0_GENERATE_001_CONFIG = {
  modelId: "veo-2.0-generate-001" as const,
  displayName: "Veo 2.0",
  category: "video" as const,
  isAsync: true,
  generationTime: "60-120s",
  schema: Veo20Generate001RequestSchema,
} as const;

// ============= AI HINT =============
export const VEO_2_0_GENERATE_001_AI_HINT = `
- **veo-2.0-generate-001**: Previous generation (8s default)
  - Use when: User explicitly requests "veo 2" or for fallback
  - Generation time: 60-120 seconds
`;

// ============= ADAPTER (Standalone - No Inheritance) =============
export class Veo20Generate001Adapter implements ModelAdapter {
  private readonly modelId = "veo-2.0-generate-001";

  async start(request: any, jobId: string): Promise<StartResult> {
    // Validate with Zod schema
    const validated = Veo20Generate001RequestSchema.parse(request);

    // Veo writes directly to GCS via outputGcsUri
    const outputGcsUri = ensureTrailingSlash(getJobStorageUri(jobId));

    logger.info("Starting Veo 2.0 generation", {
      jobId,
      model: this.modelId,
      outputGcsUri,
    });

    // Build config for Veo 2.0 API
    const config: Record<string, unknown> = {
      numberOfVideos: 1,
      durationSeconds: validated.duration,
      aspectRatio: validated.aspectRatio,
      resolution: validated.resolution,
      generateAudio: validated.audio,
      outputGcsUri,
    };

    // Veo 2.0 specific: referenceImageGcsUri
    if (validated.referenceImageGcsUri) {
      config.referenceImageGcsUri = validated.referenceImageGcsUri;
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
export default Veo20Generate001Adapter;
