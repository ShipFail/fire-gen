// functions/src/models/gemini-text/gemini-2.0-flash-lite.ts
import {z} from "zod";
import {GeminiTextRequestBaseSchema, GeminiTextAdapterBase} from "./shared.js";

// ============= SCHEMA (Single Source of Truth) =============
export const Gemini20FlashLiteRequestSchema = GeminiTextRequestBaseSchema.extend({
  model: z.literal("gemini-2.0-flash-lite"),
});

// ============= TYPE (Inferred from Schema) =============
export type Gemini20FlashLiteRequest = z.infer<typeof Gemini20FlashLiteRequestSchema>;

// ============= CONSTANTS =============
export const GEMINI_2_0_FLASH_LITE_CONFIG = {
  modelId: "gemini-2.0-flash-lite" as const,
  displayName: "Gemini 2.0 Flash Lite",
  category: "text" as const,
  isAsync: false,
  generationTime: "1-3s",
  schema: Gemini20FlashLiteRequestSchema,
} as const;

// ============= AI HINT =============
export const GEMINI_2_0_FLASH_LITE_AI_HINT = `
- **gemini-2.0-flash-lite**: Latest Gemini 2.0 features, low latency (1-3s)
  - Use when: User requests fastest response with Gemini 2.0 features
  - Generation time: 1-3 seconds
`;

// ============= ADAPTER =============
export class Gemini20FlashLiteAdapter extends GeminiTextAdapterBase {
  protected schema = Gemini20FlashLiteRequestSchema;
  protected modelId = "gemini-2.0-flash-lite";
}

// ============= EXPORTS =============
export default Gemini20FlashLiteAdapter;
