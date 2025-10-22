// functions/src/ai-request-analyzer/passes/step1-preprocess.ts
import * as logger from "firebase-functions/logger";

import {ai} from "../../models/_shared/ai-client.js";
import {buildSystemInstruction} from "../../models/index.js";
import {preprocessAllUrls, restoreUrlsInText} from "../url-utils.js";

/**
 * Step 1: AI-Powered Candidate Generation
 *
 * Responsibilities:
 * 1. Preprocess URLs (replace with placeholders)
 * 2. Gather ALL AI hints from ALL models
 * 3. Call AI to generate top 3 model candidates with predicted parameters
 * 4. Return plain text with candidates, reasoning, and confidence
 * 5. Restore URLs in output
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

  // 1. Preprocess URLs in prompt
  const {processedContexts, urlMap} = preprocessAllUrls(contexts);
  const prompt = processedContexts[0];

  if (urlMap.size > 0) {
    logger.info("Step 1: URLs preprocessed", {jobId, urlCount: urlMap.size});
  }

  // 2. Gather ALL AI hints from ALL models
  const allHints = buildSystemInstruction();

  // 3. Build AI prompt for candidate generation
  const aiPrompt = `User Prompt: ${prompt}

Available Models (with AI hints):
${allHints}

---

**🚨 CRITICAL RULE: DO NOT EXECUTE THE USER'S CREATIVE REQUEST 🚨**

Your job is to ANALYZE and ROUTE the request, NOT to PERFORM the creative task.

**For prompt/text fields:**
- Video/Image/Text/Music: Use the ORIGINAL user prompt VERBATIM (copy exactly as-is)
- TTS ONLY: Extract quoted text OR imperative object (e.g., "Say hello" → "hello")
- NEVER generate content yourself
- NEVER rephrase or rewrite the prompt
- NEVER execute the creative task

**Why this matters:**
- The FINAL MODEL will execute the user's creative request
- Your job is ONLY to choose the right model and parameters (metadata)
- Preserving the original prompt ensures user's creative intent reaches the final model

---

Task: Analyze the user prompt and generate the TOP 3 most suitable model candidates.

**Think step-by-step before generating candidates:**
1. What media type is the user requesting? (video/image/audio/text)
2. What are the key indicators in the prompt?
   - Spoken words → TTS audio
   - Music/melody/beat → Music audio
   - Visual content → Video or Image
   - Text generation → Text
   - **CRITICAL**: URL placeholders (<GS_HTTPS_URI_REF_1/>, etc.) → Image-to-video (video with referenceImageGcsUri)
3. What parameters are explicitly mentioned? (duration, aspect ratio, quality, voice)
4. Which models best match these requirements?

For EACH candidate (1-3), provide:
1. Model ID (exact ID from available models above)
2. Media type (video, image, audio, or text)
3. Predicted parameters (as JSON object - use model hints for correct schema structure)
4. **Parameter-by-Parameter Reasoning:**
   For EVERY field in your parameters JSON, explain:
   - WHY you chose this specific value
   - WHICH part of the user prompt led to this decision (quote relevant words)
   - If using a default value, WHY this default is appropriate

   **SPECIAL RULES FOR CONTENT FIELDS:**
   - prompt (video/image/text/music): Copy ORIGINAL prompt VERBATIM - preserve user's creative intent
   - text (TTS): Extract quoted text or imperative object only (e.g., "Say hello world" → "hello world")

   Format for each parameter:
   - <field>: <value> → Because [reason] (from prompt: "..." OR default because [reason])

5. Model Selection Reasoning (why THIS model over others)
6. Confidence level (high, medium, or low)

Order candidates by confidence (most confident first).

Format your response as plain text (NOT JSON), clearly structured:

Top 3 Model Candidates:

1. <model-id>
   Type: <type>
   Parameters: <json>

   Parameter Reasoning:
   - type: "<value>" → Because [explanation] (from prompt: "..." OR default)
   - model: "<value>" → Because [explanation]
   - [field]: <value> → Because [explanation] (from prompt: "..." OR default because [reason])
   [... explain EVERY parameter in your JSON]

   Model Selection: [why this model]
   Confidence: <level>

2. ...

3. ...

Examples:

**Example 1: Video Request**
User Prompt: "Create a 4-second portrait video of a city at night with ambient sounds"

1. veo-3.0-fast-generate-001
   Type: video
   Parameters: {"type":"video","model":"veo-3.0-fast-generate-001","prompt":"Create a 4-second portrait video of a city at night with ambient sounds","duration":4,"aspectRatio":"9:16","resolution":"1080p","audio":true}

   Parameter Reasoning:
   - type: "video" → User requested video generation (from prompt: "Create a...video")
   - model: "veo-3.0-fast-generate-001" → Default fast model, no quality preference stated
   - prompt: "Create a 4-second portrait video of a city at night with ambient sounds" → ORIGINAL prompt VERBATIM - preserved for final model to execute (from prompt: entire user prompt)
   - duration: 4 → User specified duration (from prompt: "4-second")
   - aspectRatio: "9:16" → User said "portrait" = TALLER (from prompt: "portrait video")
   - resolution: "1080p" → Default HD quality (default because: not specified)
   - audio: true → User wants sound (from prompt: "with ambient sounds")

   Model Selection: Fast variant for standard quality video request
   Confidence: high

**Example 2: TTS Request (EXTRACTION ALLOWED)**
User Prompt: "Say hello world in a cheerful voice"

1. gemini-2.5-flash-preview-tts
   Type: audio
   Parameters: {"type":"audio","subtype":"tts","model":"gemini-2.5-flash-preview-tts","text":"hello world","voice":"Puck"}

   Parameter Reasoning:
   - type: "audio" → User wants spoken output (from prompt: "Say")
   - subtype: "tts" → Text-to-speech request (from prompt: "Say...")
   - model: "gemini-2.5-flash-preview-tts" → Default TTS model
   - text: "hello world" → EXTRACTED imperative object from "Say X" (from prompt: "Say hello world")
   - voice: "Puck" → Cheerful voice matches user request (from prompt: "cheerful voice")

   Model Selection: TTS model for speech synthesis
   Confidence: high

**Example 3: Text Request (NO EXTRACTION - PRESERVE VERBATIM)**
User Prompt: "Write a text explanation of artificial intelligence"

1. gemini-2.5-flash
   Type: text
   Parameters: {"type":"text","model":"gemini-2.5-flash","prompt":"Write a text explanation of artificial intelligence"}

   Parameter Reasoning:
   - type: "text" → User wants written output (from prompt: "Write a text")
   - model: "gemini-2.5-flash" → Default text generation model
   - prompt: "Write a text explanation of artificial intelligence" → ORIGINAL prompt VERBATIM - final model will execute this creative task (from prompt: entire user prompt)

   Model Selection: Text model for written content generation
   Confidence: high`;

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

  // 5. Restore URLs in result
  const restored = restoreUrlsInText(responseText, urlMap);

  logger.info("Step 1 complete", {
    jobId,
    contextLength: restored.length,
  });

  return restored;
}
