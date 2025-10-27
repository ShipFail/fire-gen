// functions/src/assisted-mode/validate-json.ts

/**
 * Post-process: JSON Validation
 *
 * Validate JSON against model's Zod schema.
 *
 * **Two-Layer Schema Architecture - Reverse Transformation**
 *
 * This module handles Layer 2 → Layer 1 conversion:
 * - Layer 2: Gemini returns JSON with string enums (e.g., durationSeconds: "8")
 * - Layer 1: Model API expects correct types (e.g., durationSeconds: 8)
 *
 * @see transformSchemaForGeminiResponseSchema in zod-utils.ts for forward transformation
 */

/**
 * Convert string enum values back to their original types.
 *
 * Converts Layer 2 (Gemini Response) → Layer 1 (Model API).
 *
 * **Why This Is Needed:**
 * - Gemini response_schema requires all enums as strings
 * - Model APIs (Veo, etc.) expect integer types for numeric fields
 * - This function bridges the gap by converting strings back to numbers
 *
 * **Current Conversions:**
 * - durationSeconds: "4" | "6" | "8" → 4 | 6 | 8
 *
 * **Adding New Conversions:**
 * When adding new models with numeric enums, add field name checks here.
 * Pattern: `if (key === "fieldName" && typeof value === "string")`
 *
 * @param obj - Object from Gemini (with string enums)
 * @returns Object with converted numeric enums (ready for Zod validation)
 * @example
 * // Input (Layer 2 - from Gemini):
 * { durationSeconds: "8" }
 *
 * // Output (Layer 1 - for Model API):
 * { durationSeconds: 8 }
 */
function convertStringEnumsToNumbers(obj: unknown): unknown {
  if (typeof obj !== "object" || obj === null) {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map((item) => convertStringEnumsToNumbers(item));
  }

  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
    // Known numeric enum fields
    if (key === "durationSeconds" && typeof value === "string") {
      const num = Number(value);
      result[key] = isNaN(num) ? value : num;
    } else if (typeof value === "object" && value !== null) {
      result[key] = convertStringEnumsToNumbers(value);
    } else {
      result[key] = value;
    }
  }

  return result;
}

/**
 * Validate JSON with Zod schema.
 *
 * Throws if validation fails.
 */
export function validateFinalJson(
  jsonWithTags: Record<string, unknown>,
  zodSchema: any, // Zod schema
  jobId: string,
): Record<string, unknown> {
  try {
    // Convert string enum values back to numbers where needed
    const converted = convertStringEnumsToNumbers(jsonWithTags) as Record<string, unknown>;
    const validated = zodSchema.parse(converted);
    return validated;
  } catch (error) {
    throw new Error(`[${jobId}] JSON validation failed: ${error}`);
  }
}
