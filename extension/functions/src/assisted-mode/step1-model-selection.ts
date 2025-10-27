// functions/src/assisted-mode/step1-model-selection.ts

/**
 * Step 1: Model Selection (AI JSON Mode)
 *
 * Select the best model for user's prompt using Gemini JSON mode.
 */

import {z} from "zod";
import {zodToJsonSchema} from "zod-to-json-schema";
import {callVertexAPI} from "../lib/vertex-ai-client.js";
import {PROJECT_ID} from "../firebase-admin.js";
import {REGION} from "../env.js";
import {STEP1_SYSTEM} from "./prompts.js";
import {ANALYZER_MODEL} from "./constants.js";
import {getModelIdSchema} from "../models/index.js";

/**
 * Step 1 output schema
 */
const Step1Schema = z.object({
  model: getModelIdSchema(),  // ✅ Auto-generated from MODEL_REGISTRY
  reasoning: z.array(z.string()).min(1, "Reasoning cannot be empty"),
});

export type Step1Result = z.infer<typeof Step1Schema>;

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
 * Select the best model for user's prompt.
 *
 * Uses Gemini JSON mode to return structured {model, reasoning}.
 */
export async function step1ModelSelection(
  taggedPrompt: string,
  jobId: string,
): Promise<Step1Result> {
  const endpoint = `v1/projects/${PROJECT_ID}/locations/${REGION}/publishers/google/models/${ANALYZER_MODEL}:generateContent`;

  try {
    const response = await callVertexAPI<GeminiResponse>(endpoint, {
      systemInstruction: {
        parts: [{text: STEP1_SYSTEM}],
      },
      contents: [
        {
          role: "user",
          parts: [{text: taggedPrompt}],
        },
      ],
      generationConfig: {
        temperature: 0,
        topK: 1,
        topP: 1.0,
        candidateCount: 1,
        maxOutputTokens: 8192,
        responseMimeType: "application/json",
        responseSchema: zodToJsonSchema(Step1Schema, {
          $refStrategy: "none",
          target: "openApi3",
          errorMessages: false,
        }),
      },
    });

    const text = response.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) {
      throw new Error(`[${jobId}] Step 1 failed: No response from Gemini`);
    }

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

