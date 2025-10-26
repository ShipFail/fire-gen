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

/** File access information */
export interface FileInfo {
  gs: string;              // GCS URI (gs://bucket/path)
  https: string;           // Signed URL (25h expiry)
  mimeType?: string;       // e.g., "video/mp4", "image/png"
  size?: number;           // File size in bytes
}

/** Job metadata */
export interface JobMetadata {
  version: string;         // FireGen extension version (e.g., "0.1.0")
  createdAt: number;       // Job creation timestamp (ms)
  updatedAt: number;       // Last update timestamp (ms)
  prompt?: string;         // Original natural language prompt (for AI-assisted jobs)
  aiAssisted?: boolean;    // Flag indicating job was created via AI-assisted mode
  reasons?: string[];      // AI reasoning chain from analyzer
  // Polling metadata (for async operations like Veo)
  operation?: string;      // Vertex AI operation name
  attempt?: number;        // Poll attempts
  nextPoll?: number;       // Next poll timestamp ms
  ttl?: number;            // Job expiration timestamp ms
  lastError?: number;      // Last error timestamp ms
}

/** Job error */
export interface JobError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

/** Legacy types for backward compatibility during migration */
/** @deprecated Use JobMetadata instead */
export interface JobMeta extends JobMetadata {}

/** @deprecated Use files field instead */
export interface JobResponse {
  uri?: string;
  url?: string;
  text?: string;
  error?: JobError;
  metadata?: Record<string, unknown>;
}
