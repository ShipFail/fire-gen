// functions/src/models/gemini-tts/ai-hints.ts

import {GEMINI_2_5_FLASH_PREVIEW_TTS_AI_HINT} from "./gemini-2.5-flash-preview-tts.js";
import {GEMINI_2_5_PRO_PREVIEW_TTS_AI_HINT} from "./gemini-2.5-pro-preview-tts.js";

/**
 * AI hints for Gemini TTS models - SINGLE EXPORT following AGENTS.md rule #7.
 */
export const GEMINI_TTS_AI_HINTS = `
### AUDIO - TTS (Text-to-Speech, sync, 2-8s)
**IMPORTANT: TTS is for SPOKEN WORDS. If request involves speech/voice/narration → Use TTS, NOT music.**

**OUTPUT FORMAT - Vertex AI REST API Schema:**
\`\`\`json
{
  "model": "gemini-2.5-flash-preview-tts",
  "contents": [{
    "role": "user",
    "parts": [{"text": "Welcome to FireGen"}]
  }],
  "generationConfig": {
    "responseModalities": ["AUDIO"],
    "speechConfig": {
      "voiceConfig": {
        "prebuiltVoiceConfig": {
          "voiceName": "Zephyr" // optional - 30 voices available
        }
      },
      "languageCode": "en-US" // optional - auto-detected if omitted
    }
  }
}
\`\`\`

Model Selection:
${GEMINI_2_5_FLASH_PREVIEW_TTS_AI_HINT}
${GEMINI_2_5_PRO_PREVIEW_TTS_AI_HINT}

Voice Selection (optional):
- Extract voice preference if mentioned (e.g., "cheerful voice" → "Puck" or "Zephyr")
- Available voices: Zephyr, Puck, Charon, Kore, Fenrir, Aoede, etc. (30 total)

Language (optional):
- Use BCP-47 codes: "en-US", "es-ES", "fr-FR", etc.
- Auto-detected if omitted

**TTS vs Text vs Music:**
- "Say/Speak/Voice/Read aloud" → TTS (responseModalities: ["AUDIO"])
- "Write/Generate text" → TEXT (responseModalities: ["TEXT"])
- "Music/Song/Melody/Beat" → MUSIC (use Chirp/Lyria models)
`;
