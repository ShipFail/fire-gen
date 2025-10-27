// functions/src/assisted-mode/validate-json.ts

/**
 * Post-process: JSON Validation
 *
 * Validate JSON against model's Zod schema.
 */

/**
 * Convert string enum values back to their original types.
 * Gemini returns all enums as strings, but some models (like Veo)
 * expect numeric enums.
 *
 * @param obj - Object to transform
 * @returns Object with converted enum values
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
