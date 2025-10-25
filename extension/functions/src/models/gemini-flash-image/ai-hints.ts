// functions/src/models/gemini-flash-image/ai-hints.ts

import {GEMINI_25_FLASH_IMAGE_AI_HINT} from "./gemini-2.5-flash-image.js";

/**
 * AI hints for Gemini Flash Image model - SINGLE EXPORT following AGENTS.md rule #7.
 */
export const GEMINI_FLASH_IMAGE_AI_HINTS = `
### IMAGE - Gemini 2.5 Flash Image (sync, instant generation, 1-3s)

**OUTPUT FORMAT - Vertex AI REST API Schema:**
\`\`\`json
{
  "model": "gemini-2.5-flash-image",
  "contents": [{
    "role": "user",
    "parts": [{"text": "A serene mountain landscape at sunset"}]
  }],
  "generationConfig": {
    "responseModalities": ["IMAGE"],
    "imageConfig": {
      "aspectRatio": "16:9" // optional
    }
  }
}
\`\`\`

Model Selection:
${GEMINI_25_FLASH_IMAGE_AI_HINT}

Parameters:
- aspectRatio: "1:1" | "2:3" | "3:2" | "9:16" | "16:9" | "3:4" | "4:3" (default: "1:1")
`;
