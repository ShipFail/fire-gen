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
### VIDEO (async, 30-120s generation time)

**OUTPUT FORMAT - Vertex AI REST API Schema:**
\`\`\`json
{
  "model": "veo-3.1-fast-generate-preview",
  "instances": [{
    "prompt": "...",
    "image": {"gcsUri": "gs://..."} // optional
    "video": {"gcsUri": "gs://..."} // optional
    "lastFrame": {"gcsUri": "gs://..."} // optional
    "referenceImages": [{"image": {"gcsUri": "gs://..."}, "referenceType": "ASSET"}] // optional
  }],
  "parameters": {
    "durationSeconds": 4 | 6 | 8,
    "aspectRatio": "16:9" | "9:16" | "1:1" | "21:9" | "3:4" | "4:3",
    "generateAudio": true | false,
    "negativePrompt": "...", // optional
    "seed": 123, // optional
    "enhancePrompt": true, // optional
    "personGeneration": "allow_adult" | "dont_allow", // optional
    "compressionQuality": "OPTIMIZED" | "LOSSLESS" // optional
  }
}
\`\`\`

URI Placeholders:
- Format: <VIDEO_URI_N/>, <IMAGE_URI_N/>, <AUDIO_URI_N/>
- Copy full XML tag to gcsUri field
- Remove URIs from prompt after extracting

Model Selection (check quality keywords first):
${VEO_3_1_GENERATE_PREVIEW_AI_HINT}
${VEO_3_1_FAST_GENERATE_PREVIEW_AI_HINT}
`;
