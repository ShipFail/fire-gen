// functions/src/models/nano-banana/index.ts

export * from "./nano-banana.js";

import NanoBananaAdapter, {NANO_BANANA_CONFIG, NANO_BANANA_AI_HINT} from "./nano-banana.js";

/**
 * Nano Banana model registry (single model family).
 * Registry key must match actual REST API model name.
 */
export const NANO_BANANA_MODELS = {
  "gemini-2.5-flash-image": {
    adapter: NanoBananaAdapter,
    config: NANO_BANANA_CONFIG,
  },
} as const;

// Export AI hints for registry
export {NANO_BANANA_AI_HINT};
