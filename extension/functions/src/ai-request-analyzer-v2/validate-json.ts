// functions/src/ai-request-analyzer-v2/validate-json.ts

/**
 * Post-process: JSON Validation
 *
 * Validate JSON against model's Zod schema.
 */

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
    const validated = zodSchema.parse(jsonWithTags);
    return validated;
  } catch (error) {
    throw new Error(`[${jobId}] JSON validation failed: ${error}`);
  }
}
