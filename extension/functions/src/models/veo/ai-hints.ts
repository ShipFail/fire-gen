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

Veo 3.1 has THREE distinct creative capabilities:

**1. INGREDIENTS TO VIDEO (Multi-subject references)**
   * **referenceSubjectImages**: Array of up to 3 GCS URIs for character/object/scene references
   * **DETECTION RULES**:
     - Prompt contains multiple <GS_HTTPS_URI_REF_N/> placeholders (e.g., <GS_HTTPS_URI_REF_1/>, <GS_HTTPS_URI_REF_2/>)
     - OR: Single image reference WITHOUT animation keywords AND prompt says "this character", "this person", "show this", "featuring this"
   * **USAGE**: Include the field "referenceSubjectImages": ["<GS_HTTPS_URI_REF_1/>", "<GS_HTTPS_URI_REF_2/>"]
   * **IMPORTANT**: The placeholders are XML-style with angle brackets, NOT square brackets
   * Maximum 3 subject images allowed
   * Examples:
     - "video with <GS_HTTPS_URI_REF_1/> and <GS_HTTPS_URI_REF_2/>" → "referenceSubjectImages": ["<GS_HTTPS_URI_REF_1/>", "<GS_HTTPS_URI_REF_2/>"]
     - "show this character walking: <GS_HTTPS_URI_REF_1/>" → "referenceSubjectImages": ["<GS_HTTPS_URI_REF_1/>"]

**2. SCENE EXTENSION (Extend existing videos)**
   * **videoGcsUri**: GCS URI of video to extend
   * **CRITICAL**: Scene extension does NOT require any images - it automatically uses the last second of the video
   * **DETECTION**: If prompt contains "extend video", "continue video", "part 2", "keep going", or similar language with a video reference
   * **USAGE**: Include ONLY the field "videoGcsUri": "<GS_HTTPS_URI_REF_1/>"
   * **DO NOT** include imageGcsUri or lastFrameGcsUri for scene extension
   * Examples:
     - "continue this video: <GS_HTTPS_URI_REF_1/>" → "videoGcsUri": "<GS_HTTPS_URI_REF_1/>"
     - "extend this clip for 6 more seconds: <GS_HTTPS_URI_REF_1/>" → "videoGcsUri": "<GS_HTTPS_URI_REF_1/>", "duration": 6
     - "create part 2 of <GS_HTTPS_URI_REF_1/>" → "videoGcsUri": "<GS_HTTPS_URI_REF_1/>"

**3. FIRST AND LAST FRAME (Image-to-image transitions)**
   * **imageGcsUri** + **lastFrameGcsUri**: Bridge two images with smooth transition
   * **DETECTION**: 
     - Prompt explicitly mentions "from [image1] to [image2]", "transition between", "bridge these images"
     - OR: Two image references with transition language
   * **USAGE**: Include both fields: "imageGcsUri": "<GS_HTTPS_URI_REF_1/>", "lastFrameGcsUri": "<GS_HTTPS_URI_REF_2/>"
   * Examples:
     - "create transition from <GS_HTTPS_URI_REF_1/> to <GS_HTTPS_URI_REF_2/>" → "imageGcsUri": "<GS_HTTPS_URI_REF_1/>", "lastFrameGcsUri": "<GS_HTTPS_URI_REF_2/>"
     - "animate from this frame <GS_HTTPS_URI_REF_1/> to this frame <GS_HTTPS_URI_REF_2/>" → "imageGcsUri": "<GS_HTTPS_URI_REF_1/>", "lastFrameGcsUri": "<GS_HTTPS_URI_REF_2/>"

**BASIC IMAGE-TO-VIDEO (Single image animation)**
   * **imageGcsUri**: Single image to animate (WITHOUT lastFrameGcsUri)
   * **DETECTION RULES** (Check these BEFORE considering referenceSubjectImages):
     - Prompt contains words like: "animate", "bring to life", "make this photo move", "add motion to", "make move", "come alive"
     - OR: Prompt has a single image URL reference with animation intent
   * **USAGE**: Extract the image URL and include field "imageGcsUri": "<GS_HTTPS_URI_REF_1/>"
   * Examples:
     - "animate this image: <GS_HTTPS_URI_REF_1/>" → "imageGcsUri": "<GS_HTTPS_URI_REF_1/>"
     - "make this photo come alive: <GS_HTTPS_URI_REF_1/>" → "imageGcsUri": "<GS_HTTPS_URI_REF_1/>"

**NEGATIVE PROMPTS (All Veo 3.1 modes)**
   * **negativePrompt**: String describing what NOT to include in the video
   * **DETECTION**: Look for these indicators (Extract ALL negative elements, not just some):
     - Explicit negative markers: "Negative:", "avoid:", "without:", "exclude:", "don't include:"
     - Semantic negation: "no [element]", "remove [element]", "never show [element]"
     - Quality negations: "no blur", "no distortion", "no watermark"
   * **USAGE**: Include the field "negativePrompt": "extracted negative elements"
   * **IMPORTANT**: 
     - Extract ALL negative content, not just the first few items
     - Remove markers like "Negative:" or "avoid:" from the actual negative prompt value
     - Keep comma-separated format when multiple items are listed
   * Examples:
     - "beautiful sunset. Negative: blur, watermark" → "negativePrompt": "blur, watermark"
     - "zen garden. Negative: people, modern architecture, urban background, stormy" → "negativePrompt": "people, modern architecture, urban background, stormy"

**IMPORTANT**: DO NOT include these deprecated parameters:
- resolution - This field was removed in Veo 3.1
- referenceImageGcsUri - Replaced by referenceSubjectImages array in Veo 3.1
`;
