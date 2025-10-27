// functions/src/assisted-mode/step1-model-selection.ts

/**
 * Step 1: Model Selection (AI JSON Mode)
 *
 * Select the best model for user's prompt using Gemini JSON mode.
 */

import {z} from "zod";
import {STEP1_SYSTEM} from "./prompts.js";
import {getModelIdSchema} from "../models/index.js";
import {callDeterministicGemini} from "./gemini-helper.js";

/**
 * Step 1 output schema
 */
const Step1Schema = z.object({
  model: getModelIdSchema(),  // ✅ Auto-generated from MODEL_REGISTRY
  reasoning: z.array(z.string()).min(1, "Reasoning cannot be empty"),
});

export type Step1Result = z.infer<typeof Step1Schema>;

/**
 * Select the best model for user's prompt.
 *
 * Uses Gemini JSON mode to return structured {model, reasoning}.
 */
export async function step1ModelSelection(
  taggedPrompt: string,
  jobId: string,
): Promise<Step1Result> {
  try {
    const text = await callDeterministicGemini({
      systemInstruction: STEP1_SYSTEM,
      userPrompt: taggedPrompt,
      jobId,
      jsonSchema: Step1Schema,
      maxOutputTokens: 8192,
    });

    const json = JSON.parse(text);
    return Step1Schema.parse(json);

  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error(`[${jobId}] Step 1 validation failed:`, error.errors);
      throw new Error(`Model selection validation failed: ${error.errors.map(e => e.message).join(", ")}`);
    }
    throw error;
  }
}

