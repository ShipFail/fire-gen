// functions/src/models/veo/ai-hints.ts

import {VEO_3_0_GENERATE_001_AI_HINT} from "./veo-3.0-generate-001.js";
import {VEO_3_0_FAST_GENERATE_001_AI_HINT} from "./veo-3.0-fast-generate-001.js";
import {VEO_2_0_GENERATE_001_AI_HINT} from "./veo-2.0-generate-001.js";

/**
 * Assembled AI hints for all Veo models.
 * Used by AI request analyzer to choose the right model.
 */
export const VEO_AI_HINTS = `
### VIDEO (async, requires polling, 30-120s generation time)
**IMPORTANT: DEFAULT VIDEO MODEL IS veo-3.0-fast-generate-001 - use this unless explicitly stated otherwise**

${VEO_3_0_FAST_GENERATE_001_AI_HINT}
${VEO_3_0_GENERATE_001_AI_HINT}
${VEO_2_0_GENERATE_001_AI_HINT}

Video parameters (STRICT - ONLY USE THESE VALUES):
- duration: **MUST be 4, 6, or 8 seconds ONLY** (default: 8) - DO NOT use 10 or any other value
- aspectRatio: **MUST be one of**: "16:9" (landscape, default), "9:16" (portrait/vertical), "1:1" (square), "21:9" (ultra-wide), "3:4", "4:3"
- resolution: **MUST be**: "1080p" (default) or "720p" ONLY
- audio: true (default, include audio) or false (silent)
- referenceImageGcsUri: **CRITICAL** - for image-to-video generation ONLY
  * **DETECTION**: If prompt contains <GS_HTTPS_URI_REF_1/>, <GS_HTTPS_URI_REF_2/>, etc - this indicates image-to-video request
  * **USAGE**: Include the field "referenceImageGcsUri": "<GS_HTTPS_URI_REF_1/>" (use placeholder EXACTLY as-is)
  * **IMPORTANT**: The placeholder is XML-style with angle brackets, NOT square brackets
  * The placeholder represents the complete gs:// or https:// URI - do NOT modify or add prefixes
  * Example: If prompt is "a video of <GS_HTTPS_URI_REF_1/>" → add "referenceImageGcsUri": "<GS_HTTPS_URI_REF_1/>"
`;
