/**
 * Serialize an error for JSON logging.
 * 
 * Error objects have non-enumerable properties (message, stack, name) and serialize 
 * to {} by default when passed to JSON.stringify() or Firebase Functions logger.
 * 
 * This utility extracts error properties into a plain object for proper logging.
 * 
 * @param err - Unknown error object from catch block
 * @returns Plain object with error details suitable for JSON serialization
 * 
 * @example
 * ```typescript
 * try {
 *   throw new Error("Something failed");
 * } catch (err) {
 *   logger.error("Operation failed", { error: serializeError(err) });
 *   // Logs: { error: { name: "Error", message: "Something failed", stack: "..." } }
 * }
 * ```
 */
export function serializeError(err: unknown): Record<string, unknown> {
  if (err instanceof Error) {
    const result: Record<string, unknown> = {
      name: err.name,
      message: err.message,
      stack: err.stack,
    };
    
    // Include nested cause if present (ES2022 Error.cause)
    const errWithCause = err as Error & {cause?: unknown};
    if (errWithCause.cause) {
      result.cause = serializeError(errWithCause.cause);
    }
    
    return result;
  }

  // Non-Error values (strings, numbers, objects, etc.)
  return {raw: String(err)};
}
