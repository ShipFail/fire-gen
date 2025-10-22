// functions/src/types/common.ts

/** Job status lifecycle */
export type JobStatus =
  | "requested"
  | "starting"
  | "running"
  | "succeeded"
  | "failed"
  | "expired"
  | "canceled";

/** Job metadata (backend-only fields) */
export interface JobMeta {
  operation?: string;      // Vertex AI operation name (for async operations like Veo)
  attempt: number;         // Poll attempts
  nextPoll: number;        // Next poll timestamp ms
  ttl: number;             // Job expiration timestamp ms
  lastError?: number;      // Last error timestamp ms
  // AI-Assisted Mode fields
  prompt?: string;         // Original natural language prompt (for AI-assisted jobs)
  aiAssisted?: boolean;    // Flag indicating job was created via AI-assisted mode
  analyzedAt?: number;     // Timestamp when AI analysis completed (ms)
  reasons?: string[];      // AI reasoning chain from analyzer (Step 1 candidates, Step 2 selection, validation errors)
}

/** Job error response */
export interface JobError {
  message: string;
  code?: string;
}

/** Generic job response */
export interface JobResponse {
  uri?: string;            // gs://... (ephemeral, 24h lifetime - for backend copy/delete operations)
  url?: string;            // https://storage.googleapis.com/...?Expires=... (signed URL, 25h expiry, file deleted after 24h)
  text?: string;           // Text output (for text generation and STT only)
  error?: JobError;
  metadata?: Record<string, unknown>; // Model-specific metadata
}
