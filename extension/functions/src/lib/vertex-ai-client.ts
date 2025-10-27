// functions/src/lib/vertex-ai-client.ts
import {GoogleAuth} from "google-auth-library";
import {PROJECT_ID} from "../firebase-admin.js";
import {REGION} from "../env.js";
import * as logger from "firebase-functions/logger";

/**
 * Direct Vertex AI REST API client.
 *
 * Matches official Vertex AI API schema exactly:
 * https://cloud.google.com/vertex-ai/generative-ai/docs/model-reference
 *
 * Request format:
 * {
 *   "instances": [{ ... }],  // Model-specific input
 *   "parameters": { ... }     // Model-specific config
 * }
 */

const auth = new GoogleAuth({
  scopes: ["https://www.googleapis.com/auth/cloud-platform"],
});

/**
 * Operation response from async prediction APIs
 */
export interface VertexAIOperation {
  name: string;
  metadata?: Record<string, unknown>;
  done?: boolean;
  error?: {
    code: number;
    message: string;
    details?: unknown[];
  };
  response?: Record<string, unknown>;
}

/**
 * Call Vertex AI prediction API (async long-running operations)
 */
export async function predictLongRunning(
  model: string,
  payload: {
    instances: Array<Record<string, unknown>>;
    parameters?: Record<string, unknown>;
  }
): Promise<VertexAIOperation> {
  const endpoint = `v1beta1/projects/${PROJECT_ID}/locations/${REGION}/publishers/google/models/${model}:predictLongRunning`;
  return callVertexAPI<VertexAIOperation>(endpoint, payload);
}

/**
 * Get operation status
 */
export async function getOperation(operationName: string): Promise<VertexAIOperation> {
  const token = await auth.getAccessToken();
  const endpoint = `https://${REGION}-aiplatform.googleapis.com/v1beta1/${operationName}`;

  const response = await fetch(endpoint, {
    method: "GET",
    headers: {
      "Authorization": `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Vertex AI operation status error: ${response.status} ${response.statusText} - ${errorBody}`);
  }

  return response.json() as Promise<VertexAIOperation>;
}

/**
 * Response from synchronous prediction APIs
 */
export interface VertexAIPredictResponse {
  predictions: Array<Record<string, unknown>>;
  metadata?: Record<string, unknown>;
}

/**
 * Call Vertex AI prediction API (synchronous)
 * Used for models like Imagen that return results immediately.
 */
export async function predict(
  model: string,
  payload: {
    instances: Array<Record<string, unknown>>;
    parameters?: Record<string, unknown>;
  }
): Promise<VertexAIPredictResponse> {
  const endpoint = `v1/projects/${PROJECT_ID}/locations/${REGION}/publishers/google/models/${model}:predict`;
  return callVertexAPI<VertexAIPredictResponse>(endpoint, payload);
}

/**
 * Remove Vertex AI unsupported JSON Schema fields (defense-in-depth safety layer).
 *
 * Schemas should be generated correctly using:
 *   zodToJsonSchema(schema, { $refStrategy: "none", target: "openApi3" })
 *
 * This function acts as a runtime safety net for edge cases and handles
 * unavoidable transformations required by Vertex AI API limitations.
 *
 * Transformations:
 * - $schema, $ref: Removed (should not be generated with proper zodToJsonSchema options)
 * - const: Converted to enum with single value (Vertex AI API limitation - unavoidable)
 */
function stripSchemaFields(obj: unknown): unknown {
  if (obj === null || typeof obj !== "object") {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(stripSchemaFields);
  }

  const result: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(obj)) {
    // Skip unsupported fields
    if (key === "$schema" || key === "$ref") {
      continue;
    }

    // Convert 'const' to 'enum' with single value (Vertex AI compatible)
    if (key === "const") {
      result["enum"] = [value];
      continue;
    }

    result[key] = stripSchemaFields(value);
  }
  return result;
}/**
 * Generic REST API call to any Vertex AI endpoint.
 * Returns raw JSON response - model adapters handle type casting.
 */
export async function callVertexAPI<T = unknown>(
  endpoint: string,
  payload: Record<string, unknown>
): Promise<T> {
  const token = await auth.getAccessToken();
  const fullEndpoint = `https://${REGION}-aiplatform.googleapis.com/${endpoint}`;

  // Strip $schema fields from payload (Vertex AI doesn't accept them)
  const cleanedPayload = stripSchemaFields(payload) as Record<string, unknown>;

  logger.debug("Vertex AI API request", {
    endpoint: fullEndpoint,
    payload: cleanedPayload,
  });

  const response = await fetch(fullEndpoint, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(cleanedPayload),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    logger.error("Vertex AI API error", {
      status: response.status,
      statusText: response.statusText,
      body: errorBody,
    });
    throw new Error(`Vertex AI API error: ${response.status} ${response.statusText} - ${errorBody}`);
  }

  const result = await response.json() as T;

  logger.debug("Vertex AI API response", {
    endpoint: fullEndpoint,
  });

  return result;
}
