// functions/src/models/veo/veo-3.0-fast-generate-001.ts
import {z} from "zod";
import {VeoRequestBaseSchema, VeoAdapterBase} from "./shared.js";

// ============= SCHEMA (Single Source of Truth) =============
export const Veo30FastGenerate001RequestSchema = VeoRequestBaseSchema.extend({
  model: z.literal("veo-3.0-fast-generate-001"),
});

// ============= TYPE (Inferred from Schema) =============
export type Veo30FastGenerate001Request = z.infer<typeof Veo30FastGenerate001RequestSchema>;

// ============= CONSTANTS =============
export const VEO_3_0_FAST_GENERATE_001_CONFIG = {
  modelId: "veo-3.0-fast-generate-001" as const,
  displayName: "Veo 3.0 Fast",
  category: "video" as const,
  isAsync: true,
  generationTime: "30-60s",
  schema: Veo30FastGenerate001RequestSchema,
} as const;

// ============= AI HINT =============
export const VEO_3_0_FAST_GENERATE_001_AI_HINT = `
- **veo-3.0-fast-generate-001**: Fast video generation (8s default, up to 10s)
  - Use when: User requests "video" without quality modifiers, OR mentions "quick", "fast"
  - Generation time: 30-60 seconds
  - **THIS IS THE DEFAULT CHOICE - use this for ALL video requests unless user explicitly asks for high quality**
`;

// ============= ADAPTER =============
export class Veo30FastGenerate001Adapter extends VeoAdapterBase {
  protected schema = Veo30FastGenerate001RequestSchema;
  protected modelId = "veo-3.0-fast-generate-001";
}

// ============= EXPORTS =============
export default Veo30FastGenerate001Adapter;
