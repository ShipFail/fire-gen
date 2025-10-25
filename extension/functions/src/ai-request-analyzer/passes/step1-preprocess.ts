// functions/src/ai-request-analyzer/passes/step1-preprocess.ts
import * as logger from "firebase-functions/logger";

import {callVertexAPI} from "../../models/_shared/vertex-ai-client.js";
import {PROJECT_ID} from "../../firebase-admin.js";
import {REGION} from "../../env.js";
import {buildSystemInstruction} from "../../models/index.js";
import {preprocessAllUris, restoreUrisInText} from "../url-replacement.js";

// Gemini response type
interface GeminiResponse {
  candidates: Array<{
    content: {
      parts: Array<{
        text: string;
      }>;
    };
  }>;
}

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

CRITICAL: Each model family uses a DIFFERENT REST API schema format!

**Schema Formats by Model Family:**

1. **VEO (video)** - Uses instances/parameters:
{
  "model": "veo-3.1-fast-generate-preview",
  "instances": [{"prompt": "..."}],
  "parameters": {"durationSeconds": 8, "aspectRatio": "16:9", "generateAudio": true}
}

2. **IMAGEN (image)** - Uses instances/parameters:
{
  "model": "imagen-4.0-fast-generate-001",
  "instances": [{"prompt": "..."}],
  "parameters": {"aspectRatio": "1:1", "sampleCount": 1}
}

3. **GEMINI TEXT** - Uses contents/generationConfig:
{
  "model": "gemini-2.5-flash",
  "contents": [{"role": "user", "parts": [{"text": "..."}]}],
  "generationConfig": {"temperature": 1.0, "topP": 0.95}
}

4. **GEMINI TTS** - Uses contents/generationConfig with speechConfig:
{
  "model": "gemini-2.5-flash-preview-tts",
  "contents": [{"role": "user", "parts": [{"text": "Say: hello"}]}],
  "generationConfig": {
    "responseModalities": ["AUDIO"],
    "speechConfig": {"voiceConfig": {"prebuiltVoiceConfig": {"voiceName": "Aoede"}}}
  }
}

5. **NANO-BANANA** - Uses contents/generationConfig with IMAGE modality:
{
  "model": "gemini-2.5-flash-image",
  "contents": [{"role": "user", "parts": [{"text": "..."}]}],
  "generationConfig": {
    "responseModalities": ["IMAGE"],
    "imageConfig": {"aspectRatio": "1:1"}
  }
}

6. **LYRIA/CHIRP** - Check AI hints for exact format

URI Tag Rules:
- Tags: <VIDEO_URI_N/>, <IMAGE_URI_N/>, <AUDIO_URI_N/>
- For Veo/Imagen: Extract to {"gcsUri": "<tag>"}
- For Gemini models: Extract to contents if applicable
- Remove tag from prompt after extraction

Negative Prompts:
Extract from: "avoid", "without", "no", "don't want", "exclude"
Examples:
- "avoid cartoon" → negativePrompt: "cartoon"
- "without people" → negativePrompt: "people"

For EACH candidate (1-3):
1. Model ID
2. Request JSON (use CORRECT schema format for that model family!)
3. Parameter Reasoning (explain WHY each field has its value)
4. Confidence (high/medium/low)

Format:

Top 3 Model Candidates:

1. <model-id>
   Request JSON:
   <json matching that model's schema format>

   Parameter Reasoning:
   - <field>: <value> → [why] (from prompt: "..." OR default)

   Confidence: <level>

2. ...`;

  // 4. Call AI with greedy decoding for deterministic candidates
  logger.info("Step 1: Calling AI for candidate generation", {jobId});
  
  const endpoint = `v1/projects/${PROJECT_ID}/locations/${REGION}/publishers/google/models/gemini-2.5-flash-lite:generateContent`;
  const response = await callVertexAPI<GeminiResponse>(endpoint, {
    contents: [{role: "user", parts: [{text: aiPrompt}]}],
    generationConfig: {
      temperature: 0,        // Greedy decoding - no randomness
      topK: 1,               // Only consider #1 most probable token
      topP: 1.0,             // No nucleus sampling
      candidateCount: 1,     // Single response
      maxOutputTokens: 8192, // Fixed token limit
    },
  });

  const responseText = response.candidates?.[0]?.content?.parts?.[0]?.text;
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
