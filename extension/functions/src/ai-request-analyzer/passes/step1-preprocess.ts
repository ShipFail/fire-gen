// functions/src/ai-request-analyzer/passes/step1-preprocess.ts
import * as logger from "firebase-functions/logger";

import {ai} from "../../models/_shared/ai-client.js";
import {buildSystemInstruction} from "../../models/index.js";
import {preprocessAllUris, restoreUrisInText} from "../url-utils.js";

/**
 * Step 1: AI-Powered Candidate Generation
 *
 * Responsibilities:
 * 1. Preprocess URIs (replace with placeholders)
 * 2. Gather ALL AI hints from ALL models
 * 3. Call AI to generate top 3 model candidates with predicted parameters
 * 4. Return plain text with candidates, reasoning, and confidence
 * 5. Restore URIs in output
 *
 * This step is EXPLORATORY - generates multiple possibilities.
 * Step 2 will make the FINAL decision.
 *
 * Input:  contexts[0] = "vertical video of a waterfall"
 * Output: Plain text with 3 candidates:
 *   Top 3 Model Candidates:
 *
 *   1. veo-3.0-generate-001
 *      Type: video
 *      Parameters: {"duration":8,"aspectRatio":"9:16",...}
 *      Reasoning: Detected 'vertical' → 9:16...
 *      Confidence: high
 *
 *   2. veo-3.0-fast-generate-001
 *      ...
 *
 * @param contexts - Array of context strings (only contexts[0] = prompt is used)
 * @param jobId - Job ID for logging
 * @returns Plain text string with candidates and reasoning
 */
export async function step1Preprocess(
  contexts: string[],
  jobId: string
): Promise<string> {
  logger.info("Step 1: Generating candidates", {jobId});

  // 1. Preprocess URIs in prompt
  const {processedContexts, replacements} = preprocessAllUris(contexts);
  const prompt = processedContexts[0];

  if (replacements.length > 0) {
    logger.info("Step 1: URIs preprocessed", {jobId, urlCount: replacements.length});
  }

  // 2. Gather ALL AI hints from ALL models
  const allHints = buildSystemInstruction();

  // 3. Build AI prompt for candidate generation
  const aiPrompt = `User Prompt: ${prompt}

Available Models:
${allHints}

---

Task: Generate TOP 3 model candidates for this request.

URL Placeholders:
- <GS_VIDEO_URI_REF_N mimeType='...'/>: Video file
- <GS_IMAGE_URI_REF_N mimeType='...'/>: Image file
- <GS_AUDIO_URI_REF_N mimeType='...'/>: Audio file

URL Rules:
1. Check mimeType attribute to determine file type
2. Copy FULL tag to appropriate field (videoGcsUri, imageGcsUri, referenceSubjectImages, lastFrameGcsUri)
3. Remove tag from prompt IF used in a field, keep IF unused

Prompt Preservation:
- Video/Image/Text/Music: Copy user prompt VERBATIM (do NOT rewrite)
- TTS only: Extract quoted text or imperative object

Default Values (when not specified):
- Video: duration=8, aspectRatio="16:9", audio=true
- Image: aspectRatio="1:1"

Negative Prompts:
Extract from phrases: "avoid", "without", "no", "don't want", "exclude", "negative prompt:"
Examples:
- "avoid cartoon style" → negativePrompt: "cartoon style"
- "without people" → negativePrompt: "people"
- "no text overlays" → negativePrompt: "text overlays"

For EACH candidate (1-3):
1. Model ID
2. Type (video/image/audio/text)
3. Parameters JSON (use model schema from hints)
4. Parameter Reasoning (explain WHY each field has its value)
5. Confidence (high/medium/low)

Format:

Top 3 Model Candidates:

1. <model-id>
   Type: <type>
   Parameters: <json>

   Parameter Reasoning:
   - <field>: <value> → [why] (from prompt: "..." OR default)

   Confidence: <level>

2. ...`;

  // 4. Call AI with greedy decoding for deterministic candidates
  logger.info("Step 1: Calling AI for candidate generation", {jobId});
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
    throw new Error("Empty response from Step 1 candidate generation");
  }

  logger.info("Step 1: Candidates generated", {
    jobId,
    responseLength: responseText.length,
  });

  // 5. Restore URIs in result
  const restored = restoreUrisInText(responseText, replacements);

  logger.info("Step 1 complete", {
    jobId,
    contextLength: restored.length,
  });

  return restored;
}
