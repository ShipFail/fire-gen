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

  /** User's original prompt (first part of user message) */
  userPrompt: string;

  /** Additional context/reasoning (optional - added as second part if provided) */
  additionalContext?: string;

  /** Job ID for error messages */
  jobId: string;

  /** Zod schema for JSON mode (optional - text mode if omitted) */
  jsonSchema?: z.ZodType<any>;

  /** Max output tokens (default: 8192) */
  maxOutputTokens?: number;
}

/**
 * Call Gemini with deterministic settings (temperature=0, topK=1, candidateCount=1).
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
    additionalContext,
    jobId,
    jsonSchema,
    maxOutputTokens = 8192,
  } = options;

  const endpoint = `v1/projects/${PROJECT_ID}/locations/${REGION}/publishers/google/models/${ANALYZER_MODEL}:generateContent`;

  // Deterministic generation config
  //
  // Core determinism guarantee:
  // - topK: 1 → Only the single highest-probability token is considered at each step
  //
  // Why topK=1 alone ensures determinism:
  //   With topK=1, only 1 token survives filtering, making:
  //   - topP (nucleus sampling) redundant - would filter an already-filtered set
  //   - temperature (sampling randomness) redundant - only 1 choice exists
  //   However, we keep temperature=0 for defensive programming:
  //     • Explicit "no randomness" signal (makes intent clear)
  //     • Guards against potential API default behavior
  //     • Zero performance cost
  const generationConfig: Record<string, any> = {
    temperature: 0,      // Defensive: explicit "no randomness"
    topK: 1,             // Core: only highest-probability token
    candidateCount: 1,   // Single response only
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

  // Build user message parts
  // Part 1: User's original prompt (always first)
  // Part 2: Additional context/reasoning (optional - if provided)
  const userParts: Array<{text: string}> = [{text: userPrompt}];
  
  if (additionalContext) {
    userParts.push({text: additionalContext});
  }

  const response = await callVertexAPI<GeminiResponse>(endpoint, {
    systemInstruction: {
      parts: [{text: systemInstruction}],
    },
    contents: [
      {
        role: "user",
        parts: userParts,
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
