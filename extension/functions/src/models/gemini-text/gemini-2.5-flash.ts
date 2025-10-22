// functions/src/models/gemini-text/gemini-2.5-flash.ts
import {z} from "zod";
import {GeminiTextRequestBaseSchema, GeminiTextAdapterBase} from "./shared.js";

// ============= SCHEMA =============
export const Gemini25FlashRequestSchema = GeminiTextRequestBaseSchema.extend({
  model: z.literal("gemini-2.5-flash"),
});

// ============= TYPE =============
export type Gemini25FlashRequest = z.infer<typeof Gemini25FlashRequestSchema>;

// ============= CONSTANTS =============
export const GEMINI_2_5_FLASH_CONFIG = {
  modelId: "gemini-2.5-flash" as const,
  displayName: "Gemini 2.5 Flash",
  category: "text" as const,
  isAsync: false,
  generationTime: "1-5s",
  schema: Gemini25FlashRequestSchema,
} as const;

// ============= AI HINT =============
export const GEMINI_2_5_FLASH_AI_HINT = `
- **gemini-2.5-flash**: Fast, high-quality text (BEST PRICE/PERFORMANCE)
  - Use when: User requests text generation without quality modifiers
  - DEFAULT CHOICE for text requests
`;

// ============= ADAPTER =============
export class Gemini25FlashAdapter extends GeminiTextAdapterBase {
  protected schema = Gemini25FlashRequestSchema;
  protected modelId = "gemini-2.5-flash";
}

export default Gemini25FlashAdapter;
