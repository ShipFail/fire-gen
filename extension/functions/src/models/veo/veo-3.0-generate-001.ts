// functions/src/models/veo/veo-3.0-generate-001.ts
import {z} from "zod";
import {VeoRequestBaseSchema, VeoAdapterBase} from "./shared.js";

// ============= SCHEMA (Single Source of Truth) =============
export const Veo30Generate001RequestSchema = VeoRequestBaseSchema.extend({
  model: z.literal("veo-3.0-generate-001"),
});

// ============= TYPE (Inferred from Schema) =============
export type Veo30Generate001Request = z.infer<typeof Veo30Generate001RequestSchema>;

// ============= CONSTANTS =============
export const VEO_3_0_GENERATE_001_CONFIG = {
  modelId: "veo-3.0-generate-001" as const,
  displayName: "Veo 3.0 (Highest Quality)",
  category: "video" as const,
  isAsync: true,
  generationTime: "60-120s",
  schema: Veo30Generate001RequestSchema,
} as const;

// ============= AI HINT =============
export const VEO_3_0_GENERATE_001_AI_HINT = `
- **veo-3.0-generate-001**: Highest quality video (8s default, up to 10s)
  - Use when: User EXPLICITLY requests "high quality", "best quality", "cinematic", or detailed/complex scenes
  - Generation time: 60-120 seconds
  - **ONLY use if user specifically asks for high quality**
`;

// ============= ADAPTER =============
export class Veo30Generate001Adapter extends VeoAdapterBase {
  protected schema = Veo30Generate001RequestSchema;
  protected modelId = "veo-3.0-generate-001";
}

// ============= EXPORTS =============
export default Veo30Generate001Adapter;
