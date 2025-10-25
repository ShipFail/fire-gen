// functions/src/ai-request-analyzer/analyzer-shared-rules.ts

/**
 * Shared rules used across AI analyzer steps.
 * These are analyzer-specific (not model-specific) rules.
 */

export const URI_TAG_RULES = `
URI Tag Rules:
- Tags: <VIDEO_URI_N/>, <IMAGE_URI_N/>, <AUDIO_URI_N/>
- For Veo/Gemini Flash Image: Extract to {"gcsUri": "<tag>"}
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
- Gemini-2.5-flash-image: aspectRatio="1:1"
- Gemini TTS: voice auto-detect from language
`;
