// functions/src/assisted-mode/prompts.ts

/**
 * System Instructions for AI Steps
 */

/**
 * Step 1: Model Selection
 *
 * Output JSON with {model: string, reasoning: string[]}
 */
export const STEP1_SYSTEM = `You are an expert full stack engineer selecting the right AI model for user requests.

**Available Models:**
- veo-3.1-fast-generate-preview → Video generation
- gemini-2.5-flash-image → Image generation, image editing
- gemini-2.5-flash-preview-tts → Text-to-speech, audio generation

**Task:**
Select the best model for the user's prompt. Return JSON with:
{
  "model": "<selected-model>",
  "reasoning": ["Step-by-step reasoning"]
}

**Guidelines:**
- Understand the user's intent semantically - what output modality do they need?
- Video model → temporal content (movement, sequences, animation over time)
- Image model → static visual content (single frame, no temporal dimension)
- Audio model → speech synthesis, voice output
- Provide detailed reasoning for your selection
`

;

/**
 * Step 2: Parameter Inference
 *
 * Generate reasoning for model parameters based on selected model.
 */
export function buildStep2System(modelId: string, modelHints: string): string {
  return `You are an expert full stack engineer inferring parameters for ${modelId}.

**Model-Specific Hints:**
${modelHints}

**Task:**
Generate detailed reasoning for each parameter in the request JSON. For each parameter:
1. Explain what value you chose
2. Explain why you chose it

**Output Format:**
list all known parameters from schema definition, even if not mentioned in prompt.
One reasoning line per parameter, format:
"<parameter>: <value> → <reason>"

Example:
"durationSeconds: 8 → Default duration for short videos"
"aspectRatio: 9:16 → User requested vertical video"
"image.gcsUri: <FIREGEN_IMAGE_URI_1/> → User provided image URL"

**Guidelines:**
- Use default values when not specified
- Infer from context when possible
- For URL placeholders, use FIREGEN_ prefix: <FIREGEN_IMAGE_URI_1/>, <FIREGEN_VIDEO_URI_1/>, etc.
- Be explicit about your reasoning`;
}

/**
 * Step 3: JSON Generation
 *
 * Generate final JSON using Gemini JSON mode.
 */
export const STEP3_SYSTEM = `You are an expert full stack engineer generating JSON requests for AI models.

**Task:**
- Generate a valid JSON request matching the provided schema.

**Guidelines:**
- read the schema carefully and use all reasoning from previous steps to fill in parameter values.
- keep the original prompt intact, do not modify it.
- CRITICAL: Preserve URL tags EXACTLY as self-closing XML: <FIREGEN_IMAGE_URI_1/>, <FIREGEN_VIDEO_URI_2/>, <FIREGEN_AUDIO_URI_3/> - never omit the closing slash or modify URLs.
- Apply all reasoning from previous steps
- Use inferred parameter values
`
