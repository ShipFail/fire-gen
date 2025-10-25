// functions/src/models/veo/veo-3.1-generate-preview.ts
import {z} from "zod";
import {Veo31RequestBaseSchema, VeoAdapterBase} from "./shared.js";

// ============= SCHEMA (Single Source of Truth) =============
export const Veo31GeneratePreviewRequestSchema = Veo31RequestBaseSchema.extend({
  model: z.literal("veo-3.1-generate-preview"),
});

// ============= TYPE (Inferred from Schema) =============
export type Veo31GeneratePreviewRequest = z.infer<typeof Veo31GeneratePreviewRequestSchema>;

// ============= CONSTANTS =============
export const VEO_3_1_GENERATE_PREVIEW_CONFIG = {
  modelId: "veo-3.1-generate-preview" as const,
  displayName: "Veo 3.1 (Highest Quality)",
  category: "video" as const,
  isAsync: true,
  generationTime: "60-120s",
  schema: Veo31GeneratePreviewRequestSchema,
} as const;

// ============= AI HINT =============
export const VEO_3_1_GENERATE_PREVIEW_AI_HINT = `
- **veo-3.1-generate-preview**: Latest generation, highest quality video (8s default)
  - Use when: User EXPLICITLY requests "high quality", "best quality", "cinematic", or detailed/complex scenes
  - Generation time: 60-120 seconds
  - New features: Multi-subject references, video extension, frame-specific generation
  - **ONLY use if user specifically asks for high quality**
`;

// ============= ADAPTER =============
export class Veo31GeneratePreviewAdapter extends VeoAdapterBase {
  protected schema = Veo31GeneratePreviewRequestSchema;
  protected modelId = "veo-3.1-generate-preview";
  protected isVeo31 = true; // Veo 3.1 uses new API
}

// ============= EXPORTS =============
export default Veo31GeneratePreviewAdapter;
