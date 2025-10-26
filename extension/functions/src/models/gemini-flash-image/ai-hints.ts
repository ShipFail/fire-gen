// functions/src/models/gemini-flash-image/ai-hints.ts

import {GEMINI_25_FLASH_IMAGE_AI_HINT} from "./gemini-2.5-flash-image.js";
import {zodToJsonExample} from "../_shared/zod-helpers.js";
import {Gemini25FlashImageRequestSchema} from "./gemini-2.5-flash-image.js";

/**
 * AI hints for Gemini Flash Image model - SINGLE EXPORT following AGENTS.md rule #7.
 */
export const GEMINI_FLASH_IMAGE_AI_HINTS = `
### IMAGE - Gemini 2.5 Flash Image (sync, instant generation, 1-3s)

**OUTPUT FORMAT - Vertex AI REST API Schema (auto-generated from Zod):**
\`\`\`json
${zodToJsonExample(Gemini25FlashImageRequestSchema)}
\`\`\`

Model Selection:
${GEMINI_25_FLASH_IMAGE_AI_HINT}
`;
