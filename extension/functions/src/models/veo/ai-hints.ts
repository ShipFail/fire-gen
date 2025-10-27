// functions/src/models/veo/ai-hints.ts

import {VEO_3_1_GENERATE_PREVIEW_AI_HINT} from "./veo-3.1-generate-preview.js";
import {VEO_3_1_FAST_GENERATE_PREVIEW_AI_HINT} from "./veo-3.1-fast-generate-preview.js";
import {zodToJsonExample} from "../../lib/zod-utils.js";
import {Veo31FastGeneratePreviewRequestSchema} from "./veo-3.1-fast-generate-preview.js";

/**
 * AI hints for Veo models - SINGLE EXPORT following AGENTS.md rule #7.
 *
 * IMPORTANT: Only Veo 3.1 models are included here.
 * Veo 3.0 and 2.0 models are supported for implicit requests only and are NOT
 * available to the AI analyzer.
 */
export const VEO_AI_HINTS = `
### VIDEO (async, 30-120s generation time)

**OUTPUT FORMAT - Vertex AI REST API Schema (auto-generated from Zod with descriptions):**
\`\`\`json
${zodToJsonExample(Veo31FastGeneratePreviewRequestSchema)}
\`\`\`

**Semantic Field Mapping (how user language maps to schema fields):**

| User says... | Schema field | Example |
|--------------|--------------|---------|
| "First frame: URL" | instances[0].image.gcsUri | "First frame: gs://bucket/start.jpg" → image field |
| "Last frame: URL" | instances[0].lastFrame.gcsUri | "Last frame: gs://bucket/end.jpg" → lastFrame field |
| "Animate this image URL" | instances[0].image.gcsUri | "Animate gs://bucket/photo.jpg" → image field |
| "Continue/Extend video URL" | instances[0].video.gcsUri | "Extend gs://bucket/clip.mp4" → video field |
| "Show these subjects URL1 URL2" | instances[0].referenceImages[].image.gcsUri | "Show these products gs://p1.jpg gs://p2.jpg" → referenceImages |

**Critical Rules:**
- URI Placeholders: Use FIREGEN_ prefix format: <FIREGEN_IMAGE_URI_1/>, <FIREGEN_VIDEO_URI_2/>, etc.
- Extract URLs from prompt to appropriate fields (see semantic mapping above)
- Prompt field should describe scene/action WITHOUT URLs
- referenceImages is for subjects/styles ONLY, NOT for first/last frames

Model Selection (check quality keywords first):
${VEO_3_1_GENERATE_PREVIEW_AI_HINT}
${VEO_3_1_FAST_GENERATE_PREVIEW_AI_HINT}
`;
