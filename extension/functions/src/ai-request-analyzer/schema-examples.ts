// functions/src/ai-request-analyzer/schema-examples.ts

/**
 * REST API Schema Format Examples
 * 
 * These examples are used in both Step 1 and Step 2 AI prompts
 * to ensure consistent schema output across the pipeline.
 * 
 * SINGLE SOURCE OF TRUTH: Update here to affect both steps.
 */

export const SCHEMA_FORMAT_EXAMPLES = `
**Schema Formats by Model Family:**

1. **VEO (video)** - instances/parameters format:
{
  "model": "veo-3.1-fast-generate-preview",
  "instances": [{"prompt": "..."}],
  "parameters": {
    "durationSeconds": 8,
    "aspectRatio": "16:9",
    "generateAudio": true,
    "negativePrompt": "..." // optional
  }
}

2. **IMAGEN (image)** - instances/parameters format:
{
  "model": "imagen-4.0-fast-generate-001",
  "instances": [{"prompt": "..."}],
  "parameters": {
    "aspectRatio": "1:1",
    "sampleCount": 1,
    "negativePrompt": "..." // optional
  }
}

3. **GEMINI TEXT** - contents/generationConfig format:
{
  "model": "gemini-2.5-flash",
  "contents": [{"role": "user", "parts": [{"text": "..."}]}],
  "generationConfig": {
    "temperature": 1.0,
    "topP": 0.95,
    "topK": 40,
    "maxOutputTokens": 8192
  }
}

4. **GEMINI TTS** - contents/generationConfig with speechConfig:
{
  "model": "gemini-2.5-flash-preview-tts",
  "contents": [{"role": "user", "parts": [{"text": "Say: hello world"}]}],
  "generationConfig": {
    "responseModalities": ["AUDIO"],
    "speechConfig": {
      "voiceConfig": {
        "prebuiltVoiceConfig": {"voiceName": "Aoede"}
      }
    }
  }
}

5. **GEMINI-2.5-FLASH-IMAGE** - contents/generationConfig with IMAGE modality:
{
  "model": "gemini-2.5-flash-image",
  "contents": [{"role": "user", "parts": [{"text": "..."}]}],
  "generationConfig": {
    "responseModalities": ["IMAGE"],
    "imageConfig": {"aspectRatio": "1:1"}
  }
}

6. **LYRIA (music)** - instances/parameters format:
{
  "model": "lyria-002",
  "instances": [{"prompt": "..."}],
  "parameters": {"sample_count": 1}
}
`;

export const URI_TAG_RULES = `
URI Tag Rules:
- Tags: <VIDEO_URI_N/>, <IMAGE_URI_N/>, <AUDIO_URI_N/>
- For Veo/Imagen: Extract to {"gcsUri": "<tag>"}
- For Gemini models: Extract to contents if applicable
- Remove tag from prompt after extraction
`;

export const NEGATIVE_PROMPT_RULES = `
Negative Prompts:
Extract from: "avoid", "without", "no", "don't want", "exclude"
Examples:
- "avoid cartoon" → negativePrompt: "cartoon"
- "without people" → negativePrompt: "people"
`;

export const DEFAULT_VALUES = `
Default Values:
- Veo: durationSeconds=8, aspectRatio="16:9", generateAudio=true
- Imagen: aspectRatio="1:1", sampleCount=1
- Gemini-2.5-flash-image: aspectRatio="1:1"
- Gemini text: temperature=1.0, topP=0.95
`;
