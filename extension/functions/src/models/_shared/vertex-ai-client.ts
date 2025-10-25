// functions/src/models/_shared/vertex-ai-client.ts
import {GoogleAuth} from "google-auth-library";
import {PROJECT_ID} from "../../firebase-admin.js";
import {REGION} from "../../env.js";
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
  const token = await auth.getAccessToken();
  const endpoint = `https://${REGION}-aiplatform.googleapis.com/v1beta1/projects/${PROJECT_ID}/locations/${REGION}/publishers/google/models/${model}:predictLongRunning`;

  logger.debug("Vertex AI predictLongRunning request", {
    model,
    endpoint,
    payload,
  });

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
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

  const result = await response.json() as VertexAIOperation;

  logger.debug("Vertex AI predictLongRunning response", {
    operationName: result.name,
    done: result.done,
  });

  return result;
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
  const token = await auth.getAccessToken();
  const endpoint = `https://${REGION}-aiplatform.googleapis.com/v1/projects/${PROJECT_ID}/locations/${REGION}/publishers/google/models/${model}:predict`;

  logger.debug("Vertex AI predict request", {
    model,
    endpoint,
    payload,
  });

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
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

  const result = await response.json() as VertexAIPredictResponse;

  logger.debug("Vertex AI predict response", {
    predictionsCount: result.predictions?.length,
  });

  return result;
}
