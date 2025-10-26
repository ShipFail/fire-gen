// functions/src/models/_shared/zod-helpers.ts
import {z} from "zod";
import {zodToJsonSchema} from "zod-to-json-schema";

/**
 * Common Zod schemas shared across all models.
 * These utilities reduce duplication and ensure consistent validation.
 */

/**
 * Convert Zod schema to formatted JSON string for AI hints.
 * 
 * This ensures AI hints are auto-generated from schemas (SSOT principle #4).
 * When schema changes, AI hints automatically update.
 * 
 * @param schema - Zod schema to convert
 * @returns Formatted JSON string for AI consumption
 */
export function zodToJsonExample(schema: z.ZodTypeAny): string {
  const jsonSchema = zodToJsonSchema(schema, {
    name: undefined,
    $refStrategy: "none",
  });
  
  return JSON.stringify(jsonSchema, null, 2);
}

/**
 * GCS URI validator (gs://bucket/path)
 */
export const GcsUriSchema = z.string().refine(
  (uri) => uri.startsWith("gs://"),
  {message: "Must be a GCS URI starting with gs://"}
);

/**
 * URL or GCS URI validator
 */
export const UrlOrGcsUriSchema = z.string().refine(
  (uri) => uri.startsWith("gs://") || uri.startsWith("https://") || uri.startsWith("http://"),
  {message: "Must be a valid URL (http://, https://) or GCS URI (gs://)"}
);

/**
 * BCP-47 language code validator (basic pattern matching)
 * Examples: en, en-US, zh-CN, es-ES
 */
export const Bcp47LanguageSchema = z.string().regex(
  /^[a-z]{2,3}(-[A-Z]{2})?$/,
  "Must be a valid BCP-47 language code (e.g., en, en-US, es-ES)"
);

/**
 * Prompt text validator (common validation for generation prompts)
 */
export const PromptSchema = z.string()
  .min(1, "Prompt cannot be empty")
  .max(10000, "Prompt too long (max 10,000 characters)");

/**
 * Text content validator (for TTS, text generation input)
 */
export const TextContentSchema = z.string()
  .min(1, "Text cannot be empty")
  .max(50000, "Text too long (max 50,000 characters)");

/**
 * Positive integer validator
 */
export const PositiveIntSchema = z.number().int().positive();

/**
 * Sample rate validator (common audio sample rates)
 */
export const SampleRateSchema = z.number().int().positive().refine(
  (rate) => [8000, 16000, 22050, 24000, 44100, 48000].includes(rate),
  {message: "Sample rate must be one of: 8000, 16000, 22050, 24000, 44100, 48000 Hz"}
);
