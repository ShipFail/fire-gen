// functions/src/assisted-mode/step2-parameter-inference.ts

/**
 * Step 2: Parameter Inference (AI Reasoning)
 *
 * Generate reasoning for model parameters based on selected model's AI hints.
 *
 * NOTE: modelHints already contains JSON Schema from ai-hints.ts.
 * We don't regenerate schema here - trust single source of truth.
 */

import {callDeterministicGemini} from "./gemini-helper.js";
import {buildStep2System} from "./prompts.js";

/**
 * Generate reasoning for model parameters.
 *
 * Input: taggedPrompt + step1.reasons + model schema (JSON)
 * Output: string[] (reasoning lines)
 */
export async function step2ParameterInference(
  taggedPrompt: string,
  selectedModel: string,
  step1Reasons: string[],
  modelHints: string,
  jobId: string,
): Promise<string[]> {
  // modelHints already contains JSON Schema from ai-hints.ts
  // No need to regenerate schema here - trust single source of truth
  const systemInstruction = buildStep2System(selectedModel, modelHints);

  // Build additional context with step1 reasoning
  const additionalContext = `**Previous Reasoning:**
${step1Reasons.map((r) => `- ${r}`).join("\n")}`;

  const text = await callDeterministicGemini({
    systemInstruction,
    userPrompt: taggedPrompt,
    additionalContext,
    jobId,
    // No jsonSchema - text mode
  });

  // Parse reasoning lines
  const lines = text
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  return lines;
}
