// functions/src/models/imagen/index.ts

// Export all types and schemas
export * from "./shared.js";
export * from "./imagen-4.0-generate-001.js";
export * from "./imagen-4.0-fast-generate-001.js";
export * from "./imagen-4.0-ultra-generate-001.js";
export {IMAGEN_AI_HINTS} from "./ai-hints.js";

// Import for registry
import Imagen40Generate001Adapter, {IMAGEN_4_0_GENERATE_001_CONFIG} from "./imagen-4.0-generate-001.js";
import Imagen40FastGenerate001Adapter, {IMAGEN_4_0_FAST_GENERATE_001_CONFIG} from "./imagen-4.0-fast-generate-001.js";
import Imagen40UltraGenerate001Adapter, {IMAGEN_4_0_ULTRA_GENERATE_001_CONFIG} from "./imagen-4.0-ultra-generate-001.js";

/**
 * Imagen models registry.
 * Only Imagen 4.0 models supported (3.0 removed - 4.0 is superior in all aspects).
 */
export const IMAGEN_MODELS = {
  "imagen-4.0-generate-001": {
    adapter: Imagen40Generate001Adapter,
    config: IMAGEN_4_0_GENERATE_001_CONFIG,
  },
  "imagen-4.0-fast-generate-001": {
    adapter: Imagen40FastGenerate001Adapter,
    config: IMAGEN_4_0_FAST_GENERATE_001_CONFIG,
  },
  "imagen-4.0-ultra-generate-001": {
    adapter: Imagen40UltraGenerate001Adapter,
    config: IMAGEN_4_0_ULTRA_GENERATE_001_CONFIG,
  },
} as const;
