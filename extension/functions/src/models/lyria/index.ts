// functions/src/models/lyria/index.ts

export * from "./lyria-002.js";

import Lyria002Adapter, {LYRIA_002_CONFIG, LYRIA_002_AI_HINT} from "./lyria-002.js";

export const LYRIA_MODELS = {
  "lyria-002": {
    adapter: Lyria002Adapter,
    config: LYRIA_002_CONFIG,
  },
} as const;

// Export AI hints
export const LYRIA_AI_HINTS = `
### AUDIO - Music (sync, 10-20s, 32.8s clips)
${LYRIA_002_AI_HINT}

Music parameters:
- prompt: Music description (style, mood, instruments)
- negativePrompt: Optional (terms to exclude, e.g., "vocals, singing" - already default)
- seed: Optional (for reproducible generation)
`;
