# Veo Operation Polling Fix

## Problem Summary

Publisher model operations (Veo models) were failing with 400 Bad Request errors when polling operation status:

```json
{
  "error": {
    "code": 400,
    "message": "The Operation ID must be a Long, but was instead: c6b74db3-8524-45d6-8234-8851fb91af4c",
    "status": "INVALID_ARGUMENT"
  }
}
```

## Root Cause

Publisher model operations (like Veo) use a **different API endpoint** than standard Vertex AI operations:

- **Standard operations**: Use `GET /v1beta1/{operationName}` (operations.get)
- **Publisher models**: Use `POST /v1beta1/{resourceName}:fetchPredictOperation` (custom endpoint)

The standard operations API expects numeric operation IDs, but publisher models return UUID-based operation IDs, causing the rejection.

## Solution

Based on [Google's official @google/genai SDK](https://github.com/googleapis/js-genai/blob/main/src/operations.ts#L175-L203), we now:

1. **Detect publisher model operations** by checking if the operation name contains `/publishers/`
2. **Extract the resource name** by splitting on `/operations/`
3. **Use the correct endpoint**: `POST {resourceName}:fetchPredictOperation`
4. **Send operation name in request body**: `{"operationName": "..."}`

### Code Changes

**File**: `extension/functions/src/lib/vertex-ai-client.ts`

```typescript
export async function getOperation(operationName: string): Promise<VertexAIOperation> {
  const token = await auth.getAccessToken();

  // Check if this is a publisher model operation (contains /publishers/)
  const isPublisherModel = operationName.includes("/publishers/");
  
  if (isPublisherModel) {
    // Publisher model operations use a special fetchPredictOperation endpoint
    // Extract resource name (everything before /operations/)
    const resourceName = operationName.split("/operations/")[0];
    
    const endpoint = `https://${REGION}-aiplatform.googleapis.com/v1beta1/${resourceName}:fetchPredictOperation`;

    const response = await fetch(endpoint, {
      method: "POST",  // fetchPredictOperation uses POST, not GET
      headers: {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        operationName: operationName,
      }),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`Vertex AI fetchPredictOperation error: ${response.status} ${response.statusText} - ${errorBody}`);
    }

    return response.json() as Promise<VertexAIOperation>;
  }

  // For standard Vertex AI operations (non-publisher models)
  const endpoint = `https://${REGION}-aiplatform.googleapis.com/v1beta1/${operationName}`;
  // ... standard GET request
}
```

## Example

For operation name:
```
projects/123/locations/us-central1/publishers/google/models/veo-2.0-generate-001/operations/abc-123
```

We now make a **POST request** to:
```
https://us-central1-aiplatform.googleapis.com/v1beta1/projects/123/locations/us-central1/publishers/google/models/veo-2.0-generate-001:fetchPredictOperation
```

With body:
```json
{
  "operationName": "projects/123/locations/us-central1/publishers/google/models/veo-2.0-generate-001/operations/abc-123"
}
```

## Reference

- Google's official SDK implementation: https://github.com/googleapis/js-genai/blob/main/src/operations.ts
- Vertex AI API documentation: https://cloud.google.com/vertex-ai/generative-ai/docs/model-reference

## Testing

All 64 tests pass ✅
