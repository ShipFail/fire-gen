// functions/src/models/imagen/imagen-4.0-fast-generate-001.ts
import {z} from "zod";
import {ImagenRequestBaseSchema, ImagenAdapterBase} from "./shared.js";

export const Imagen40FastGenerate001RequestSchema = ImagenRequestBaseSchema.extend({
  model: z.literal("imagen-4.0-fast-generate-001"),
});

export type Imagen40FastGenerate001Request = z.infer<typeof Imagen40FastGenerate001RequestSchema>;

export const IMAGEN_4_0_FAST_GENERATE_001_CONFIG = {
  modelId: "imagen-4.0-fast-generate-001" as const,
  displayName: "Imagen 4.0 Fast",
  category: "image" as const,
  isAsync: false,
  generationTime: "2-5s",
  schema: Imagen40FastGenerate001RequestSchema,
} as const;

export const IMAGEN_4_0_FAST_GENERATE_001_AI_HINT = `
- **imagen-4.0-fast-generate-001**: Fast high-quality image (Imagen 4 Fast)
  - Use when: User requests "imagen" or "good quality" but mentions speed
  - Generation time: 2-5 seconds
  - REST API schema: {model, instances: [{prompt}], parameters: {aspectRatio?, sampleCount?, ...}}
`;

export class Imagen40FastGenerate001Adapter extends ImagenAdapterBase {
  protected schema = Imagen40FastGenerate001RequestSchema;
  protected modelId = "imagen-4.0-fast-generate-001";
}

export default Imagen40FastGenerate001Adapter;
