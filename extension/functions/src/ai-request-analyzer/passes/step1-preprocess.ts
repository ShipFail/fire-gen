// functions/src/ai-request-analyzer/passes/step1-preprocess.ts
import * as logger from "firebase-functions/logger";

import {callVertexAPI} from "../../lib/vertex-ai-client.js";
import {PROJECT_ID} from "../../firebase-admin.js";
import {REGION} from "../../env.js";
import {buildSystemInstruction} from "../../models/index.js";
import {URI_TAG_RULES, NEGATIVE_PROMPT_RULES} from "../analyzer-shared-rules.js";

// Import AI hints from all model families
import {VEO_AI_HINTS} from "../../models/veo/ai-hints.js";
import {GEMINI_TTS_AI_HINTS} from "../../models/gemini-tts/ai-hints.js";
import {GEMINI_FLASH_IMAGE_AI_HINTS} from "../../models/gemini-flash-image/ai-hints.js";

// Assemble all model AI hints for the analyzer
const ALL_MODEL_HINTS = `
${VEO_AI_HINTS}

${GEMINI_TTS_AI_HINTS}

${GEMINI_FLASH_IMAGE_AI_HINTS}
`;

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
 *   1. veo-3.1-fast-generate-preview
 *      Type: video
 *      Parameters: {"duration":8,"aspectRatio":"9:16",...}
 *      Reasoning: Detected 'vertical' → 9:16...
 *      Confidence: high
 *
 *   2. veo-3.1-generate-preview
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

  // Get user prompt (already preprocessed by orchestrator)
  const prompt = contexts[0];

  // Gather ALL AI hints from ALL models
  const allHints = buildSystemInstruction();

  // Build AI prompt for candidate generation
  const aiPrompt = `User Prompt: ${prompt}

Available Models:
${allHints}

---

Task: Generate TOP 3 model candidates for this request.

CRITICAL: Each model family uses a DIFFERENT REST API schema format!

${ALL_MODEL_HINTS}

${URI_TAG_RULES}

${NEGATIVE_PROMPT_RULES}

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

  // Internal analyzer model (not user-facing)
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

  logger.info("Step 1 complete", {
    jobId,
    contextLength: responseText.length,
  });

  return responseText;
}
