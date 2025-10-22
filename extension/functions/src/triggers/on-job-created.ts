// functions/src/triggers/on-job-created.ts
import {getDatabase} from "firebase-admin/database";
import {onValueCreated} from "firebase-functions/v2/database";
import * as logger from "firebase-functions/logger";

import {REGION} from "../env.js";
import {startJob, analyzeAndTransformJob} from "../job-orchestrator.js";
import type {JobNode} from "../types/index.js";

/**
 * RTDB onCreate trigger for job creation.
 * Supports two modes:
 * 1. AI-Assisted Mode: Client writes a string (natural language prompt)
 * 2. Explicit Mode: Client writes a structured JobNode object
 *
 * Security Model:
 * - RTDB rules require authentication for all client writes
 * - If event.auth is null, write MUST be from Admin SDK (bypasses rules)
 * - Clients cannot fake admin access (rules block unauthenticated writes)
 */
export const onFiregenJobCreated = onValueCreated(
  {ref: `firegen-jobs/{jobId}`, region: REGION},
  async (event) => {
    const jobId = event.params.jobId;
    const db = getDatabase();
    const jobPath = `firegen-jobs/${jobId}`;
    const jobRef = db.ref(jobPath);

    const value = event.data.val();

    // Get uid from auth context (if available)
    // Note: event.auth is only available if RTDB security rules check 'auth != null'
    const uid = (event as any).auth?.uid;

    // Admin SDK Write Detection
    // Logic: If write succeeded but auth is null → Admin SDK (bypassed rules)
    // RTDB rules require auth for client writes, so null auth = admin only
    if (!uid) {
      logger.info("Admin SDK write detected", {
        jobId,
        valueType: typeof value,
      });

      const adminUid = "admin-console";

      // Admin AI-Assisted Mode: string prompt
      if (typeof value === "string") {
        // Validate prompt
        if (!value || value.trim().length === 0) {
          logger.warn("Empty prompt rejected", {jobId});
          await jobRef.set({
            uid: adminUid,
            status: "failed",
            response: {
              error: {
                message: "Empty prompt provided",
                code: "INVALID_PROMPT",
              },
            },
          });
          return;
        }

        if (value.length > 10000) {
          logger.warn("Prompt too long", {jobId, length: value.length});
          await jobRef.set({
            uid: adminUid,
            status: "failed",
            response: {
              error: {
                message: "Prompt too long (max 10000 characters)",
                code: "INVALID_PROMPT",
              },
            },
          });
          return;
        }

        logger.info("Admin AI-assisted job", {
          jobId,
          promptLength: value.length,
        });
        await analyzeAndTransformJob(jobId, value, adminUid, jobRef);
        return;
      }

      // Admin Explicit Mode: structured object
      if (typeof value === "object" && value !== null) {
        const job = value as any;

        // Use provided uid or default to admin uid
        if (!job.uid) {
          logger.info("Injecting admin uid", {jobId});
          job.uid = adminUid;
        }

        // Process if valid structure
        if (job.status === "requested" && job.request) {
          await startJob(jobId, job as JobNode);
          return;
        }

        // Invalid structure
        logger.warn("Invalid admin job structure", {
          jobId,
          status: job.status,
          hasRequest: !!job.request,
        });
        return;
      }

      // Invalid admin write type
      logger.error("Invalid admin write type", {jobId, type: typeof value});
      await jobRef.set({
        status: "failed",
        response: {
          error: {
            message:
              "Invalid job format. Provide either a string (natural language prompt) or a structured JobNode object.",
            code: "INVALID_FORMAT",
          },
        },
      });
      return;
    }

    // Authenticated Client Write
    // RTDB rules have already validated auth != null
    logger.info("Authenticated client write", {jobId, uid});

    // Client AI-Assisted Mode: string prompt
    if (typeof value === "string") {
      // Validate prompt
      if (!value || value.trim().length === 0) {
        logger.warn("Empty prompt rejected", {jobId, uid});
        await jobRef.set({
          uid,
          status: "failed",
          response: {
            error: {
              message: "Empty prompt provided",
              code: "INVALID_PROMPT",
            },
          },
        });
        return;
      }

      if (value.length > 10000) {
        logger.warn("Prompt too long", {jobId, uid, length: value.length});
        await jobRef.set({
          uid,
          status: "failed",
          response: {
            error: {
              message: "Prompt too long (max 10000 characters)",
              code: "INVALID_PROMPT",
            },
          },
        });
        return;
      }

      logger.info("Client AI-assisted job", {
        jobId,
        uid,
        promptLength: value.length,
      });
      await analyzeAndTransformJob(jobId, value, uid, jobRef);
      return;
    }

    // Client Explicit Mode: structured object
    if (typeof value === "object" && value !== null) {
      const job = value as any;

      // Inject uid if missing (for backward compatibility)
      if (!job.uid) {
        logger.info("Injecting uid from auth context", {jobId, uid});
        job.uid = uid;
      }

      // Validate uid matches auth (security check - defense in depth)
      if (job.uid !== uid) {
        logger.error("UID mismatch - security violation", {
          jobId,
          requestUid: job.uid,
          authUid: uid,
        });
        await jobRef.set({
          status: "failed",
          response: {
            error: {
              message: "UID mismatch - you can only create jobs for yourself",
              code: "UID_MISMATCH",
            },
          },
        });
        return;
      }

      // Process normally if job has correct structure
      if (job.status === "requested" && job.request) {
        await startJob(jobId, job as JobNode);
        return;
      }

      // Invalid structure (has status/request but not in correct state)
      logger.warn("Job in unexpected state", {
        jobId,
        status: job.status,
        hasRequest: !!job.request,
      });
      return;
    }

    // Invalid value type
    logger.error("Invalid job value type", {jobId, type: typeof value});
    await jobRef.set({
      status: "failed",
      response: {
        error: {
          message:
            "Invalid job format. Provide either a string (natural language prompt) or a structured JobNode object.",
          code: "INVALID_FORMAT",
        },
      },
    });
  }
);
