// functions/src/assisted-mode/step2-parameter-inference.ts

/**
 * Step 2: Parameter Inference (AI Reasoning)
 *
 * Generate reasoning for model parameters based on selected model's JSON Schema.
 */

import {zodToJsonSchema} from "zod-to-json-schema";
import {getModelSchema} from "../models/index.js";
import {callDeterministicGemini} from "./gemini-helper.js";

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
  // Get model-specific JSON Schema
  const modelSchema = getModelSchema(selectedModel);
  const jsonSchema = JSON.stringify(zodToJsonSchema(modelSchema, {
    $refStrategy: "none",
    target: "openApi3",
    errorMessages: false,
  }), null, 2);

  // Build system instruction with JSON Schema
  const systemInstruction = `You are an expert full stack engineer inferring parameters for ${selectedModel}.

**Model Request JSON Schema:**
\`\`\`json
${jsonSchema}
\`\`\`

**Task:**
Generate detailed reasoning for each parameter in the request JSON. Focus ONLY on fields defined in the schema above.

**Output Format:**
One reasoning line per parameter, format:
"<parameter>: <value> → <reason>"

Example:
"durationSeconds: 8 → Default duration for short videos (schema allows: 4, 6, 8)"
"aspectRatio: 9:16 → User requested vertical video (schema enum value)"

**Guidelines:**
- Infer parameter values semantically from the user's prompt
- Reference schema constraints (enums, types, required fields)
- Use default values when not specified
- Be explicit about your reasoning`;

  // Build user prompt with step1 reasoning
  const userPrompt = `${taggedPrompt}

**Previous Reasoning:**
${step1Reasons.map((r) => `- ${r}`).join("\n")}`;

  const text = await callDeterministicGemini({
    systemInstruction,
    userPrompt,
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
