// functions/src/models/veo/veo-3.1-fast-generate-preview.ts
import {z} from "zod";
import {Veo31RequestBaseSchema, VeoAdapterBase} from "./shared.js";

// ============= SCHEMA (Single Source of Truth) =============
export const Veo31FastGeneratePreviewRequestSchema = Veo31RequestBaseSchema.extend({
  model: z.literal("veo-3.1-fast-generate-preview"),
});

// ============= TYPE (Inferred from Schema) =============
export type Veo31FastGeneratePreviewRequest = z.infer<typeof Veo31FastGeneratePreviewRequestSchema>;

// ============= CONSTANTS =============
export const VEO_3_1_FAST_GENERATE_PREVIEW_CONFIG = {
  modelId: "veo-3.1-fast-generate-preview" as const,
  displayName: "Veo 3.1 Fast",
  category: "video" as const,
  isAsync: true,
  generationTime: "30-60s",
  schema: Veo31FastGeneratePreviewRequestSchema,
} as const;

// ============= AI HINT =============
export const VEO_3_1_FAST_GENERATE_PREVIEW_AI_HINT = `
- **veo-3.1-fast-generate-preview**: Latest generation, fast video generation (8s default)
  - Use when: User requests "video" without quality modifiers, OR mentions "quick", "fast"
  - Generation time: 30-60 seconds
  - New features: Multi-subject references, video extension, frame-specific generation
  - **THIS IS THE DEFAULT CHOICE - use this for ALL video requests unless user explicitly asks for high quality**
`;

// ============= ADAPTER =============
export class Veo31FastGeneratePreviewAdapter extends VeoAdapterBase {
  protected schema = Veo31FastGeneratePreviewRequestSchema;
  protected modelId = "veo-3.1-fast-generate-preview";
  protected isVeo31 = true; // Veo 3.1 uses new API
}

// ============= EXPORTS =============
export default Veo31FastGeneratePreviewAdapter;
