// functions/src/models/chirp/ai-hints.ts

import {CHIRP_3_HD_AI_HINT} from "./chirp-3-hd.js";
import {CHIRP_AI_HINT} from "./chirp.js";

export const CHIRP_AI_HINTS = `
### AUDIO - Chirp TTS (sync, 2-8s)
${CHIRP_3_HD_AI_HINT}

Chirp TTS parameters:
- text: Text to synthesize
- voice: Voice ID (required, 248 voices available)
- language: Optional (BCP-47 language code, supports 31 languages)
- sampleRate: Optional (output sample rate in Hz, default: 24000)

### AUDIO - STT (Speech-to-Text, sync, 1-10s, no file output)
${CHIRP_AI_HINT}

STT parameters:
- audioUri: GCS URI of audio file to transcribe (gs://bucket/path/file.wav)
- language: Optional (auto-detected if omitted)
- encoding: Optional ("LINEAR16", "FLAC", etc.)
- sampleRate: Optional
`;
