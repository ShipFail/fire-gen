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

Candidates (Step 1):
${step1Candidates}

${
  validationErrors.length > 0
    ? `
Validation Errors:
${validationErrors.join("\n")}

FIX these errors in your response.
`
    : ""
}

---

Task: Select best model and build JobRequest JSON with ALL required fields.

REQUIRED Video Fields (ALWAYS include):
- type, model, prompt, duration, aspectRatio, audio
- Defaults: duration=8, aspectRatio="16:9", audio=true

URL Extraction (self-describing tags):

**CRITICAL: Every URL tag MUST be extracted to a field. Never discard URLs.**

Tag Format: <{PROTOCOL}_{CATEGORY}_{FORMAT}_{INDEX}/>
- Examples: <GS_VIDEO_MP4_1/>, <HTTPS_IMAGE_JPEG_1/>, <GS_AUDIO_MPEG_1/>

Decision Tree:
1. Video URL (<GS_VIDEO_*> or <HTTPS_VIDEO_*>):
   - With image URL → videoGcsUri + lastFrameGcsUri (video extension)
   - Alone → videoGcsUri (video extension)

2. Single Image URL (<GS_IMAGE_*_1> or <HTTPS_IMAGE_*_1>):
   - Words "animate", "bring to life" → imageGcsUri (base image animation)
   - Words "show", "character", "person", "walking" → referenceSubjectImages
   - **URL at END or standalone (no animation words)** → referenceSubjectImages (DEFAULT)
   - In middle of sentence → referenceSubjectImages

3. Multiple Image URLs (2-3 images):
   - If first + "with" + second → imageGcsUri (first) + referenceSubjectImages (rest)
   - Otherwise → ALL go to referenceSubjectImages (max 3)

Examples:
- "Animate <GS_IMAGE_JPEG_1/>" → imageGcsUri: "<GS_IMAGE_JPEG_1/>", prompt: "Animate"
- "Mountain climber <GS_IMAGE_JPEG_1/>" → referenceSubjectImages: ["<GS_IMAGE_JPEG_1/>"], prompt: "Mountain climber"
- "Show <HTTPS_IMAGE_PNG_1/> walking" → referenceSubjectImages: ["<HTTPS_IMAGE_PNG_1/>"], prompt: "Show walking"
- "Person <GS_IMAGE_JPEG_1/> in city" → referenceSubjectImages: ["<GS_IMAGE_JPEG_1/>"], prompt: "Person in city"
- "Continue <GS_VIDEO_MP4_1/>" → videoGcsUri: "<GS_VIDEO_MP4_1/>", prompt: "Continue"

Negative Prompts:
IF you see: "avoid X", "without X", "no X", "exclude X" → Extract X to negativePrompt field

Format:

Selected Model: <model-id>

Job Request:
<JSON>

Parameter Reasoning:
- <field>: <value> → [why] (from: "..." OR default)

Example:
User Prompt: "Vertical waterfall video"

Selected Model: veo-3.1-fast-generate-preview

Job Request:
{"type":"video","model":"veo-3.1-fast-generate-preview","prompt":"Vertical waterfall video","duration":8,"aspectRatio":"9:16","audio":true}

Parameter Reasoning:
- prompt: "Vertical waterfall video" → VERBATIM (from: entire prompt)
- duration: 8 → default
- aspectRatio: "9:16" → vertical = taller (from: "Vertical")
- audio: true → default`;

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
