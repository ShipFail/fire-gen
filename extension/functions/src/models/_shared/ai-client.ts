// functions/src/models/_shared/ai-client.ts
import {GoogleGenAI} from "@google/genai";
import {PROJECT_ID} from "../../firebase-admin.js";
import {REGION} from "../../env.js";

/**
 * Shared GoogleGenAI client instance for Vertex AI.
 * All model adapters should use this singleton instance.
 */
export const ai = new GoogleGenAI({
  vertexai: true,
  project: PROJECT_ID,
  location: REGION,
});
