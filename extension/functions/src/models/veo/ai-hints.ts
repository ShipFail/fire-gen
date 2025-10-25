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

1. **imageGcsUri**: Base image for image-to-video generation
   * **DETECTION RULES** (CRITICAL - Check these first before considering referenceSubjectImages):
     - Prompt contains words like: "animate", "bring to life", "make this photo move", "add motion to", "make move", "come alive"
     - OR: Prompt has a single image URL reference
     - OR: User wants to add movement/animation to a static image
   * **USAGE**: Extract the image URL and include field "imageGcsUri": "<GS_HTTPS_URI_REF_1/>"
   * **When to use imageGcsUri vs referenceSubjectImages**:
     - Use imageGcsUri when: User wants to ANIMATE an existing image (add motion to it)
     - Use referenceSubjectImages when: User wants to CREATE new video using image(s) as reference for objects/people
   * Examples:
     - "animate this image: <GS_HTTPS_URI_REF_1/>" → "imageGcsUri": "<GS_HTTPS_URI_REF_1/>"
     - "make this photo come alive: <GS_HTTPS_URI_REF_1/>" → "imageGcsUri": "<GS_HTTPS_URI_REF_1/>"
     - "bring this image to life: <GS_HTTPS_URI_REF_1/>" → "imageGcsUri": "<GS_HTTPS_URI_REF_1/>"

2. **referenceSubjectImages**: Array of up to 3 GCS URIs for multi-subject image references
   * **DETECTION RULES**:
     - Prompt contains multiple <GS_HTTPS_URI_REF_N/> placeholders (e.g., <GS_HTTPS_URI_REF_1/>, <GS_HTTPS_URI_REF_2/>)
     - OR: Single image reference WITHOUT animation keywords AND prompt says "this character", "this person", "show this", "featuring this"
   * **USAGE**: Include the field "referenceSubjectImages": ["<GS_HTTPS_URI_REF_1/>", "<GS_HTTPS_URI_REF_2/>"]
   * **IMPORTANT**: The placeholders are XML-style with angle brackets, NOT square brackets
   * Maximum 3 subject images allowed
   * Examples:
     - "video with <GS_HTTPS_URI_REF_1/> and <GS_HTTPS_URI_REF_2/>" → "referenceSubjectImages": ["<GS_HTTPS_URI_REF_1/>", "<GS_HTTPS_URI_REF_2/>"]
     - "show this character walking: <GS_HTTPS_URI_REF_1/>" → "referenceSubjectImages": ["<GS_HTTPS_URI_REF_1/>"]
     - "create video with this person: <GS_HTTPS_URI_REF_1/>" → "referenceSubjectImages": ["<GS_HTTPS_URI_REF_1/>"]

3. **videoGcsUri**: GCS URI for video extension mode (extend an existing video)
   * **DETECTION**: If prompt contains "extend video", "continue video", "part 2", or similar language with a video reference
   * **USAGE**: Include the field "videoGcsUri": "<GS_HTTPS_URI_REF_1/>"
   * **IMPORTANT**: When videoGcsUri is present, also check if lastFrameGcsUri should be set (see rule 4)
   * Example: "extend this video: <GS_HTTPS_URI_REF_1/>" → "videoGcsUri": "<GS_HTTPS_URI_REF_1/>"

4. **lastFrameGcsUri**: GCS URI for frame-specific generation OR null for auto-extraction
   * **DETECTION RULES**:
     - If videoGcsUri is present AND user doesn't specify a specific frame → Set to null
     - If prompt mentions "from this frame", "starting from frame" with explicit frame reference → Use the frame URI
   * **USAGE**:
     - Auto-extract: "lastFrameGcsUri": null
     - Specific frame: "lastFrameGcsUri": "<GS_HTTPS_URI_REF_2/>"
   * **IMPORTANT**: Only use null when videoGcsUri is also present for video extension
   * Examples:
     - "continue this video: <GS_HTTPS_URI_REF_1/>" → "videoGcsUri": "<GS_HTTPS_URI_REF_1/>", "lastFrameGcsUri": null
     - "extend from this frame: <GS_HTTPS_URI_REF_1/>" → "lastFrameGcsUri": "<GS_HTTPS_URI_REF_1/>"

5. **negativePrompt**: String describing what NOT to include in the video
   * **DETECTION**: Look for these indicators (CRITICAL - Extract ALL negative elements, not just some):
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
     - "cat playing, avoid blurriness and distortion" → "negativePrompt": "blurriness and distortion"
     - "dog running, without collar, no leash" → "negativePrompt": "collar, leash"
     - "forest scene, never show animals" → "negativePrompt": "animals"
     - "city street, exclude people and cars" → "negativePrompt": "people and cars"
     - "zen garden. Negative: people, modern architecture, urban background, stormy" → "negativePrompt": "people, modern architecture, urban background, stormy"

**IMPORTANT**: DO NOT include these deprecated parameters:
- resolution - This field was removed in Veo 3.1
- referenceImageGcsUri - Replaced by referenceSubjectImages array in Veo 3.1
`;
