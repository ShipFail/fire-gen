// functions/src/models/gemini-flash-image/ai-hints.ts

import {GEMINI_25_FLASH_IMAGE_AI_HINT} from "./gemini-2.5-flash-image.js";
import {zodToJsonExample} from "../../lib/zod-utils.js";
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

**REFERENCE IMAGES - Use fileData parts for image references:**
- When user provides image URLs/URIs, add fileData parts alongside text prompt
- Each fileData part needs: mimeType (infer from file extension) + fileUri (gs:// URI)
- Examples: "merge these images", "combine X and Y", "blend", "mix", "use this as reference"
- Parts array format: [{"text": "prompt"}, {"fileData": {mimeType, fileUri}}, ...]

Model Selection:
${GEMINI_25_FLASH_IMAGE_AI_HINT}
`;
