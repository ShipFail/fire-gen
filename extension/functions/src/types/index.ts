// functions/src/types/index.ts
// System-level types only (model-specific types moved to models/)

export * from "./common.js";

import type {JobStatus, JobMeta, JobResponse} from "./common.js";

/**
 * JobRequest moved to models/index.ts
 * Import from models instead: import type {JobRequest} from "../models/index.js"
 */

/** Complete job node structure in RTDB */
export interface JobNode {
  uid: string;
  status: JobStatus;
  request: any; // Use models/index.ts JobRequest type
  response?: JobResponse;
  _meta?: JobMeta;
}
