// functions/src/models/imagen/imagen-4.0-ultra-generate-001.ts
import {z} from "zod";
import {ImagenRequestBaseSchema, ImagenAdapterBase} from "./shared.js";

export const Imagen40UltraGenerate001RequestSchema = ImagenRequestBaseSchema.extend({
  model: z.literal("imagen-4.0-ultra-generate-001"),
});

export type Imagen40UltraGenerate001Request = z.infer<typeof Imagen40UltraGenerate001RequestSchema>;

export const IMAGEN_4_0_ULTRA_GENERATE_001_CONFIG = {
  modelId: "imagen-4.0-ultra-generate-001" as const,
  displayName: "Imagen 4.0 Ultra",
  category: "image" as const,
  isAsync: false,
  generationTime: "5-12s",
  schema: Imagen40UltraGenerate001RequestSchema,
} as const;

export const IMAGEN_4_0_ULTRA_GENERATE_001_AI_HINT = `
- **imagen-4.0-ultra-generate-001**: Ultra quality (Imagen 4 Ultra)
  - Use when: User explicitly requests "ultra quality", "maximum detail"
  - Generation time: 5-12 seconds
`;

export class Imagen40UltraGenerate001Adapter extends ImagenAdapterBase {
  protected schema = Imagen40UltraGenerate001RequestSchema;
  protected modelId = "imagen-4.0-ultra-generate-001";
}

export default Imagen40UltraGenerate001Adapter;
