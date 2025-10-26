// functions/src/types/index.ts
// System-level types only (model-specific types moved to models/)

// Import internal types needed for JobNode definition
import type {JobStatus, JobMetadata, FileInfo, JobError, AssistedData} from "./common.js";

// Only export types that are used by external modules
export type {FileInfo} from "./common.js";

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
  assisted?: AssistedData;                  // AI-assisted mode data (only present if AI analyzer was used)
  metadata: JobMetadata;                    // Job metadata (timestamps, version, polling info, etc.)
}
