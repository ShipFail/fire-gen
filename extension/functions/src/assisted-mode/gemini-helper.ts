// functions/src/assisted-mode/gemini-helper.ts

/**
 * Deterministic Gemini API Helper
 *
 * Provides a centralized function for calling Gemini with deterministic settings.
 * All assisted-mode steps MUST use this helper to ensure reproducible outputs.
 */

import {zodToJsonSchema} from "zod-to-json-schema";
import {callVertexAPI} from "../lib/vertex-ai-client.js";
import {transformSchemaForGeminiResponseSchema} from "../lib/zod-utils.js";
import {PROJECT_ID} from "../firebase-admin.js";
import {REGION} from "../env.js";
import {ANALYZER_MODEL} from "./constants.js";
import type {z} from "zod";

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
 * Options for deterministic Gemini call
 */
interface DeterministicGeminiOptions {
  /** System instruction text */
  systemInstruction: string;

  /** User prompt text */
  userPrompt: string;

  /** Job ID for error messages */
  jobId: string;

  /** Zod schema for JSON mode (optional - text mode if omitted) */
  jsonSchema?: z.ZodType<any>;

  /** Max output tokens (default: 8192) */
  maxOutputTokens?: number;
}

/**
 * Call Gemini with deterministic settings (temperature=0, topK=1, topP=1.0, candidateCount=1).
 *
 * This is the ONLY function that should be used for Gemini calls in assisted-mode.
 *
 * @param options - Configuration for the Gemini call
 * @returns Parsed response text (JSON if schema provided, raw text otherwise)
 * @throws Error if no response from Gemini
 */
export async function callDeterministicGemini(
  options: DeterministicGeminiOptions
): Promise<string> {
  const {
    systemInstruction,
    userPrompt,
    jobId,
    jsonSchema,
    maxOutputTokens = 8192,
  } = options;

  const endpoint = `v1/projects/${PROJECT_ID}/locations/${REGION}/publishers/google/models/${ANALYZER_MODEL}:generateContent`;

  // Base generation config (always deterministic)
  const generationConfig: Record<string, any> = {
    temperature: 0,
    topK: 1,
    topP: 1.0,
    candidateCount: 1,
    maxOutputTokens,
  };

  // Add JSON mode if schema provided
  if (jsonSchema) {
    generationConfig.responseMimeType = "application/json";
    generationConfig.responseSchema = transformSchemaForGeminiResponseSchema(
      zodToJsonSchema(jsonSchema, {
        $refStrategy: "none",
        target: "openApi3",
        errorMessages: false,
      })
    );
  }

  const response = await callVertexAPI<GeminiResponse>(endpoint, {
    systemInstruction: {
      parts: [{text: systemInstruction}],
    },
    contents: [
      {
        role: "user",
        parts: [{text: userPrompt}],
      },
    ],
    generationConfig,
  });

  const text = response.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) {
    throw new Error(`[${jobId}] Gemini API failed: No response`);
  }

  return text;
}
