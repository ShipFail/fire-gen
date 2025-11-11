// functions/src/assisted-mode/step3-json-generation.ts

/**
 * Step 3: JSON Generation (AI JSON Schema Mode)
 *
 * Generate final JSON using Gemini JSON mode with model-specific schema.
 */

import {STEP3_SYSTEM} from "./prompts.js";
import {callDeterministicGemini} from "./gemini-helper.js";

/**
 * Generate final JSON request.
 *
 * Input: taggedPrompt + allReasons + model schema
 * Output: Record<string, unknown> (validated JSON with tags)
 */
export async function step3JsonGeneration(
  taggedPrompt: string,
  allReasons: string[],
  modelSchema: any, // Zod schema
  jobId: string,
): Promise<Record<string, unknown>> {
  // Build additional context with all accumulated reasoning
  const additionalContext = `**Reasoning Chain:**
  ${allReasons.map((r) => `- ${r}`).join("\n")}`;

  const text = await callDeterministicGemini({
    systemInstruction: STEP3_SYSTEM,
    userPrompt: taggedPrompt,
    additionalContext,
    jobId,
    jsonSchema: modelSchema,
  });

  try {
    const jsonWithTags = JSON.parse(text) as Record<string, unknown>;
    return jsonWithTags;
  } catch (err) {
    throw new Error(`Failed to parse JSON output from step3JsonGeneration: \n"""json\n${text}\n"""\n\nError: ${(err as Error).message}`);
  }
}
