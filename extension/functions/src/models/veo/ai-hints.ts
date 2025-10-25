// functions/src/models/veo/ai-hints.ts

import {VEO_3_1_GENERATE_PREVIEW_AI_HINT} from "./veo-3.1-generate-preview.js";
import {VEO_3_1_FAST_GENERATE_PREVIEW_AI_HINT} from "./veo-3.1-fast-generate-preview.js";

/**
 * Assembled AI hints for Veo models available to AI request analyzer.
 *
 * IMPORTANT: Only Veo 3.1 models are included here.
 * Veo 3.0 and 2.0 models are supported for implicit requests only and are NOT
 * available to the AI analyzer.
 */
export const VEO_AI_HINTS = `
### VIDEO (async, requires polling, 30-120s generation time)
**IMPORTANT: DEFAULT VIDEO MODEL IS veo-3.1-fast-generate-preview - use this unless explicitly stated otherwise**

${VEO_3_1_FAST_GENERATE_PREVIEW_AI_HINT}
${VEO_3_1_GENERATE_PREVIEW_AI_HINT}

Video parameters (STRICT - ONLY USE THESE VALUES):
- duration: **MUST be 4, 6, or 8 seconds ONLY** (default: 8) - DO NOT use 10 or any other value
- aspectRatio: **MUST be one of**: "16:9" (landscape, default), "9:16" (portrait/vertical), "1:1" (square), "21:9" (ultra-wide), "3:4", "4:3"
- audio: true (default, include audio) or false (silent)

**Veo 3.1 FEATURES** (available for veo-3.1-generate-preview and veo-3.1-fast-generate-preview):
- referenceSubjectImages: Array of up to 3 GCS URIs for multi-subject image references
  * **DETECTION**: If prompt contains multiple <GS_HTTPS_URI_REF_N/> placeholders (e.g., <GS_HTTPS_URI_REF_1/>, <GS_HTTPS_URI_REF_2/>)
  * **USAGE**: Include the field "referenceSubjectImages": ["<GS_HTTPS_URI_REF_1/>", "<GS_HTTPS_URI_REF_2/>"]
  * **IMPORTANT**: The placeholders are XML-style with angle brackets, NOT square brackets
  * Maximum 3 subject images allowed
  * Example: "video with <GS_HTTPS_URI_REF_1/> and <GS_HTTPS_URI_REF_2/>" → "referenceSubjectImages": ["<GS_HTTPS_URI_REF_1/>", "<GS_HTTPS_URI_REF_2/>"]

- videoGcsUri: GCS URI for video extension mode (extend an existing video)
  * **DETECTION**: If prompt contains "extend video", "continue video", or similar language with a video reference
  * **USAGE**: Include the field "videoGcsUri": "<GS_HTTPS_URI_REF_1/>"
  * Use when user wants to extend/continue an existing video clip

- lastFrameGcsUri: GCS URI for frame-specific generation
  * **DETECTION**: If prompt mentions "from this frame", "starting from frame", or frame-based generation
  * **USAGE**: Include the field "lastFrameGcsUri": "<GS_HTTPS_URI_REF_1/>"
  * Use when user wants to generate video starting from a specific frame

**IMPORTANT**: DO NOT include these deprecated parameters:
- resolution - This field was removed in Veo 3.1
- referenceImageGcsUri - Replaced by referenceSubjectImages array in Veo 3.1
`;
