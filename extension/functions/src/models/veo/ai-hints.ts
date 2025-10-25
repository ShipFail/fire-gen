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

**CRITICAL: URI Placeholder Format**
User prompts contain URI placeholders as semantic XML tags:
- <VIDEO_URI_N/> for video files
- <IMAGE_URI_N/> for image files
- <AUDIO_URI_N/> for audio files

**URI Handling Rules:**
1. **Tags are self-describing** - the tag name indicates the file type
2. **Copy the FULL XML tag exactly** to the appropriate request field
3. **Remove from prompt** if used in a request parameter field
4. **Keep in prompt** if NOT used in any parameter field

**Example:**
Input: "Continue from <VIDEO_URI_1/> with hero finding treasure"
Output: {
  "videoGcsUri": "<VIDEO_URI_1/>",  // Used - copy tag
  "prompt": "Continue with hero finding treasure"  // Removed from prompt
}

**Example (unused URI):**
Input: "Show character finding sword <IMAGE_URI_2/> in temple"
Output: {
  "prompt": "Show character finding sword <IMAGE_URI_2/> in temple"  // Kept - not used
}

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
     - Prompt contains multiple <IMAGE_URI_N/> placeholders (e.g., <IMAGE_URI_1/>, <IMAGE_URI_2/>)
     - OR: Single image reference WITHOUT animation keywords AND prompt says "this character", "this person", "show this", "featuring this"
   * **USAGE**: Include the field "referenceSubjectImages": ["<IMAGE_URI_1/>", "<IMAGE_URI_2/>"]
   * **IMPORTANT**: The placeholders are XML-style with angle brackets, NOT square brackets
   * Maximum 3 subject images allowed
   * Examples:
     - "video with <IMAGE_URI_1/> and <IMAGE_URI_2/>" → "referenceSubjectImages": ["<IMAGE_URI_1/>", "<IMAGE_URI_2/>"]
     - "show this character walking: <IMAGE_URI_1/>" → "referenceSubjectImages": ["<IMAGE_URI_1/>"]

**2. SCENE EXTENSION (Extend existing videos)**
   * **videoGcsUri**: GCS URI of video to extend
   * **CRITICAL**: Scene extension does NOT require any images - it automatically uses the last second of the video
   * **DETECTION**: If prompt contains "extend video", "continue video", "part 2", "keep going", or similar language with a video reference
   * **USAGE**: Include ONLY the field "videoGcsUri": "<VIDEO_URI_1/>"
   * **DO NOT** include imageGcsUri or lastFrameGcsUri for scene extension
   * Examples:
     - "continue this video: <VIDEO_URI_1/>" → "videoGcsUri": "<VIDEO_URI_1/>"
     - "extend this clip for 6 more seconds: <VIDEO_URI_1/>" → "videoGcsUri": "<VIDEO_URI_1/>", "duration": 6
     - "create part 2 of <VIDEO_URI_1/>" → "videoGcsUri": "<VIDEO_URI_1/>"

**3. FIRST AND LAST FRAME (Image-to-image transitions)**
   * **imageGcsUri** + **lastFrameGcsUri**: Bridge two images with smooth transition
   * **DETECTION**:
     - Prompt explicitly mentions "from [image1] to [image2]", "transition between", "bridge these images"
     - OR: Two image references with transition language
   * **USAGE**: Include both fields: "imageGcsUri": "<IMAGE_URI_1/>", "lastFrameGcsUri": "<IMAGE_URI_2/>"
   * Examples:
     - "create transition from <IMAGE_URI_1/> to <IMAGE_URI_2/>" → "imageGcsUri": "<IMAGE_URI_1/>", "lastFrameGcsUri": "<IMAGE_URI_2/>"
     - "animate from this frame <IMAGE_URI_1/> to this frame <IMAGE_URI_2/>" → "imageGcsUri": "<IMAGE_URI_1/>", "lastFrameGcsUri": "<IMAGE_URI_2/>"

**BASIC IMAGE-TO-VIDEO (Single image animation)**
   * **imageGcsUri**: Single image to animate (WITHOUT lastFrameGcsUri)
   * **DETECTION RULES** (Check these BEFORE considering referenceSubjectImages):
     - Prompt contains words like: "animate", "bring to life", "make this photo move", "add motion to", "make move", "come alive"
     - OR: Prompt has a single image URL reference with animation intent
   * **USAGE**: Extract the image URL and include field "imageGcsUri": "<IMAGE_URI_1/>"
   * Examples:
     - "animate this image: <IMAGE_URI_1/>" → "imageGcsUri": "<IMAGE_URI_1/>"
     - "make this photo come alive: <IMAGE_URI_1/>" → "imageGcsUri": "<IMAGE_URI_1/>"

**NEGATIVE PROMPTS (All Veo 3.1 modes)**
   * **negativePrompt**: String (NOT array) describing what NOT to include in the video
   * **SCHEMA**: Single string field - if input has array like ["item1", "item2"], join into "item1, item2"
   * **DETECTION**: Look for these indicators (Extract ALL negative elements, not just some):
     - Explicit negative markers: "Negative:", "negative_prompts:", "avoid:", "without:", "exclude:", "don't include:"
     - Array format: negative_prompts: ["item1", "item2"] or ["no item1", "no item2"]
     - Semantic negation: "no [element]", "remove [element]", "never show [element]"
     - Quality negations: "no blur", "no distortion", "no watermark"
   * **USAGE**: Include the field "negativePrompt": "extracted negative elements"
   * **IMPORTANT**:
     - Extract ALL negative content, not just the first few items
     - Remove markers like "Negative:", "avoid:", "negative_prompts:" from the actual value
     - Strip "no" prefix per Veo best practices: "no blur" → "blur"
     - Convert arrays to comma-separated string: ["people", "buildings"] → "people, buildings"
     - Keep comma-separated format when multiple items are listed
   * Examples:
     - "beautiful sunset. Negative: blur, watermark" → "negativePrompt": "blur, watermark"
     - "negative_prompts: [\"no text\", \"no logos\"]" → "negativePrompt": "text, logos"
     - "Avoid: people, cars. Don't include: buildings" → "negativePrompt": "people, cars, buildings"
     - "zen garden. Negative: people, modern architecture, urban background, stormy" → "negativePrompt": "people, modern architecture, urban background, stormy"

**IMPORTANT**: DO NOT include these deprecated parameters:
- resolution - This field was removed in Veo 3.1
- referenceImageGcsUri - Replaced by referenceSubjectImages array in Veo 3.1
`;
