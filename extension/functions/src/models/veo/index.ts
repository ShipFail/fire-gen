// functions/src/models/veo/index.ts

// Export shared utilities (only truly universal functions)
export {pollVeoOperation, extractVeoOutput} from "./shared-polling.js";

// Export all model-specific types and schemas
export {
  Veo31GeneratePreviewRequestSchema,
  Veo31GeneratePreviewResponseSchema,
  type Veo31GeneratePreviewRequest,
  type Veo31GeneratePreviewResponse,
  VEO_3_1_GENERATE_PREVIEW_AI_HINT,
  Veo31GeneratePreviewAdapter,
} from "./veo-3.1-generate-preview.js";
export {
  Veo31FastGeneratePreviewRequestSchema,
  Veo31FastGeneratePreviewResponseSchema,
  type Veo31FastGeneratePreviewRequest,
  type Veo31FastGeneratePreviewResponse,
  VEO_3_1_FAST_GENERATE_PREVIEW_AI_HINT,
  Veo31FastGeneratePreviewAdapter,
} from "./veo-3.1-fast-generate-preview.js";
export {VEO_AI_HINTS} from "./ai-hints.js";

// Import for registry
import Veo31GeneratePreviewAdapter from "./veo-3.1-generate-preview.js";
import Veo31FastGeneratePreviewAdapter from "./veo-3.1-fast-generate-preview.js";

/**
 * Veo models registry.
 * Maps model IDs to their adapter classes.
 */
export const VEO_MODELS = {
  "veo-3.1-generate-preview": Veo31GeneratePreviewAdapter,
  "veo-3.1-fast-generate-preview": Veo31FastGeneratePreviewAdapter,
} as const;
