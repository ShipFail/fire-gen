// functions/src/ai-request-analyzer/passes/step2-analyze.ts
import * as logger from "firebase-functions/logger";

import {ai} from "../../models/_shared/ai-client.js";

/**
 * Step 2: AI-Powered Final Model Selection
 *
 * Responsibilities:
 * 1. Review top 3 candidates from Step 1
 * 2. Consider validation errors (if retry)
 * 3. Make final model selection
 * 4. Finalize all parameters
 * 5. Output JobRequest as JSON + reasoning (plain text)
 *
 * This step is DECISIVE - picks the best candidate and commits to final parameters.
 *
 * Input:
 *   contexts[0] = user prompt
 *   contexts[1] = Step 1 output (candidates)
 *   contexts[2+] = validation errors (if retry)
 *
 * Output: Plain text with JobRequest JSON + reasoning:
 *   Selected Model: veo-3.0-generate-001
 *
 *   Job Request:
 *   {"type":"video","model":"veo-3.0-generate-001","prompt":"waterfall","duration":8,"aspectRatio":"9:16"...}
 *
 *   Selection Reasoning:
 *   Chose veo-3.0-generate-001 over fast variant because...
 *
 *   Parameter Reasoning:
 *   - aspectRatio: "9:16" - Vertical means TALLER (height > width), so 9:16
 *   - duration: 8 - Default, no duration specified
 *   ...
 *
 * @param contexts - Array of context strings [prompt, step1Context, errors...]
 * @param jobId - Job ID for logging
 * @returns Plain text string with JobRequest JSON and reasoning
 */
export async function step2Analyze(
  contexts: string[],
  jobId: string
): Promise<string> {
  logger.info("Step 2: Making final selection", {jobId});

  // Parse contexts
  const userPrompt = contexts[0];
  const step1Candidates = contexts[1];
  const validationErrors = contexts.slice(2).filter((c) => c.includes("Validation Error"));

  if (validationErrors.length > 0) {
    logger.info("Step 2: Retry with validation errors", {
      jobId,
      errorCount: validationErrors.length,
    });
  }

  // Build AI prompt
  const aiPrompt = `User Prompt: ${userPrompt}

Candidate Models (from Step 1 pre-analysis):
${step1Candidates}

${
  validationErrors.length > 0
    ? `
Previous Validation Errors:
${validationErrors.join("\n")}

**CRITICAL: Fix these validation errors in your response!**
Review the errors carefully and ensure your JobRequest addresses them.
`
    : ""
}

---

**🚨 CRITICAL RULE: PRESERVE ORIGINAL USER PROMPT 🚨**

Your job is to SELECT the best model and SET parameters, NOT to EXECUTE the creative task.

**For prompt/text fields:**
- Video/Image/Text/Music prompt: Copy ORIGINAL user prompt VERBATIM (exactly as-is)
- TTS text: Extract quoted text or imperative object ONLY (e.g., "Say hello" → "hello")
- NEVER generate content yourself
- NEVER rephrase or execute the user's creative request

**Why this matters:**
- The FINAL MODEL (Veo, Imagen, Gemini, Lyria) will execute the creative task
- Your job is ONLY to route and configure (choose model + parameters)
- Preserving original prompt ensures user's creative intent reaches final model unchanged

---

Task: Select the BEST candidate and generate the final FireGen JobRequest.

**Think step-by-step before making final selection:**
1. Review all 3 candidates from Step 1
2. Identify the media type (video/image/audio/text)
3. **CRITICAL**: Check for URL placeholders (<GS_HTTPS_URI_REF_1/>, etc.) in user prompt
   - If present → This is IMAGE-TO-VIDEO → MUST include "referenceImageGcsUri": "<GS_HTTPS_URI_REF_X/>"
4. Check model capabilities against user needs
5. Determine required schema fields for this media type:
   - Video: type, model, prompt (+ duration, aspectRatio, resolution, audio, referenceImageGcsUri if image-to-video)
   - Image: type, model, prompt (+ aspectRatio if mentioned)
   - Audio/TTS: type, subtype, model, text (+ voice, language)
   - Audio/Music: type, subtype, model, prompt (+ negativePrompt, seed)
   - Text: type, model, prompt (+ systemInstruction, temperature, etc.)
6. Extract parameter values from user prompt (metadata only - duration, aspectRatio, etc.)
7. Validate schema structure matches model hints

Steps:
1. Review all 3 candidates (model capabilities, predicted parameters, reasoning)
2. Pick the BEST model ID for this request
3. Finalize ALL parameters (use candidate predictions + user prompt + model schema hints)
4. Output the complete JobRequest as valid JSON
5. Explain your selection and parameter choices

**CRITICAL Orchestration Rules:**
- Output valid JSON that matches FireGen job request schema
- Ensure parameter values match your reasoning
- Include ALL required fields for the selected model type
- Use model AI hints for correct schema structure (type/subtype, field names)
- For prompt field: PRESERVE original user prompt VERBATIM
- For text field (TTS): Extract only quoted text or imperative object
- Don't leave required fields empty

Format your response as:

Selected Model: <model-id>

Job Request:
<valid JSON here - must be parseable>

Selection Reasoning:
<explain why you chose this model over the other 2 candidates from Step 1>

**Parameter Reasoning (REQUIRED FOR ALL PARAMETERS):**
You MUST explain EVERY field in your Job Request JSON above. For each parameter:
1. State the field name and value
2. Explain WHY you chose this specific value
3. Connect to user prompt (quote relevant words) OR explain default choice
4. For optional fields: explain why you included/omitted them

Format for each parameter:
- <field>: <value>
  * Reason: [explanation]
  * From prompt: "[quote]" OR "Default because [reason]"

Example outputs:

**Example 1: Video Request**
User Prompt: "Vertical video of a waterfall cascading down mossy rocks in a forest"

Selected Model: veo-3.1-fast-generate-preview

Job Request:
{"type":"video","model":"veo-3.1-fast-generate-preview","prompt":"Vertical video of a waterfall cascading down mossy rocks in a forest","duration":8,"aspectRatio":"9:16","audio":true}

Selection Reasoning:
Chose veo-3.1-fast-generate-preview (latest generation, fast) as the default choice. User didn't specify quality preference, so using fast variant.

Parameter Reasoning:
- type: "video"
  * Reason: User explicitly requested video generation
  * From prompt: "Vertical video of a waterfall"

- model: "veo-3.1-fast-generate-preview"
  * Reason: Latest Veo 3.1 fast model, default for video requests
  * Default because: No quality preference mentioned, using fast variant

- prompt: "Vertical video of a waterfall cascading down mossy rocks in a forest"
  * Reason: ORIGINAL user prompt VERBATIM - preserved for final model to execute creative task
  * From prompt: Entire user prompt copied exactly as-is

- duration: 8
  * Reason: Default duration, not specified by user
  * Default because: 8 seconds is standard Veo duration for general videos

- aspectRatio: "9:16"
  * Reason: User specified "vertical" orientation. Vertical means TALLER than wide, which is 9:16 (NOT 16:9)
  * From prompt: "Vertical video" → height > width → 9:16

- audio: true
  * Reason: Natural waterfall sounds would enhance the video experience
  * Default because: Audio adds realism, user didn't request "silent"

**Example 2: TTS Request (EXTRACTION ALLOWED)**
User Prompt: "Say hello world in a cheerful voice"

Selected Model: gemini-2.5-flash-preview-tts

Job Request:
{"type":"audio","subtype":"tts","model":"gemini-2.5-flash-preview-tts","text":"hello world","voice":"Puck"}

Parameter Reasoning:
- type: "audio"
  * Reason: User wants spoken output
  * From prompt: "Say"

- subtype: "tts"
  * Reason: Text-to-speech request
  * From prompt: "Say..."

- model: "gemini-2.5-flash-preview-tts"
  * Reason: Standard TTS model for speech synthesis
  * Default because: No quality preference mentioned

- text: "hello world"
  * Reason: EXTRACTED imperative object from "Say X" pattern - this is the text to speak
  * From prompt: "Say hello world" → extract "hello world"

- voice: "Puck"
  * Reason: Cheerful voice matches user request
  * From prompt: "cheerful voice" → Puck is a cheerful voice option

**Example 3: Text Request (NO EXTRACTION - PRESERVE VERBATIM)**
User Prompt: "Write a text explanation of artificial intelligence"

Selected Model: gemini-2.5-flash

Job Request:
{"type":"text","model":"gemini-2.5-flash","prompt":"Write a text explanation of artificial intelligence"}

Parameter Reasoning:
- type: "text"
  * Reason: User wants written text output
  * From prompt: "Write a text"

- model: "gemini-2.5-flash"
  * Reason: Standard text generation model
  * Default because: No quality preference mentioned

- prompt: "Write a text explanation of artificial intelligence"
  * Reason: ORIGINAL user prompt VERBATIM - final model will execute this creative task
  * From prompt: Entire user prompt copied exactly as-is (NOT generated/executed by analyzer)

**WRONG Examples (DO NOT DO THIS):**
❌ {"prompt":"waterfall with lush vegetation"} - REPHRASED (should be original verbatim)
❌ {"text":"Artificial intelligence is the simulation of..."} - EXECUTED creative task (should preserve original request)
❌ {"prompt":"a cinematic video of..."} - ADDED words not in original (should copy exactly)

**CRITICAL:** Every field in your Job Request JSON MUST be explained above in Parameter Reasoning.`;

  // Call AI with greedy decoding for deterministic decisions
  logger.info("Step 2: Calling AI for final selection", {jobId});
  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash-lite",
    contents: aiPrompt,
    config: {
      temperature: 0,        // Greedy decoding - no randomness
      topK: 1,               // Only consider #1 most probable token
      topP: 1.0,             // No nucleus sampling
      candidateCount: 1,     // Single response
      maxOutputTokens: 8192, // Fixed token limit
    },
  } as any);

  const responseText = response.text;
  if (!responseText) {
    throw new Error("Empty response from Step 2 final selection");
  }

  logger.info("Step 2 complete", {
    jobId,
    responseLength: responseText.length,
  });

  return responseText;
}
