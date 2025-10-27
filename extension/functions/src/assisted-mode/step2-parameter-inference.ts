// functions/src/assisted-mode/step2-parameter-inference.ts

/**
 * Step 2: Parameter Inference (AI Reasoning)
 *
 * Generate reasoning for model parameters based on selected model.
 */

import {callVertexAPI} from "../lib/vertex-ai-client.js";
import {PROJECT_ID} from "../firebase-admin.js";
import {REGION} from "../env.js";
import {buildStep2System} from "./prompts.js";
import {ANALYZER_MODEL} from "./constants.js";

/**
 * Gemini API response type
 */
interface GeminiResponse {
  candidates?: Array<{
    content?: {
      parts?: Array<{text?: string}>;
    };
  }>;
}

/**
 * Generate reasoning for model parameters.
 *
 * Input: taggedPrompt + step1.reasons + model hints
 * Output: string[] (reasoning lines)
 */
export async function step2ParameterInference(
  taggedPrompt: string,
  selectedModel: string,
  step1Reasons: string[],
  modelHints: string,
  jobId: string,
): Promise<string[]> {
  const endpoint = `v1/projects/${PROJECT_ID}/locations/${REGION}/publishers/google/models/${ANALYZER_MODEL}:generateContent`;

  // Build user prompt with step1 reasoning
  const userPrompt = `${taggedPrompt}

**Previous Reasoning:**
${step1Reasons.map((r) => `- ${r}`).join("\n")}`;

  const response = await callVertexAPI<GeminiResponse>(endpoint, {
    systemInstruction: {
      parts: [{text: buildStep2System(selectedModel, modelHints)}],
    },
    contents: [
      {
        role: "user",
        parts: [{text: userPrompt}],
      },
    ],
  });

  const text = response.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) {
    throw new Error(`[${jobId}] Step 2 failed: No response from Gemini`);
  }

  // Parse reasoning lines
  const lines = text
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  return lines;
}
