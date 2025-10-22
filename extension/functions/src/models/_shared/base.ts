// functions/src/models/_shared/base.ts
import type {OperationResult} from "../../poller.js";

// JobRequest is validated via Zod schemas in each adapter
type JobRequest = any;

/**
 * Model adapter output after successful generation.
 */
export interface ModelOutput {
  uri?: string;             // GCS URI of generated output (omitted for text/STT)
  text?: string;            // Text output (for text generation and STT only)
  metadata?: Record<string, unknown>; // Model-specific metadata
}

/**
 * Start operation result.
 * For async operations (Veo): returns operation name for polling.
 * For sync operations (Nano Banana): returns immediately with output.
 */
export interface StartResult {
  operationName?: string;   // For async operations (polling required)
  output?: ModelOutput;     // For sync operations (immediate result)
}

/**
 * Abstract model adapter interface.
 * All AI model integrations must implement this interface.
 */
export interface ModelAdapter {
  /**
   * Start the generation operation.
   * Returns operation name for async models, or output directly for sync models.
   */
  start(request: JobRequest, jobId: string): Promise<StartResult>;

  /**
   * Poll an async operation until complete.
   * Only required for async models (e.g., Veo).
   * Sync models (e.g., Nano Banana) can skip this.
   */
  poll?(operationName: string): Promise<OperationResult>;

  /**
   * Extract output from completed operation result.
   * Only required for async models.
   */
  extractOutput?(result: OperationResult, jobId: string): Promise<ModelOutput>;
}
