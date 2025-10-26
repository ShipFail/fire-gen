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

**OUTPUT FORMAT - Vertex AI REST API Schema (auto-generated from Zod):**
\`\`\`json
${zodToJsonExample(Veo31FastGeneratePreviewRequestSchema)}
\`\`\`

URI Placeholders:
- Format: <VIDEO_URI_N/>, <IMAGE_URI_N/>, <AUDIO_URI_N/>
- Copy full XML tag to gcsUri field
- Remove URIs from prompt after extracting

Model Selection (check quality keywords first):
${VEO_3_1_GENERATE_PREVIEW_AI_HINT}
${VEO_3_1_FAST_GENERATE_PREVIEW_AI_HINT}
`;
