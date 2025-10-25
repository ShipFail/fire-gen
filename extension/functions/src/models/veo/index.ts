// functions/src/models/veo/index.ts

// Export shared utilities (only truly universal values)
export * from "./shared-schemas.js";
export * from "./shared-polling.js";

// Export all model-specific types and schemas
export * from "./veo-3.1-generate-preview.js";
export * from "./veo-3.1-fast-generate-preview.js";
export {VEO_AI_HINTS} from "./ai-hints.js";

// Import for registry
import Veo31GeneratePreviewAdapter, {VEO_3_1_GENERATE_PREVIEW_CONFIG} from "./veo-3.1-generate-preview.js";
import Veo31FastGeneratePreviewAdapter, {VEO_3_1_FAST_GENERATE_PREVIEW_CONFIG} from "./veo-3.1-fast-generate-preview.js";

/**
 * Veo models registry.
 * Maps model IDs to their adapter classes and configs.
 */
export const VEO_MODELS = {
  "veo-3.1-generate-preview": {
    adapter: Veo31GeneratePreviewAdapter,
    config: VEO_3_1_GENERATE_PREVIEW_CONFIG,
  },
  "veo-3.1-fast-generate-preview": {
    adapter: Veo31FastGeneratePreviewAdapter,
    config: VEO_3_1_FAST_GENERATE_PREVIEW_CONFIG,
  },
} as const;
