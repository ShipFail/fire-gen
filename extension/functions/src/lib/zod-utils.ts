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
    target: "openApi3",
    errorMessages: false,
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

/**
 * TWO-LAYER SCHEMA ARCHITECTURE
 * ==============================
 *
 * FireGen uses a two-layer schema transformation pattern to bridge incompatibilities
 * between Vertex AI model requirements and Gemini's response_schema parameter.
 *
 * **Layer 1: Model API Schema (Source of Truth)**
 * - Defined in Zod schemas (e.g., veo-3.1-fast-generate-preview.schema.ts)
 * - Uses semantically correct types (e.g., durationSeconds: z.union([z.literal(4), z.literal(6), z.literal(8)]))
 * - Integers are integers, strings are strings - matches actual Vertex AI REST API
 * - Example: durationSeconds accepts numbers 4, 6, or 8
 *
 * **Layer 2: Gemini Response Schema (Transformation)**
 * - Gemini's response_schema parameter has stricter requirements than the actual API
 * - ALL enum values must be strings, regardless of semantic type
 * - Type field must be "string" for any object containing enum
 * - Example: durationSeconds enum becomes ["4", "6", "8"] with type "string"
 *
 * **Transformation Flow:**
 * 1. Define schema in Layer 1 (Zod with correct types)
 * 2. Transform Layer 1 → Layer 2 via transformSchemaForGeminiResponseSchema()
 * 3. Send Layer 2 to Gemini's response_schema parameter
 * 4. Gemini returns JSON with string enums
 * 5. Convert Layer 2 → Layer 1 via convertStringEnumsToNumbers() (in validate-json.ts)
 * 6. Validate against Layer 1 Zod schema
 *
 * **Why This Pattern:**
 * - Gemini API rejects integer enums in response_schema (returns 400 error)
 * - Model APIs (Veo, etc.) expect integer types for numeric fields
 * - Schema must match actual API for validation to pass
 * - Transformation layer bridges this gap transparently
 *
 * @see validateFinalJson in validate-json.ts for reverse transformation
 */

/**
 * Transform JSON schema for Gemini's response schema parameter.
 *
 * Converts Layer 1 (Model API Schema) → Layer 2 (Gemini Response Schema).
 *
 * Transformations:
 * - All enum values → strings (e.g., [4, 6, 8] → ["4", "6", "8"])
 * - Type field → "string" for any object containing enum
 *
 * @param schema - JSON schema to transform (from zodToJsonSchema())
 * @returns Transformed schema compatible with Gemini response_schema parameter
 * @example
 * // Before transformation (Layer 1):
 * { type: "number", enum: [4, 6, 8] }
 *
 * // After transformation (Layer 2):
 * { type: "string", enum: ["4", "6", "8"] }
 */
export function transformSchemaForGeminiResponseSchema(
  schema: unknown
): unknown {
  if (typeof schema !== "object" || schema === null) {
    return schema;
  }

  if (Array.isArray(schema)) {
    return schema.map((item) => transformSchemaForGeminiResponseSchema(item));
  }

  const result: Record<string, unknown> = {};
  let hasEnum = false;

  for (const [key, value] of Object.entries(schema as Record<string, unknown>)) {
    if (key === "enum" && Array.isArray(value)) {
      // Convert all enum values to strings
      result[key] = value.map((v) => String(v));
      hasEnum = true;
    } else if (typeof value === "object" && value !== null) {
      result[key] = transformSchemaForGeminiResponseSchema(value);
    } else {
      result[key] = value;
    }
  }

  // If this object has an enum, ensure type is "string"
  if (hasEnum && "type" in result) {
    result["type"] = "string";
  }

  return result;
}
