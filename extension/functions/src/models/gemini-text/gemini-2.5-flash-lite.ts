// functions/src/models/gemini-text/gemini-2.5-flash-lite.ts
import {z} from "zod";
import {GeminiTextRequestBaseSchema, GeminiTextAdapterBase} from "./shared.js";

// ============= SCHEMA =============
export const Gemini25FlashLiteRequestSchema = GeminiTextRequestBaseSchema.extend({
  model: z.literal("gemini-2.5-flash-lite"),
});

// ============= TYPE =============
export type Gemini25FlashLiteRequest = z.infer<typeof Gemini25FlashLiteRequestSchema>;

// ============= CONSTANTS =============
export const GEMINI_2_5_FLASH_LITE_CONFIG = {
  modelId: "gemini-2.5-flash-lite" as const,
  displayName: "Gemini 2.5 Flash Lite",
  category: "text" as const,
  isAsync: false,
  generationTime: "1-3s",
  schema: Gemini25FlashLiteRequestSchema,
} as const;

// ============= AI HINT =============
export const GEMINI_2_5_FLASH_LITE_AI_HINT = `
- **gemini-2.5-flash-lite**: Most cost-effective
  - Use when: User explicitly mentions "quick", "simple", "cheap"
`;

// ============= ADAPTER =============
export class Gemini25FlashLiteAdapter extends GeminiTextAdapterBase {
  protected schema = Gemini25FlashLiteRequestSchema;
  protected modelId = "gemini-2.5-flash-lite";
}

export default Gemini25FlashLiteAdapter;
