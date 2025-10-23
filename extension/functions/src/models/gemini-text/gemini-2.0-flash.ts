// functions/src/models/gemini-text/gemini-2.0-flash.ts
import {z} from "zod";
import {GeminiTextRequestBaseSchema, GeminiTextAdapterBase} from "./shared.js";

// ============= SCHEMA (Single Source of Truth) =============
export const Gemini20FlashRequestSchema = GeminiTextRequestBaseSchema.extend({
  model: z.literal("gemini-2.0-flash"),
});

// ============= TYPE (Inferred from Schema) =============
export type Gemini20FlashRequest = z.infer<typeof Gemini20FlashRequestSchema>;

// ============= CONSTANTS =============
export const GEMINI_2_0_FLASH_CONFIG = {
  modelId: "gemini-2.0-flash" as const,
  displayName: "Gemini 2.0 Flash",
  category: "text" as const,
  isAsync: false,
  generationTime: "1-5s",
  schema: Gemini20FlashRequestSchema,
} as const;

// ============= AI HINT =============
export const GEMINI_2_0_FLASH_AI_HINT = `
- **gemini-2.0-flash**: Latest Gemini 2.0 features, high quality (1-5s)
  - Use when: User requests latest features or Gemini 2.0 specifically
  - Generation time: 1-5 seconds
`;

// ============= ADAPTER =============
export class Gemini20FlashAdapter extends GeminiTextAdapterBase {
  protected schema = Gemini20FlashRequestSchema;
  protected modelId = "gemini-2.0-flash";
}

// ============= EXPORTS =============
export default Gemini20FlashAdapter;
