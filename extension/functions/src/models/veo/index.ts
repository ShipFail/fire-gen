// functions/src/models/veo/index.ts

// Export all types and schemas
export * from "./shared.js";
export * from "./veo-3.0-generate-001.js";
export * from "./veo-3.0-fast-generate-001.js";
export * from "./veo-2.0-generate-001.js";
export {VEO_AI_HINTS} from "./ai-hints.js";

// Import for registry
import Veo30Generate001Adapter, {VEO_3_0_GENERATE_001_CONFIG} from "./veo-3.0-generate-001.js";
import Veo30FastGenerate001Adapter, {VEO_3_0_FAST_GENERATE_001_CONFIG} from "./veo-3.0-fast-generate-001.js";
import Veo20Generate001Adapter, {VEO_2_0_GENERATE_001_CONFIG} from "./veo-2.0-generate-001.js";

/**
 * Veo models registry.
 * Maps model IDs to their adapter classes and configs.
 */
export const VEO_MODELS = {
  "veo-3.0-generate-001": {
    adapter: Veo30Generate001Adapter,
    config: VEO_3_0_GENERATE_001_CONFIG,
  },
  "veo-3.0-fast-generate-001": {
    adapter: Veo30FastGenerate001Adapter,
    config: VEO_3_0_FAST_GENERATE_001_CONFIG,
  },
  "veo-2.0-generate-001": {
    adapter: Veo20Generate001Adapter,
    config: VEO_2_0_GENERATE_001_CONFIG,
  },
} as const;
