// functions/src/types/index.ts
// System-level types only (model-specific types moved to models/)

export * from "./common.js";

import type {JobStatus, JobMetadata, FileInfo, JobError} from "./common.js";

/**
 * JobRequest moved to models/index.ts
 * Import from models instead: import type {JobRequest} from "../models/index.js"
 */

/** Complete job node structure in RTDB */
export interface JobNode {
  uid: string;
  model: string;                            // Model identifier (e.g., "veo-3.1-fast-generate-preview")
  status: JobStatus;
  request: Record<string, unknown>;         // Raw request sent to model
  response?: Record<string, unknown>;       // Raw response from model
  files?: Record<string, FileInfo>;         // Generated files (file0.mp4, file1.png, etc.)
  error?: JobError;                         // System errors (model errors in response.error)
  metadata: JobMetadata;                    // Job metadata (timestamps, version, AI reasoning, etc.)
}
