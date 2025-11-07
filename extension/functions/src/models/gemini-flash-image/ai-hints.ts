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

**REFERENCE IMAGES - Use fileData parts for image references:**
- When user provides image URLs/URIs, add fileData parts alongside text prompt
- Each fileData part needs: mimeType (automatically inferred during URL preprocessing) + fileUri (gs:// URI)
- Examples: "merge these images", "combine X and Y", "blend", "mix", "use this as reference"
- Parts array format: [{"text": "prompt"}, {"fileData": {mimeType, fileUri}}, ...]

**PARTS ARRAY FORMAT:**
1. Order matters — process parts sequentially.  
2. For edits: [image, text] or [text, image].  
3. For fusion: [text, ref image 1, ref image 2, ...].  
4. No empty or unrelated parts.  
5. In text, label images when helpful (first, second, etc.).

Model Selection:
${GEMINI_25_FLASH_IMAGE_AI_HINT}
`;
