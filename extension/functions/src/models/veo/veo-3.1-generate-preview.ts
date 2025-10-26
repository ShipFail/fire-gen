// functions/src/models/veo/veo-3.1-generate-preview.ts
import * as logger from "firebase-functions/logger";

import {predictLongRunning} from "../_shared/vertex-ai-client.js";
import {getJobStorageUri} from "../../storage.js";
import {ensureTrailingSlash} from "../../util.js";
import type {ModelAdapter, StartResult, ModelOutput} from "../_shared/base.js";
import type {OperationResult} from "../../poller.js";
import {pollVeoOperation, extractVeoOutput} from "./shared-polling.js";
import {
  Veo31GeneratePreviewRequestSchema,
  Veo31GeneratePreviewResponseSchema,
  type Veo31GeneratePreviewRequest,
  type Veo31GeneratePreviewResponse,
} from "./veo-3.1-generate-preview.schema.js";

// ============= RE-EXPORTS =============
export {
  Veo31GeneratePreviewRequestSchema,
  Veo31GeneratePreviewResponseSchema,
  type Veo31GeneratePreviewRequest,
  type Veo31GeneratePreviewResponse,
};

// ============= CONSTANTS =============
export const VEO_3_1_GENERATE_PREVIEW_CONFIG = {
  modelId: "veo-3.1-generate-preview" as const,
  displayName: "Veo 3.1 (Highest Quality)",
  category: "video" as const,
  isAsync: true,
  generationTime: "60-120s",
  schema: Veo31GeneratePreviewRequestSchema,
} as const;

// ============= AI HINT =============
export const VEO_3_1_GENERATE_PREVIEW_AI_HINT = `
- veo-3.1-generate-preview (high quality, 60-120s generation)

  Capabilities: Same as veo-3.1-fast-generate-preview plus:
  1. Better quality output for professional/cinematic use
  2. Longer generation time but higher fidelity
  3. All same features: referenceImages, video input, frame transitions, etc.

  Use when: Prompt contains "high quality", "best quality", "cinematic", "professional"
`;

// ============= ADAPTER (Standalone - No Inheritance) =============
export class Veo31GeneratePreviewAdapter implements ModelAdapter {
  private readonly modelId = "veo-3.1-generate-preview";

  async start(request: any, jobId: string): Promise<StartResult> {
    // Validate with Zod schema
    const validated = Veo31GeneratePreviewRequestSchema.parse(request);

    // Set output storage URI
    const storageUri = ensureTrailingSlash(getJobStorageUri(jobId));

    // Update parameters with output location
    const parameters = {
      ...validated.parameters,
      storageUri,
    };

    logger.info("Starting Veo 3.1 generation via REST API", {
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
export default Veo31GeneratePreviewAdapter;

