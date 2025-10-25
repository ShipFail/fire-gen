// functions/src/models/lyria/ai-hints.ts

import {LYRIA_002_AI_HINT} from "./lyria-002.js";

/**
 * AI hints for Lyria music generation model - SINGLE EXPORT following AGENTS.md rule #7.
 */
export const LYRIA_AI_HINTS = `
### AUDIO - Music Generation (async, 30-60s generation time)
${LYRIA_002_AI_HINT}

Music parameters:
- sample_count: 1 (default)
- negativePrompt: Optional (what to avoid in music)
- seed: Optional (for reproducibility)
`;
