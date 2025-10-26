// functions/src/ai-request-analyzer-v2/step3-json-generation.ts

/**
 * Step 3: JSON Generation (AI JSON Schema Mode)
 *
 * Generate final JSON using Gemini JSON mode with model-specific schema.
 */

import {zodToJsonSchema} from "zod-to-json-schema";
import {callVertexAPI} from "../lib/vertex-ai-client.js";
import {PROJECT_ID} from "../firebase-admin.js";
import {REGION} from "../env.js";
import {STEP3_SYSTEM} from "./prompts.js";
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
  const endpoint = `v1/projects/${PROJECT_ID}/locations/${REGION}/publishers/google/models/${ANALYZER_MODEL}:generateContent`;

  // Build user prompt with all reasoning
  const userPrompt = `${taggedPrompt}

**Reasoning Chain:**
${allReasons.map((r) => `- ${r}`).join("\n")}`;

  const response = await callVertexAPI<GeminiResponse>(endpoint, {
    systemInstruction: {
      parts: [{text: STEP3_SYSTEM}],
    },
    contents: [
      {
        role: "user",
        parts: [{text: userPrompt}],
      },
    ],
    generationConfig: {
      responseMimeType: "application/json",
      responseSchema: zodToJsonSchema(modelSchema),
    },
  });

  const text = response.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) {
    throw new Error(`[${jobId}] Step 3 failed: No response from Gemini`);
  }

  const jsonWithTags = JSON.parse(text) as Record<string, unknown>;
  return jsonWithTags;
}
