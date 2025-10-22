// functions/src/models/gemini-tts/ai-hints.ts

import {GEMINI_2_5_FLASH_PREVIEW_TTS_AI_HINT} from "./gemini-2.5-flash-preview-tts.js";
import {GEMINI_2_5_PRO_PREVIEW_TTS_AI_HINT} from "./gemini-2.5-pro-preview-tts.js";

export const GEMINI_TTS_AI_HINTS = `
### AUDIO - TTS (Text-to-Speech, sync, 2-8s)
**IMPORTANT: TTS is for SPOKEN WORDS. If request involves speech/voice/narration → Use TTS, NOT music.**

${GEMINI_2_5_FLASH_PREVIEW_TTS_AI_HINT}
${GEMINI_2_5_PRO_PREVIEW_TTS_AI_HINT}

TTS Schema Structure (CRITICAL):
- type: "audio" (REQUIRED)
- subtype: "tts" (REQUIRED)
- model: gemini-2.5-*-preview-tts (REQUIRED)
- text: "..." (words to speak - REQUIRED, NOT "prompt")
- voice: Optional (e.g., "Zephyr", "Puck", "Charon", "Kore" - 30 voices available)
  * Extract voice preference if mentioned (e.g., "cheerful voice" → suggest "Puck" or "Zephyr")
- language: Optional (auto-detected if omitted; BCP-47 like "en-US", "es-ES")

EXAMPLE: {"type":"audio","subtype":"tts","model":"gemini-2.5-flash-preview-tts","text":"Welcome to FireGen","voice":"Zephyr"}

**TTS vs Text vs Music:**
- "Say/Speak/Voice/Read aloud" → TTS (type: "audio", subtype: "tts", field: "text")
- "Write/Generate text" → TEXT (type: "text", field: "prompt")
- "Music/Song/Melody/Beat" → MUSIC (type: "audio", subtype: "music", field: "prompt")
`;
