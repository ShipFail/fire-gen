// functions/src/models/gemini-flash-image/ai-hints.ts

import { GEMINI_25_FLASH_IMAGE_AI_HINT } from "./gemini-2.5-flash-image.js";
import { zodToJsonExample } from "../../lib/zod-utils.js";
import { Gemini25FlashImageRequestSchema } from "./gemini-2.5-flash-image.js";

/**
 * AI hints for Gemini Flash Image model - SINGLE EXPORT following AGENTS.md rule #7.
 */
export const GEMINI_FLASH_IMAGE_AI_HINTS = `
### IMAGE - Gemini 2.5 Flash Image
**OUTPUT FORMAT - Vertex AI REST API Schema (auto-generated from Zod):**
\`\`\`json
${zodToJsonExample(Gemini25FlashImageRequestSchema)}
\`\`\`

**PARTS ARRAY FORMAT:**
1. Order matters — process parts sequentially.  
2. For edits: [image, text].  
3. For fusion: [base image, text, ref images].  
4. No empty or unrelated parts.  
5. In text, label images (first, second, etc.).

Model Selection:
${GEMINI_25_FLASH_IMAGE_AI_HINT}
`;
