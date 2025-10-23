// functions/src/models/gemini-text/ai-hints.ts

import {GEMINI_2_5_PRO_AI_HINT} from "./gemini-2.5-pro.js";
import {GEMINI_2_5_FLASH_AI_HINT} from "./gemini-2.5-flash.js";
import {GEMINI_2_5_FLASH_LITE_AI_HINT} from "./gemini-2.5-flash-lite.js";
import {GEMINI_2_0_FLASH_AI_HINT} from "./gemini-2.0-flash.js";
import {GEMINI_2_0_FLASH_LITE_AI_HINT} from "./gemini-2.0-flash-lite.js";

/**
 * Assembled AI hints for all Gemini Text models.
 * Used by AI request analyzer to choose the right model.
 */
export const GEMINI_TEXT_AI_HINTS = `
### TEXT (sync, 1-10s, no file output)
${GEMINI_2_5_PRO_AI_HINT}
${GEMINI_2_5_FLASH_AI_HINT}
${GEMINI_2_5_FLASH_LITE_AI_HINT}
${GEMINI_2_0_FLASH_AI_HINT}
${GEMINI_2_0_FLASH_LITE_AI_HINT}

Text Schema Structure (CRITICAL):
- type: "text" (REQUIRED)
- model: gemini-2.5-* or gemini-2.0-* (NOT audio, NOT other types)
- prompt: "..." (text generation request - REQUIRED)
- systemInstruction: Optional (role/behavior instruction)
- temperature: Optional (0.0-2.0, default: 1.0; lower = more focused, higher = more creative)
- maxOutputTokens: Optional (max response length)
- topP: Optional (0.0-1.0, nucleus sampling)
- topK: Optional (top-k sampling)
- stopSequences: Optional (array of strings to stop generation)

EXAMPLE: {"type":"text","model":"gemini-2.5-flash","prompt":"Explain neural networks"}

**IMPORTANT - Text vs TTS Distinction:**
- Text requests ask to WRITE/GENERATE text → Use TEXT models (type: "text")
- TTS requests ask to SPEAK/SAY words → Use TTS models (type: "audio", subtype: "tts")

Examples:
- "Write an explanation of AI" → TEXT ({"type":"text","model":"gemini-2.5-flash","prompt":"..."})
- "Say hello world" → TTS ({"type":"audio","subtype":"tts","model":"gemini-2.5-flash-preview-tts","text":"..."})
- "Explain how neural networks work for beginners" → TEXT (type: "text")
- "Read this text aloud" → TTS (type: "audio", subtype: "tts")
`;
