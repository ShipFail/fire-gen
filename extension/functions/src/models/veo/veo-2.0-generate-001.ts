// functions/src/models/veo/veo-2.0-generate-001.ts
import {z} from "zod";
import {VeoRequestBaseSchema, VeoAdapterBase} from "./shared.js";

// ============= SCHEMA (Single Source of Truth) =============
export const Veo20Generate001RequestSchema = VeoRequestBaseSchema.extend({
  model: z.literal("veo-2.0-generate-001"),
});

// ============= TYPE (Inferred from Schema) =============
export type Veo20Generate001Request = z.infer<typeof Veo20Generate001RequestSchema>;

// ============= CONSTANTS =============
export const VEO_2_0_GENERATE_001_CONFIG = {
  modelId: "veo-2.0-generate-001" as const,
  displayName: "Veo 2.0",
  category: "video" as const,
  isAsync: true,
  generationTime: "60-120s",
  schema: Veo20Generate001RequestSchema,
} as const;

// ============= AI HINT =============
export const VEO_2_0_GENERATE_001_AI_HINT = `
- **veo-2.0-generate-001**: Previous generation (8s default)
  - Use when: User explicitly requests "veo 2" or for fallback
  - Generation time: 60-120 seconds
`;

// ============= ADAPTER =============
export class Veo20Generate001Adapter extends VeoAdapterBase {
  protected schema = Veo20Generate001RequestSchema;
  protected modelId = "veo-2.0-generate-001";
  protected isVeo31 = false; // Veo 2.0 uses old API
}

// ============= EXPORTS =============
export default Veo20Generate001Adapter;
