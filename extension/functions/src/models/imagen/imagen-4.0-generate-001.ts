// functions/src/models/imagen/imagen-4.0-generate-001.ts
import {z} from "zod";
import {ImagenRequestBaseSchema, ImagenAdapterBase} from "./shared.js";

export const Imagen40Generate001RequestSchema = ImagenRequestBaseSchema.extend({
  model: z.literal("imagen-4.0-generate-001"),
});

export type Imagen40Generate001Request = z.infer<typeof Imagen40Generate001RequestSchema>;

export const IMAGEN_4_0_GENERATE_001_CONFIG = {
  modelId: "imagen-4.0-generate-001" as const,
  displayName: "Imagen 4.0",
  category: "image" as const,
  isAsync: false,
  generationTime: "3-8s",
  schema: Imagen40Generate001RequestSchema,
} as const;

export const IMAGEN_4_0_GENERATE_001_AI_HINT = `
- **imagen-4.0-generate-001**: Highest quality image (Imagen 4)
  - Use when: User explicitly requests "high quality", "photorealistic", "detailed"
  - Generation time: 3-8 seconds
  - REST API schema: {model, instances: [{prompt}], parameters: {aspectRatio?, sampleCount?, ...}}
`;

export class Imagen40Generate001Adapter extends ImagenAdapterBase {
  protected schema = Imagen40Generate001RequestSchema;
  protected modelId = "imagen-4.0-generate-001";
}

export default Imagen40Generate001Adapter;
