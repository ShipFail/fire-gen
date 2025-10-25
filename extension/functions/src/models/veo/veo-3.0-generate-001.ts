// functions/src/models/veo/veo-3.0-generate-001.ts
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
 * Matches official Vertex AI API for veo-3.0-generate-001:
 * https://cloud.google.com/vertex-ai/generative-ai/docs/model-reference/veo
 *
 * Veo 3.0 uses same REST API structure as 3.1 but with different parameters
 */

// Media input schemas (shared with Veo 3.1)
const MediaSchema = z.object({
  gcsUri: z.string().optional(),
  bytesBase64Encoded: z.string().optional(),
  mimeType: z.string().optional(),
});

// Instance schema (per-request input)
const Veo30InstanceSchema = z.object({
  prompt: z.string(),
  image: MediaSchema.optional(), // For referenceImage
});

// Parameters schema (generation config)
const Veo30ParametersSchema = z.object({
  aspectRatio: z.enum(["16:9", "9:16", "1:1"]).default("16:9"),
  durationSeconds: z.union([z.literal(4), z.literal(6), z.literal(8)]).default(8),
  generateAudio: z.boolean().default(true),
  resolution: z.enum(["1080p", "720p"]).default("1080p"), // Veo 3.0 specific
  sampleCount: z.number().int().default(1),
  storageUri: z.string().optional(), // Added by adapter
});

// Complete REST API request schema
export const Veo30Generate001RequestSchema = z.object({
  model: z.literal("veo-3.0-generate-001"),
  instances: z.array(Veo30InstanceSchema),
  parameters: Veo30ParametersSchema.optional(),
});

// ============= TYPE (Inferred from Schema) =============
export type Veo30Generate001Request = z.infer<typeof Veo30Generate001RequestSchema>;

// ============= CONSTANTS =============
export const VEO_3_0_GENERATE_001_CONFIG = {
  modelId: "veo-3.0-generate-001" as const,
  displayName: "Veo 3.0 (Highest Quality)",
  category: "video" as const,
  isAsync: true,
  generationTime: "60-120s",
  schema: Veo30Generate001RequestSchema,
} as const;

// ============= AI HINT =============
export const VEO_3_0_GENERATE_001_AI_HINT = `
- **veo-3.0-generate-001**: Highest quality video (8s default, up to 10s)
  - Use when: User EXPLICITLY requests "high quality", "best quality", "cinematic", or detailed/complex scenes
  - Generation time: 60-120 seconds
  - **ONLY use if user specifically asks for high quality**
`;

// ============= ADAPTER (Standalone - No Inheritance) =============
export class Veo30Generate001Adapter implements ModelAdapter {
  private readonly modelId = "veo-3.0-generate-001";

  async start(request: any, jobId: string): Promise<StartResult> {
    // Validate with Zod schema
    const validated = Veo30Generate001RequestSchema.parse(request);

    // Set output storage URI
    const storageUri = ensureTrailingSlash(getJobStorageUri(jobId));

    // Update parameters with output location
    const parameters = {
      ...validated.parameters,
      storageUri,
    };

    logger.info("Starting Veo 3.0 generation via REST API", {
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
export default Veo30Generate001Adapter;
