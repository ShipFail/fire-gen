// functions/src/models/veo/index.ts

// Only export what's needed by models/index.ts (parent module)
// Keep all schemas, types, and implementation details private to this module
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
