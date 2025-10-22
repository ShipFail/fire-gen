// functions/src/models/gemini-text/gemini-2.5-pro.ts
import {z} from "zod";
import {GeminiTextRequestBaseSchema, GeminiTextAdapterBase} from "./shared.js";

// ============= SCHEMA =============
export const Gemini25ProRequestSchema = GeminiTextRequestBaseSchema.extend({
  model: z.literal("gemini-2.5-pro"),
});

// ============= TYPE =============
export type Gemini25ProRequest = z.infer<typeof Gemini25ProRequestSchema>;

// ============= CONSTANTS =============
export const GEMINI_2_5_PRO_CONFIG = {
  modelId: "gemini-2.5-pro" as const,
  displayName: "Gemini 2.5 Pro",
  category: "text" as const,
  isAsync: false,
  generationTime: "2-10s",
  schema: Gemini25ProRequestSchema,
} as const;

// ============= AI HINT =============
export const GEMINI_2_5_PRO_AI_HINT = `
- **gemini-2.5-pro**: Highest quality text generation
  - Use when: User requests complex reasoning, long-form content, "high quality", "detailed analysis"
  - Capabilities: Extended thinking, complex tasks
`;

// ============= ADAPTER =============
export class Gemini25ProAdapter extends GeminiTextAdapterBase {
  protected schema = Gemini25ProRequestSchema;
  protected modelId = "gemini-2.5-pro";
}

export default Gemini25ProAdapter;
