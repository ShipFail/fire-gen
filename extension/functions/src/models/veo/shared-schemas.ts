// functions/src/models/veo/shared-schemas.ts
/**
 * Shared Zod schemas for ALL Veo models.
 * ONLY includes values that are universal across EVERY Veo version (2.0, 3.0, 3.1+).
 *
 * DO NOT add version-specific schemas here - keep those in individual model files.
 */
import {z} from "zod";
import {PromptSchema} from "../_shared/zod-helpers.js";

/**
 * Aspect ratios supported by ALL Veo models (2.0, 3.0, 3.1+)
 */
export const VEO_ASPECT_RATIO_SCHEMA = z.enum([
  "16:9",
  "9:16",
  "1:1",
  "21:9",
  "3:4",
  "4:3",
]);
export type VeoAspectRatio = z.infer<typeof VEO_ASPECT_RATIO_SCHEMA>;

/**
 * Video durations supported by ALL Veo models (2.0, 3.0, 3.1+)
 */
export const VEO_DURATION_SCHEMA = z.union([
  z.literal(4),
  z.literal(6),
  z.literal(8),
]);
export type VeoDuration = z.infer<typeof VEO_DURATION_SCHEMA>;

/**
 * Common fields present in ALL Veo model requests.
 * Use as a base for composing version-specific schemas.
 */
export const VEO_COMMON_FIELDS_SCHEMA = z.object({
  type: z.literal("video"),
  model: z.string(), // Overridden in specific models
  prompt: PromptSchema,
  duration: VEO_DURATION_SCHEMA.default(8),
  aspectRatio: VEO_ASPECT_RATIO_SCHEMA.default("16:9"),
  audio: z.boolean().default(true),
});

