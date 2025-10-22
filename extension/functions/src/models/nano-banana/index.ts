// functions/src/models/nano-banana/index.ts

export * from "./nano-banana.js";

import NanoBananaAdapter, {NANO_BANANA_CONFIG, NANO_BANANA_AI_HINT} from "./nano-banana.js";

/**
 * Nano Banana model registry (single model family).
 */
export const NANO_BANANA_MODELS = {
  "nano-banana": {
    adapter: NanoBananaAdapter,
    config: NANO_BANANA_CONFIG,
  },
} as const;

// Export AI hints for registry
export {NANO_BANANA_AI_HINT};
