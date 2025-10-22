// functions/src/models/imagen/ai-hints.ts

import {IMAGEN_4_0_GENERATE_001_AI_HINT} from "./imagen-4.0-generate-001.js";
import {IMAGEN_4_0_FAST_GENERATE_001_AI_HINT} from "./imagen-4.0-fast-generate-001.js";
import {IMAGEN_4_0_ULTRA_GENERATE_001_AI_HINT} from "./imagen-4.0-ultra-generate-001.js";

/**
 * Assembled AI hints for all Imagen models.
 * Used by AI request analyzer to choose the right model.
 * Only Imagen 4.0 models supported (3.0 removed - superior quality, 2K resolution, better text rendering).
 */
export const IMAGEN_AI_HINTS = `
### IMAGE - Imagen 4.0 (sync, instant generation, 2-8s)
${IMAGEN_4_0_GENERATE_001_AI_HINT}
${IMAGEN_4_0_FAST_GENERATE_001_AI_HINT}
${IMAGEN_4_0_ULTRA_GENERATE_001_AI_HINT}

Image parameters:
- aspectRatio: **CRITICAL - Always extract if orientation is mentioned**
  * Defaults: "1:1" (square, default if no orientation specified)
  * Portrait/Vertical (taller than wide): "2:3" (standard portrait), "9:16" (phone vertical), "3:4", "4:5"
  * Landscape/Horizontal (wider than tall): "3:2" (standard landscape), "16:9" (widescreen), "4:3", "5:4", "21:9" (ultra-wide)

  Semantic understanding - Extract aspectRatio when prompt contains:
  - "portrait" or "portrait photo" → use "2:3" (NOT "9:16" unless explicitly for phones/social media)
  - "landscape" or "landscape photo" → use "3:2"
  - "vertical" or "phone screen" → use "9:16"
  - "horizontal" or "widescreen" → use "16:9"
  - If aspect ratio mentioned explicitly (e.g., "9:16 aspect ratio") → use exact value
  - If orientation unclear → default to "1:1"

- safetySettings: Optional array (usually omit)
`;
