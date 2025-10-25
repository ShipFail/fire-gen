// functions/src/models/veo/veo-2.0-generate-001.ts
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
 * Matches official Vertex AI API for veo-2.0-generate-001:
 * Previous generation Veo with simpler parameter set
 */

// Media input schemas
const MediaSchema = z.object({
  gcsUri: z.string().optional(),
  bytesBase64Encoded: z.string().optional(),
  mimeType: z.string().optional(),
});

// Instance schema (per-request input)
const Veo20InstanceSchema = z.object({
  prompt: z.string(),
  image: MediaSchema.optional(), // For referenceImage
});

// Parameters schema (generation config)
const Veo20ParametersSchema = z.object({
  aspectRatio: z.enum(["16:9", "9:16", "1:1"]).default("16:9"),
  durationSeconds: z.union([z.literal(4), z.literal(6), z.literal(8)]).default(8),
  generateAudio: z.boolean().default(true),
  resolution: z.enum(["1080p", "720p"]).default("1080p"),
  sampleCount: z.number().int().default(1),
  storageUri: z.string().optional(), // Added by adapter
});

// Complete REST API request schema
export const Veo20Generate001RequestSchema = z.object({
  model: z.literal("veo-2.0-generate-001"),
  instances: z.array(Veo20InstanceSchema),
  parameters: Veo20ParametersSchema.optional(),
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

    // Set output storage URI
    const storageUri = ensureTrailingSlash(getJobStorageUri(jobId));

    // Update parameters with output location
    const parameters = {
      ...validated.parameters,
      storageUri,
    };

    logger.info("Starting Veo 2.0 generation via REST API", {
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
export default Veo20Generate001Adapter;
