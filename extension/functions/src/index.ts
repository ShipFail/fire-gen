// functions/src/index.ts
// FireGen - Google Veo Video Generation Extension
// Cloud Function exports

// Initialize Firebase Admin first (triggers validation/logging)
import "./firebase-admin.js";

// Load environment and config (triggers validation/logging)
import "./env.js";
import "./config.js";

// Export all triggers
export { onJobCreated } from "./triggers/on-job-created.js";
export { onJobPoll } from "./triggers/on-job-poll.js";
