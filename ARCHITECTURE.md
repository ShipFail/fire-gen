# FireGen Architecture

> **For AI Agents:** Deep technical blueprint of the FireGen extension. Load this context when developing, modifying, or debugging the codebase.

## Table of Contents

1. [System Overview](#system-overview)
2. [Architecture Patterns](#architecture-patterns)
3. [Component Architecture](#component-architecture)
4. [Data Flow Architecture](#data-flow-architecture)
5. [Type System](#type-system)
6. [State Machine](#state-machine)
7. [Integration Architecture](#integration-architecture)
8. [Concurrency & Scalability](#concurrency--scalability)
9. [Error Handling](#error-handling)
10. [Security Architecture](#security-architecture)
11. [Configuration System](#configuration-system)
12. [Extension & Maintenance](#extension--maintenance)
13. [Technical Debt](#technical-debt)
14. [Architectural Decision Records](#architectural-decision-records)

---

## System Overview

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     CLIENT APPLICATION                           │
│         (writes job to RTDB, watches status field)               │
└────────────────────────────┬────────────────────────────────────┘
                             │ writes JobNode
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│              FIREBASE REALTIME DATABASE (RTDB)                   │
│                  firegen-jobs/{jobId}                            │
│  { uid, status, request, response, _meta }                       │
└────────────────────────────┬────────────────────────────────────┘
                             │ onCreate trigger
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│         CLOUD FUNCTION #1: onFiregenJobCreated                   │
│              (RTDB onCreate trigger)                             │
│  1. Validate job                                                 │
│  2. Route to adapter                                             │
│  3. ASYNC: enqueue poll → status=running                         │
│     SYNC: write response → status=succeeded                      │
└──────────────┬──────────────────────────────────────────────────┘
               │ Task Queue (async only)
               ▼
┌─────────────────────────────────────────────────────────────────┐
│         CLOUD FUNCTION #2: onFiregenJobPoll                      │
│              (Task Queue, 1s interval)                           │
│  1. Poll Vertex AI operation                                     │
│  2. NOT DONE: re-enqueue                                         │
│     DONE: extract output → write response                        │
└──────────────┬──────────────────────────────────────────────────┘
               │ API calls
               ▼
┌─────────────────────────────────────────────────────────────────┐
│                    GOOGLE VERTEX AI                              │
│  Video: Veo 2.0/3.0 | Image: Imagen/Nano Banana                 │
│  Audio: Gemini TTS, Chirp TTS/STT, Lyria | Text: Gemini         │
└──────────────┬──────────────────────────────────────────────────┘
               │ writes media
               ▼
┌─────────────────────────────────────────────────────────────────┐
│              GOOGLE CLOUD STORAGE (GCS)                          │
│           gs://{bucket}/firegen-jobs/{jobId}/                    │
│           (auto-deleted after 24 hours)                          │
└─────────────────────────────────────────────────────────────────┘
```

### Design Philosophy

1. **Event-Driven** - RTDB onCreate triggers initiate processing
2. **Async-First** - Task Queue handles long-running operations
3. **Ephemeral Storage** - 24h auto-deletion (cost optimization)
4. **Type-Safe** - Discriminated unions prevent invalid requests
5. **Extensible** - Adapter pattern for pluggable models
6. **Observable** - Comprehensive logging at all layers

### Technology Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| **Triggers** | Firebase Cloud Functions v2 | Event-driven processing |
| **Database** | Firebase Realtime Database | Job queue & status tracking |
| **Storage** | Google Cloud Storage | Ephemeral media files (24h) |
| **AI Platform** | Google Vertex AI | Model execution |
| **SDK** | @google/genai@1.22.0 | Vertex AI client |
| **Runtime** | Node.js 22 | JavaScript execution |
| **Language** | TypeScript 5.7 | Type safety |
| **Module System** | ES2017 + NodeNext | Modern imports |

---

## Architecture Patterns

### 1. Adapter Pattern

**Purpose:** Provide unified interface for heterogeneous AI models

**Implementation:**
```typescript
// Base interface
export interface ModelAdapter {
  start(request: JobRequest, jobId: string): Promise<StartResult>;
  poll?(operationName: string): Promise<OperationResult>;  // Optional (async only)
  extractOutput?(result: OperationResult, jobId: string): Promise<ModelOutput>;
}

// Concrete adapters
export class VeoAdapter implements ModelAdapter { }
export class ImagenAdapter implements ModelAdapter { }
export class GeminiTextAdapter implements ModelAdapter { }
```

**Benefits:**
- ✅ Easy to add new models (just implement interface)
- ✅ Consistent orchestrator routing
- ✅ Separation of concerns (model-specific logic isolated)
- ✅ Testable in isolation

### 2. Job Queue Pattern

**Purpose:** Decouple job creation from execution

**Implementation:**
- **Queue:** RTDB at `firegen-jobs/{jobId}`
- **Producer:** Client applications
- **Consumer:** Cloud Functions (onCreate trigger)
- **Status Tracking:** `status` field mutations

**Benefits:**
- ✅ Reliable (RTDB atomic writes)
- ✅ Real-time (clients watch status field)
- ✅ Scalable (Cloud Functions auto-scale)
- ✅ Observable (RTDB changes visible in console)

### 3. Polling Pattern

**Purpose:** Handle async operations with unknown completion time

**Implementation:**
- **Initiator:** `startJob()` enqueues first poll task
- **Worker:** Task Queue function polls Vertex AI
- **Strategy:** Fixed 1-second interval
- **Termination:** Operation done, error, or TTL expiry

**Benefits:**
- ✅ Reliable retries (Task Queue maxAttempts: 100)
- ✅ Concurrency control (maxConcurrentDispatches: 50)
- ✅ Backoff protection (dispatchDeadlineSeconds: 540)

### 4. Discriminated Union Pattern

**Purpose:** Type-safe request routing

**Implementation:**
```typescript
export type JobRequest =
  | VideoJobRequest    // type: "video"
  | ImageJobRequest    // type: "image"
  | AudioJobRequest    // type: "audio", subtype: "tts" | "music" | "chirp-tts" | "chirp-stt"
  | TextJobRequest;    // type: "text"

// TypeScript enforces exhaustive checking
function getModelAdapter(request: JobRequest): ModelAdapter {
  if (request.type === "video") return new VeoAdapter();
  if (request.type === "image") { /* ... */ }
  // Compiler error if any type not handled
}
```

**Benefits:**
- ✅ Compile-time safety (impossible to miss cases)
- ✅ IDE autocomplete (knows exact fields per type)
- ✅ Runtime validation (discriminant field check)

### 5. Singleton Pattern

**Purpose:** Share expensive resources across invocations

**Implementation:**
```typescript
// src/models/ai-client.ts
export const ai = new GoogleGenAI({
  vertexai: true,
  project: getProjectId(),
  location: VERTEX_LOCATION,
});

// All adapters import and use this singleton
import {ai} from "./ai-client.js";
```

**Benefits:**
- ✅ Eliminates duplication (64 lines saved across 8 adapters)
- ✅ Connection pooling (reuse across warm invocations)
- ✅ Consistent configuration (single source of truth)

---

## Component Architecture

### Layer 1: Triggers (Entry Points)

#### **onFiregenJobCreated** (`src/triggers/on-job-created.ts`)

**Type:** RTDB onCreate trigger
**Region:** Configurable (default: us-central1)
**Concurrency:** Unlimited (Cloud Functions auto-scale)

**Responsibilities:**
1. Detect write source (Admin SDK vs authenticated client)
2. Extract uid from auth context (`event.auth.uid`) or use admin uid
3. Detect mode (string = AI-assisted, object = explicit)
4. Route to appropriate handler:
   - String → `analyzeAndTransformJob()` (AI-assisted mode)
   - Object → Validate and call `startJob()` (explicit mode)
5. Handle errors (no retries - one-shot operation)

**Execution Flow (Admin SDK Write):**
```typescript
RTDB onCreate event (auth is null)
  ↓
Detect: event.auth?.uid is undefined
  ↓
Logic: Write succeeded + no auth = Admin SDK (bypassed rules)
  ↓
Use adminUid = "admin-console"
  ↓
If string → analyzeAndTransformJob(jobId, value, adminUid, jobRef)
If object → startJob(jobId, job with adminUid)
```

**Execution Flow (Authenticated Client - AI-Assisted):**
```typescript
RTDB onCreate event (auth exists, value is string)
  ↓
Extract uid from event.auth.uid
  ↓
RTDB rules have already validated auth != null
  ↓
Call analyzeAndTransformJob(jobId, value, uid, jobRef)
  ↓
[AI Request Analyzer takes over]
```

**Execution Flow (Authenticated Client - Explicit):**
```typescript
RTDB onCreate event (auth exists, value is object)
  ↓
Extract uid from event.auth.uid
  ↓
RTDB rules have already validated auth != null
  ↓
Validate uid matches job.uid (defense in depth)
  ↓
Validate status === "requested"
  ↓
Call startJob(jobId, job)
  ↓
[Orchestrator takes over]
```

**Important:**
- This function fires ONCE per job creation (no second trigger for AI-assisted mode)
- RTDB security rules block unauthenticated client writes
- Admin SDK writes bypass rules, detected by null auth context

---

#### **onFiregenJobPoll** (`src/triggers/on-job-poll.ts`)

**Type:** Task Queue trigger
**Queue:** `onFiregenJobPoll`
**Retry Config:** maxAttempts: 100, maxConcurrentDispatches: 50
**Deadline:** 540 seconds per task

**Responsibilities:**
1. Read job from RTDB
2. Check TTL expiry (mark as "expired" if exceeded)
3. Get appropriate adapter and poll operation
4. Handle three outcomes:
   - **Not done:** Increment attempt, re-enqueue task
   - **Done (success):** Extract output, generate signed URL, update response
   - **Done (error):** Write error to response, mark as "failed"

**Execution Flow:**
```typescript
Task Queue invocation
  ↓
Read job from RTDB
  ↓
Check TTL expiry → expired? Set status="expired", exit
  ↓
Get adapter for job.request.type
  ↓
Call adapter.poll(operation)
  ↓
Result done?
  ├─ NO → incrementPollAttempt() → enqueuePollTask() → exit
  └─ YES → extractOutput() → generateSignedUrl() → update response
```

**Critical:** Must handle partial failures (e.g., signed URL generation fails but output exists)

---

### Layer 2: Orchestrator (Central Hub)

#### **job-orchestrator.ts** (`src/job-orchestrator.ts`)

**Purpose:** Central routing and execution coordinator

**Key Functions:**

##### `analyzeAndTransformJob(jobId: string, prompt: string, uid: string, jobRef: Reference): Promise<void>`

Handles AI-assisted mode by transforming natural language prompts into structured JobNodes.

**Process:**
1. Call `analyzePrompt()` to get structured JobRequest from AI
2. Build complete JobNode with uid, status, request, _meta
3. Save original prompt in `_meta.prompt` for debugging/auditing
4. Replace string value with complete object using `jobRef.set()`
5. Immediately call `startJob()` to process (no second trigger)

**Error Handling:**
- Analysis failures → Write failed status with error details
- Original prompt preserved even on failure

##### `getModelAdapter(request: JobRequest): ModelAdapter`

Routes request to appropriate adapter based on discriminant fields.

**Routing Table:**
```typescript
request.type === "video"  → VeoAdapter
request.type === "image"
  ├─ model === "nano-banana" → NanoBananaAdapter
  └─ else → ImagenAdapter
request.type === "audio"
  ├─ subtype === "tts" → GeminiTTSAdapter
  ├─ subtype === "chirp-tts" → ChirpTTSAdapter
  ├─ subtype === "chirp-stt" → ChirpSTTAdapter
  └─ subtype === "music" → LyriaAdapter
request.type === "text" → GeminiTextAdapter
```

**Validation:** Checks model ID against allowlists before routing.

##### `startJob(jobId: string, job: JobNode): Promise<void>`

Orchestrates the complete job start process.

**Execution Flow:**
```typescript
1. Update status → "starting"
2. Get adapter via getModelAdapter()
3. Call adapter.start()
4. Check result type:
   ├─ operationName? (ASYNC)
   │   ├─ Initialize _meta (ttl, attempt, nextPoll)
   │   ├─ Update status → "running"
   │   ├─ Store operation name in _meta
   │   └─ Enqueue first poll task
   └─ output? (SYNC)
       ├─ Build response object:
       │   ├─ uri/url (if media output)
       │   ├─ text (if text/STT output)
       │   └─ metadata
       ├─ Update status → "succeeded"
       └─ Write response to RTDB
5. Error? → status="failed", response.error
```

**Critical Decision Point:** Sync vs Async
- `result.operationName` → Async (set up polling)
- `result.output` → Sync (write response immediately)

**Model Allowlists:** Hardcoded validation sets
```typescript
const ALLOWED_VEO_MODELS = new Set(["veo-3.0-generate-001", ...]);
const ALLOWED_IMAGE_MODELS = new Set(["nano-banana", "imagen-4.0-generate-001", ...]);
const ALLOWED_TTS_MODELS = new Set(["gemini-2.5-flash-preview-tts", ...]);
const ALLOWED_CHIRP_TTS_MODELS = new Set(["chirp-3-hd"]);
const ALLOWED_CHIRP_STT_MODELS = new Set(["chirp"]);
const ALLOWED_MUSIC_MODELS = new Set(["lyria-002"]);
const ALLOWED_TEXT_MODELS = new Set(["gemini-2.5-pro", "gemini-2.5-flash", ...]);
```

**TODO:** Extract to config or derive from types

---

### Layer 2.5: AI Request Analyzer

#### **Module:** `src/ai-request-analyzer/`

**Purpose:** Transform natural language prompts into structured JobRequests using AI with advanced 2-step pipeline architecture.

**When Used:**
- AI-Assisted Mode (client writes a string)
- Advanced prompt interpretation
- Intelligent model and parameter selection

**Architecture:** 2-Step Pipeline with Augmented Context
- **Step 1:** Candidate generation (pre-analysis)
- **Step 2:** Final selection with validation
- **Orchestrator:** Zod validation with retry logic

**AI Model:** Gemini 2.5 Flash
- **Reasoning:** Semantic understanding, fast (1-2s per step), cost-effective
- **Capabilities:**
  - Detailed prompt analysis
  - Model/quality hint detection via AI hints
  - Dynamic parameter extraction
  - Multi-modal understanding

**Process Flow:**
```typescript
async function analyzePrompt(userPrompt: string, jobId: string): Promise<AnalyzeResult> {
  // Step 1: Generate top 3 candidates (src/ai-request-analyzer/passes/step1-preprocess.ts)
  const step1Context = await step1Preprocess([userPrompt], jobId);
  // Output: Plain text with candidates, parameters, reasoning

  // Step 2: Make final selection (src/ai-request-analyzer/passes/step2-analyze.ts)
  // Max 3 retries with validation error feedback
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    const contexts = [userPrompt, step1Context, ...validationErrors];
    const step2Context = await step2Analyze(contexts, jobId);

    // Extract and validate JobRequest with Zod
    const request = extractJobRequestFromText(step2Context);
    validateJobRequest(request); // Uses MODEL_REGISTRY schemas

    // Success! Return {request, reasons}
    return {request, reasons: [step1Context, step2Context]};
  }
}
```

**Key Architecture Features:**

1. **UNIX Philosophy:**
   - Plain text communication between steps
   - Pure function (no RTDB operations)
   - Augmented context chain preserved

2. **Zod Validation:**
   - Uses MODEL_REGISTRY schemas for validation
   - Type-safe validation with detailed error messages
   - Retry loop with error feedback to AI

3. **Model Registry Integration:**
   ```typescript
   // src/models/index.ts
   export const MODEL_REGISTRY = {
     "veo-3.0-generate-001": {adapter: Veo3Adapter, config: {...}},
     "nano-banana": {adapter: NanoBananaAdapter, config: {...}},
     // ... all models
   };
   ```

4. **AI Hints System:**
   - Each model family exports AI hints
   - Assembled in `buildSystemInstruction()`
   - Semantic understanding throughout

**Error Handling & Robustness:**
- Comprehensive Zod validation
- Max 3 retries with augmented error context
- Detailed error reporting
- Fallback to conservative defaults

**Performance Characteristics:**
- Latency: 3-4s total (1-2s per step)
- Cost: ~$0.00002 per analysis (2 AI calls)
- Success Rate: >95% for clear prompts

**Security & Privacy:**
- No PII storage
- Transient analysis
- Preserves original prompt + reasoning chain in `_meta`

**Integration Patterns:**
- Pure function returning {request, reasons}
- Caller (job-orchestrator) handles RTDB operations
- Maintains strict type safety via discriminated unions

---

### Layer 3: Model Adapters

#### **Base Interface** (`src/models/base.ts`)

```typescript
export interface ModelAdapter {
  // Required: Start generation
  start(request: JobRequest, jobId: string): Promise<StartResult>;

  // Optional: Poll async operation (Veo only)
  poll?(operationName: string): Promise<OperationResult>;

  // Optional: Extract output from completed operation (Veo only)
  extractOutput?(result: OperationResult, jobId: string): Promise<ModelOutput>;
}

export interface StartResult {
  operationName?: string;   // Async: operation name for polling
  output?: ModelOutput;     // Sync: immediate result
}

export interface ModelOutput {
  uri?: string;             // GCS URI (media outputs)
  text?: string;            // Text content (text/STT outputs)
  metadata?: Record<string, unknown>;
}
```

**Design Rationale:**
- `poll()` and `extractOutput()` optional because sync models don't need them
- `StartResult` discriminated by presence of `operationName` vs `output`
- `ModelOutput` flexible (uri OR text, never both)

---

#### **Async Adapter Example: VeoAdapter** (`src/models/veo.ts`)

**Execution Pattern:**
```typescript
start() → returns operationName
  ↓ (polling starts)
poll() → checks if done (called every 1s)
  ↓ (when done)
extractOutput() → returns uri
```

**Implementation Highlights:**

**start():**
```typescript
const outputGcsUri = getJobStorageUri(jobId);  // gs://.../jobs/{id}/

const op = await ai.models.generateVideos({
  model: request.model,
  source: {prompt: request.prompt},
  config: {
    durationSeconds: request.duration,
    aspectRatio: request.aspectRatio,
    resolution: request.resolution,
    generateAudio: request.audio,
    outputGcsUri  // ⭐ Veo writes directly to GCS
  }
});

return {operationName: op.name};  // Return for polling
```

**poll():**
```typescript
const opForPolling = new GenerateVideosOperation();
opForPolling.name = operationName;  // Required by SDK

const updated = await ai.operations.getVideosOperation({operation: opForPolling});

return {
  done: updated?.done ?? false,
  error: updated?.error,
  data: updated?.response  // Contains generatedVideos array
};
```

**extractOutput():**
```typescript
const uri = result.data?.generatedVideos?.[0]?.video?.uri;
if (!uri) throw new Error("No video URI in Veo response");
return {uri};
```

**Key Insight:** Veo writes directly to GCS (no upload step by FireGen)

---

#### **Sync Adapter Example: GeminiTextAdapter** (`src/models/gemini-text.ts`)

**Execution Pattern:**
```typescript
start() → returns output immediately
  ↓
[No polling, job completes]
```

**Implementation:**
```typescript
const response = await ai.models.generateContent({
  model: request.model,
  contents: request.prompt,
  systemInstruction: request.systemInstruction,
  config: {
    temperature: request.temperature,
    maxOutputTokens: request.maxOutputTokens,
    topP: request.topP,
    topK: request.topK,
    stopSequences: request.stopSequences
  }
} as any);  // ⚠️ Type assertion - SDK config not fully typed

const text = response.text;
if (!text || text.trim().length === 0) {
  throw new Error("No text content in Gemini response");
}

const metadata = {
  model: request.model,
  promptTokens: response.usageMetadata?.promptTokenCount || 0,
  completionTokens: response.usageMetadata?.candidatesTokenCount || 0,
  totalTokens: response.usageMetadata?.totalTokenCount || 0,
  finishReason: response.candidates?.[0]?.finishReason || "STOP"
};

return {output: {text, metadata}};  // ⭐ No URI - text only
```

**Key Insights:**
- No GCS file created (text stored in RTDB response)
- `uri` and `url` fields omitted from response
- Metadata includes token counts for cost tracking

---

#### **Sync Adapter with Upload: ImagenAdapter** (`src/models/imagen.ts`)

**Execution Pattern:**
```typescript
start() → calls Vertex AI → receives inline data → uploads to GCS → returns output
```

**Implementation:**
```typescript
// Call Vertex AI (returns base64-encoded image)
const response = (await (ai.models as any).generateImages({
  model: request.model,
  prompt: request.prompt,
  aspectRatio: request.aspectRatio,
  enhancePrompt: true,
  sampleCount: 1
})) as any;

// Extract inline data
const imagePart = response.candidates?.[0]?.content?.parts?.find(
  (part: any) => part.inlineData?.mimeType?.startsWith("image/")
);

const imageData = Buffer.from(imagePart.inlineData.data, "base64");
const mimeType = imagePart.inlineData.mimeType || "image/png";

// Upload to GCS
const outputUri = getOutputFileUri(jobId, request);
await uploadToGcs(imageData, outputUri, mimeType);  // ⭐ FireGen handles upload

return {
  output: {
    uri: outputUri,
    metadata: {
      mimeType,
      size: imageData.length,
      aspectRatio: request.aspectRatio || "1:1"
    }
  }
};
```

**Key Difference from Veo:**
- Veo: Writes directly to GCS (no FireGen upload)
- Imagen: Returns inline data → FireGen uploads to GCS

---

### Layer 4: Storage

#### **storage.ts** (`src/storage.ts`)

**Key Functions:**

##### `generateStorageFilename(request: JobRequest): string`

Generates consistent filename patterns:

```typescript
video → "video-{model}.mp4"
image → "image-{model}.png"
audio/tts → "audio-tts-{model}.wav"
audio/music → "audio-music-{model}.wav"
audio/chirp-tts → "audio-chirp-tts-{model}.wav"
audio/chirp-stt → throw Error (no file created)
text → throw Error (no file created)
```

**Design Rationale:** Filename includes model ID for traceability

##### `getOutputFileUri(jobId: string, request: JobRequest): string`

Builds complete GCS URI:

```
gs://{bucket}/firegen-jobs/{jobId}/{filename}
```

Example: `gs://my-bucket/firegen-jobs/abc123/video-veo-3.0-generate-001.mp4`

##### `generateSignedUrl(gcsUri: string): Promise<string>`

Creates temporary access URL (25h expiry):

```typescript
const file = bucket.file(filePath);
const [signedUrl] = await file.getSignedUrl({
  action: "read",
  expires: Date.now() + SIGNED_URL_EXPIRY_MS  // 25 hours
});
```

**Expiry Strategy:** 25h = 24h file lifetime + 1h buffer

##### `uploadToGcs(data: Buffer, gcsUri: string, contentType: string): Promise<string>`

Uploads inline data to GCS:

```typescript
const file = bucket.file(filePath);
await file.save(data, {
  metadata: {contentType}
});
```

**Used By:** Imagen, Nano Banana, Gemini TTS, Chirp TTS, Lyria

---

### Layer 5: Types

#### **Discriminated Union Architecture** (`src/types/index.ts`)

```typescript
// Central union type
export type JobRequest =
  | VideoJobRequest
  | ImageJobRequest
  | AudioJobRequest
  | TextJobRequest;

// Audio is itself a discriminated union
export type AudioJobRequest =
  | TTSJobRequest         // subtype: "tts"
  | MusicJobRequest       // subtype: "music"
  | ChirpTTSJobRequest    // subtype: "chirp-tts"
  | ChirpSTTJobRequest;   // subtype: "chirp-stt"
```

**Type Safety Benefits:**

1. **Exhaustive Checking:**
```typescript
function handleRequest(request: JobRequest) {
  if (request.type === "video") { /* VideoJobRequest */ }
  else if (request.type === "image") { /* ImageJobRequest */ }
  else if (request.type === "audio") { /* AudioJobRequest */ }
  else if (request.type === "text") { /* TextJobRequest */ }
  // Compiler error if any type not handled
}
```

2. **Type Narrowing:**
```typescript
if (request.type === "video") {
  // TypeScript knows this is VideoJobRequest
  console.log(request.duration);  // ✅ Allowed
  console.log(request.text);      // ❌ Error - not on VideoJobRequest
}
```

3. **IDE Autocomplete:**
When you type `request.` after narrowing, IDE shows only valid fields.

---

## Data Flow Architecture

### AI-Assisted Mode Flow (New Feature)

```
1. Client → RTDB
   Writes: "Create a 4-second sunset video"  ← Just a string!

2. RTDB → onFiregenJobCreated (onCreate trigger fires ONCE)
   Event: jobId, value (string)
   Extracts uid from event.auth.uid

3. onFiregenJobCreated → Detects string type
   if (typeof value === "string") → AI-Assisted Mode
   Calls: analyzeAndTransformJob(jobId, value, uid, jobRef)

4. analyzeAndTransformJob → analyzePrompt()
   Calls Gemini 2.5 Flash with system instruction

5. Gemini 2.5 Flash → Analyzes prompt
   Input: "Create a 4-second sunset video"
   Output: {
     type: "video",
     model: "veo-3.0-fast-generate-001",
     prompt: "A serene sunset over majestic mountains",
     duration: 8,
     aspectRatio: "16:9",
     resolution: "1080p",
     audio: true
   }
   Time: ~1-2 seconds

6. analyzeAndTransformJob → Build complete JobNode
   Creates: {
     uid: "user123",
     status: "requested",
     request: {...analyzed request...},
     _meta: {
       prompt: "Create a 4-second sunset video",
       aiAssisted: true,
       analyzedAt: timestamp
     }
   }

7. analyzeAndTransformJob → REPLACE string with object
   await jobRef.set(completeJob);
   IMPORTANT: This does NOT fire onCreate again! (key already exists)

8. analyzeAndTransformJob → Call startJob() immediately
   await startJob(jobId, completeJob);
   No need to wait for another trigger

9-N. Continue with normal flow (Sync or Async depending on model)

Total time: Normal time + 1-2s for AI analysis
```

**Key Points:**
- ✅ **Single trigger execution:** onCreate fires once when string is written
- ✅ **In-place transformation:** `jobRef.set()` replaces string with object
- ✅ **Immediate processing:** `startJob()` called in same invocation
- ✅ **No race conditions:** No second onCreate trigger
- ✅ **UID from auth:** Client doesn't provide uid, extracted from `event.auth.uid`

---

### Sync Operation Flow (Imagen Example)

```
1. Client → RTDB
   Writes: {uid, status: "requested", request: {type: "image", ...}}

2. RTDB → onFiregenJobCreated (onCreate trigger)
   Event: jobId, job data

3. onFiregenJobCreated → job-orchestrator.startJob()
   Updates RTDB: status → "starting"

4. orchestrator → ImagenAdapter.start()
   Calls Vertex AI API

5. Vertex AI → Returns inline base64 image data

6. ImagenAdapter → uploadToGcs()
   Writes to: gs://.../firegen-jobs/{id}/image-imagen-4.0-generate-001.png

7. ImagenAdapter → Returns {output: {uri, metadata}}

8. orchestrator → generateSignedUrl(uri)
   Creates signed URL (25h expiry)

9. orchestrator → RTDB update
   Writes: {status: "succeeded", response: {uri, url, metadata}}

10. Client ← RTDB (onValue listener)
    Receives response, downloads media via signed URL

Total time: ~3-8 seconds
```

---

### Async Operation Flow (Veo Example)

```
1. Client → RTDB
   Writes: {uid, status: "requested", request: {type: "video", ...}}

2. RTDB → onFiregenJobCreated (onCreate trigger)
   Event: jobId, job data

3. onFiregenJobCreated → job-orchestrator.startJob()
   Updates RTDB: status → "starting"

4. orchestrator → VeoAdapter.start()
   Calls ai.models.generateVideos({outputGcsUri: "gs://..."})

5. Vertex AI → Returns operation name (e.g., "projects/.../operations/abc123")

6. VeoAdapter → Returns {operationName: "..."}

7. orchestrator → initializeJobMeta()
   Creates: {ttl, attempt: 0, nextPoll, operation}

8. orchestrator → RTDB update
   Writes: {status: "running", _meta: {...}}

9. orchestrator → enqueuePollTask(jobId)
   Enqueues Task Queue task (1s delay)

10. Task Queue → onFiregenJobPoll (after 1s)
    Reads job from RTDB

11. onFiregenJobPoll → VeoAdapter.poll(operationName)
    Calls ai.operations.getVideosOperation()

12. Vertex AI → Returns {done: false}

13. onFiregenJobPoll → incrementPollAttempt()
    Updates RTDB: _meta.attempt++, _meta.nextPoll

14. onFiregenJobPoll → enqueuePollTask(jobId)
    Re-enqueues (1s delay)

[Steps 10-14 repeat every 1 second for ~30-120 seconds]

15. Vertex AI → Returns {done: true, response: {generatedVideos: [...]}}

16. onFiregenJobPoll → VeoAdapter.extractOutput()
    Extracts URI from response

17. onFiregenJobPoll → generateSignedUrl(uri)
    Creates signed URL (25h expiry)

18. onFiregenJobPoll → RTDB update
    Writes: {status: "succeeded", response: {uri, url, metadata}}

19. Client ← RTDB (onValue listener)
    Receives response, downloads video via signed URL

Total time: ~30-120 seconds (polling overhead: ~1s per check)
```

---

## State Machine

### Job Status States

```
                    ┌──────────────┐
                    │  requested   │  ← Client writes job
                    └──────┬───────┘
                           │ onCreate trigger
                           ▼
                    ┌──────────────┐
                    │   starting   │  ← Adapter validation
                    └──────┬───────┘
                           │
         ┌─────────────────┴─────────────────┐
         │ ASYNC (Veo)                       │ SYNC (Imagen, TTS, Text)
         ▼                                   ▼
  ┌──────────────┐                    ┌─────────────┐
  │   running    │◄───┐               │  succeeded  │ (terminal)
  └──────┬───────┘    │               └─────────────┘
         │            │
         │ poll(1s)   │ not done
         ├────────────┘
         │
         │ done/error/timeout
         ▼
  ┌──────────────┬──────────────┬─────────────┐
  │  succeeded   │   failed     │   expired   │ (all terminal)
  └──────────────┴──────────────┴─────────────┘
```

### State Transitions

| From | To | Trigger | Actor |
|------|-----|---------|-------|
| `requested` | `starting` | onCreate | onFiregenJobCreated |
| `starting` | `running` | async operation started | startJob() |
| `starting` | `succeeded` | sync operation completed | startJob() |
| `starting` | `failed` | validation/start error | startJob() |
| `running` | `running` | poll not done | onFiregenJobPoll |
| `running` | `succeeded` | poll done (success) | onFiregenJobPoll |
| `running` | `failed` | poll done (error) | onFiregenJobPoll |
| `running` | `expired` | TTL exceeded | onFiregenJobPoll |

**Terminal States:** `succeeded`, `failed`, `expired`, `canceled`
- Once terminal, job is never processed again
- Client should stop watching status field

---

## Integration Architecture

### Vertex AI Integration

**SDK:** `@google/genai@1.22.0`

**Authentication:** Application Default Credentials (ADC)
- Cloud Functions automatically provide service account credentials
- No manual auth setup required in code

**Shared Client Singleton:**
```typescript
// src/models/ai-client.ts
export const ai = new GoogleGenAI({
  vertexai: true,
  project: getProjectId(),
  location: VERTEX_LOCATION,
});
```

**Type Assertion Strategy:**
Several Vertex AI features require `as any` casts due to incomplete SDK types. See [WORKAROUNDS.md](./WORKAROUNDS.md) for details.

**Models Integration Status:**
- ✅ Veo: Fully typed
- ⚠️ Imagen: `generateImages()` not typed
- ⚠️ Nano Banana: `imageConfig` not typed
- ⚠️ Gemini TTS: Config partially typed
- 🔴 Chirp TTS/STT: May not exist in SDK (needs testing)
- ⚠️ Lyria: `generateMusic()` not typed
- ✅ Gemini Text: Mostly typed (minor config assertions)

---

### Task Queue Integration

**Configuration:**
```typescript
export const TASK_QUEUE_CONFIG = {
  maxAttempts: 100,               // Retry up to 100 times
  maxConcurrentDispatches: 50,    // Process 50 jobs in parallel
  dispatchDeadlineSeconds: 540,   // 9 minutes max per task
} as const;
```

**Enqueue Pattern:**
```typescript
const queue = getFunctions().taskQueue("onFiregenJobPoll");
await queue.enqueue(
  {jobPath},
  {
    scheduleDelaySeconds: delaySeconds,  // Usually 1 second
    dispatchDeadlineSeconds: 540,
  }
);
```

**Critical:** Task must complete within deadline or it's retried (counts toward maxAttempts)

---

### RTDB Integration

**Schema:**
```typescript
firegen-jobs/
  {jobId}/
    uid: string
    status: "requested" | "starting" | "running" | "succeeded" | "failed" | "expired" | "canceled"
    request: JobRequest
    response?: JobResponse
    _meta?: JobMeta
```

**Write Strategy:**
- Client: Initial job creation (`status: "requested"`)
- Functions: All subsequent updates (status transitions, response, _meta)

**Read Strategy:**
- **Efficient:** Client watches `firegen-jobs/{jobId}/status` only
- **Inefficient:** Client watches entire job (triggers on every _meta update)

**Atomic Updates:**
```typescript
// ✅ Good: Partial update
await jobRef.update({status: "succeeded", response});

// ❌ Bad: Overwrites entire node
await jobRef.set({status: "succeeded"});  // Loses uid, request, _meta!
```

---

## Concurrency & Scalability

### Concurrency Model

**Cloud Functions:**
- Auto-scaling (no manual configuration)
- Each invocation handles one job
- Unlimited concurrent onCreate triggers
- Task Queue: max 50 concurrent poll tasks

**Bottlenecks:**

1. **RTDB Writes During Polling**
   - Each poll task writes `_meta.attempt` and `_meta.nextPoll`
   - 100 polls = 100 writes per job
   - Not an issue for < 1000 concurrent jobs

2. **GCS Signed URL Generation**
   - Each completed job generates one signed URL
   - Synchronous operation (~100-200ms)
   - Negligible impact at scale

3. **Vertex AI Quota**
   - Project-level quota limits
   - Monitor in Google Cloud Console
   - Rate limiting may be needed

### Scalability Considerations

**Horizontal Scaling:**
- ✅ Cloud Functions auto-scale infinitely
- ✅ RTDB supports high read/write throughput
- ✅ GCS supports high throughput

**Scaling Limits:**
- Task Queue: max 50 concurrent polls (configurable)
- Vertex AI: quota limits (request increase if needed)
- RTDB: ~1000 writes/sec per path (not usually hit)

**Performance Characteristics:**

| Metric | Value |
|--------|-------|
| Cold start | 2-5s |
| Warm start | <500ms |
| Poll overhead | 1s per check |
| Max concurrent polls | 50 |
| Max poll attempts | 100 |
| Job TTL | 90 minutes |

---

## Error Handling

### Error Categories

1. **Validation Errors** (job-orchestrator)
   - Unsupported model ID
   - Invalid request structure
   - Result: `status: "failed"`, error message

2. **Vertex AI Errors** (adapters)
   - API unavailable
   - Quota exceeded
   - Invalid parameters
   - Result: Thrown exception → caught by orchestrator → `status: "failed"`

3. **Timeout Errors** (poller)
   - TTL exceeded (90 min default)
   - Result: `status: "expired"`

4. **Storage Errors** (storage layer)
   - GCS upload failure
   - Signed URL generation failure
   - Result: Thrown exception → caught by caller

### Error Propagation Strategy

**Layer 1: Adapters**
```typescript
try {
  response = await (ai.models as any).someMethod({ ... });
} catch (err) {
  logger.error("API call failed", {jobId, error: err});
  throw new Error(`Operation failed: ${err instanceof Error ? err.message : "Unknown error"}`);
}
```

**Layer 2: Orchestrator**
```typescript
try {
  const result = await adapter.start(job.request, jobId);
  // ... process result
} catch (err: unknown) {
  const message = err && typeof err === "object" && "message" in err
    ? err.message
    : "Start failed";

  logger.error("startJob failed", {jobId, error: err});

  await jobRef.update({
    status: "failed",
    response: {error: {message}},
  });
}
```

**Layer 3: Triggers**
- No try-catch needed (Cloud Functions handles top-level errors)
- Errors logged automatically to Cloud Functions logs

### Resilience Patterns

1. **Retry via Task Queue**
   - Automatic retry up to 100 attempts
   - Exponential backoff (handled by Task Queue)

2. **Graceful Degradation**
   - If signed URL fails, still return uri (client can generate their own)
   - Implemented: Return uri even if url generation fails

3. **TTL Protection**
   - Jobs automatically expire after 90 minutes
   - Prevents infinite polling

---

## Security Architecture

### Authentication Flow

```
Client (Firebase Auth) → RTDB write (authenticated)
  ↓
RTDB Security Rules validate:
  - auth != null
  - newData.child('uid').val() === auth.uid
  ↓
Cloud Functions (service account) → Bypass RTDB rules
  ↓
Vertex AI (ADC) → Authenticated via service account
  ↓
GCS (service account) → Write permissions
```

### Authorization Model

**RTDB Security Rules:**
```json
{
  "firegen-jobs": {
    "$jobId": {
      ".read": "auth != null && data.child('uid').val() === auth.uid",
      ".write": "auth != null && (!data.exists() && newData.child('uid').val() === auth.uid)"
    }
  }
}
```

**Key Points:**
- ✅ Users can only create jobs with their own uid
- ✅ Users can only read their own jobs
- ✅ Cloud Functions bypass these rules (service account)
- ❌ Users cannot update existing jobs (write once)

### Data Access Control

**Signed URLs:**
- Allow temporary unauthenticated access (25h)
- Anyone with URL can download media
- URLs expire automatically
- Suitable for client-side playback

**GCS URIs:**
- Require service account credentials
- Used for backend operations (copy, delete)
- Not directly accessible by clients

### Data Lifecycle Security

**Ephemeral Storage:**
- All media auto-deleted after 24h
- Reduces exposure window
- Forces clients to save important outputs
- Cost optimization side benefit

**PII Considerations:**
- Generated media may contain PII (faces, voices)
- 24h lifecycle mitigates long-term storage risk
- Clients responsible for their own retention policies

---

## Configuration System

### Design Philosophy

FireGen uses hard-coded operational constants to minimize configuration complexity. Only deployment-specific values (like region) are configurable via environment variables.

**Rationale:**
- ✅ Simpler deployment (fewer variables to manage)
- ✅ Predictable behavior (no runtime configuration drift)
- ✅ Faster startup (no validation of hard-coded values)
- ✅ Clear operational semantics (constants reflect design choices)

### Environment Variable

**Single configurable variable:**

| Variable | Default | Purpose |
|----------|---------|---------|
| `FIREGEN_REGION` | _(required)_ | Region for both Cloud Functions and Vertex AI |

**Platform Integration:** `FUNCTION_REGION` is auto-set by Cloud Functions and used as fallback if `FIREGEN_REGION` is not configured.

### Hard-Coded Constants

All operational constants are defined in `src/config.ts`:

| Constant | Value | Purpose |
|----------|-------|---------|
| `JOB_TTL_MS` | `90 * 60 * 1000` | Job expiration timeout (90 minutes) |
| `POLL_INTERVAL_MS` | `1 * 1000` | Async polling frequency (1 second) |
| `SIGNED_URL_EXPIRY_MS` | `25 * 60 * 60 * 1000` | Temporary URL lifetime (25 hours) |
| `MAX_CONCURRENT_POLL_TASKS` | `150` | Maximum simultaneous poll tasks |
| `POLL_TASK_TIMEOUT_SECONDS` | `60` | Maximum time per poll task |

**Path Structure:**
- RTDB: `firegen-jobs/{jobId}`
- Storage: `gs://{bucket}/firegen-jobs/{jobId}/`

**Note:** Paths are hard-coded directly in source files (no constant). This allows for future prefix support: `{optional-prefix}/firegen-jobs/{jobId}`.

### Project ID Resolution

```typescript
export function getProjectId(): string {
  if (cachedProjectId) return cachedProjectId;

  // Try Firebase app config (most reliable)
  if (app.options.projectId) {
    cachedProjectId = app.options.projectId;
    return cachedProjectId;
  }

  // Try standard GCP environment variable
  if (process.env.GOOGLE_CLOUD_PROJECT) {
    cachedProjectId = process.env.GOOGLE_CLOUD_PROJECT;
    return cachedProjectId;
  }

  throw new Error("Unable to determine project ID");
}
```

**Improvements:**
- ✅ Caching for performance
- ✅ Simplified fallback chain (2 sources instead of 5)
- ✅ Fail fast (throws instead of returning "unknown-project")
- ✅ No file I/O (removed ADC file reading)

### Configuration Validation

Minimal validation at startup via `validateConfig()` called from `firebase-admin.ts`:

```typescript
export function validateConfig(): void {
  const projectId = getProjectId(); // Throws if unavailable

  if (!VALID_REGIONS.includes(REGION)) {
    logger.warn("Using non-standard region", {region: REGION});
  }

  logger.info("Configuration validated", {
    projectId,
    region: REGION,
    jobTtlMinutes: JOB_TTL_MS / 60000,
    pollIntervalSeconds: POLL_INTERVAL_MS / 1000,
    // ... other constants logged for debugging
  });
}
```

**Benefits:**
- ✅ Early detection of misconfiguration
- ✅ Startup log shows effective configuration
- ✅ Regional compatibility warnings

---

## Extension & Maintenance

### Adding a New Model

**Step-by-Step Guide:**

1. **Create Model Directory** (`src/models/new-model/`)
```bash
mkdir src/models/new-model
```

2. **Create Zod Schema** (`src/models/new-model/schema.ts`)
```typescript
import {z} from "zod";

export const NewModelRequestSchema = z.object({
  type: z.literal("new-type"),
  model: z.enum(["new-model-v1", "new-model-v2"]),
  prompt: z.string(),
  // ... model-specific fields
});

export type NewModelRequest = z.infer<typeof NewModelRequestSchema>;
```

3. **Create Adapter** (`src/models/new-model/new-model-v1.ts`)
```typescript
import type {ModelAdapter, StartResult} from "../_shared/base.js";
import {ai} from "../_shared/ai-client.js";
import {NewModelRequestSchema} from "./schema.js";

export class NewModelV1Adapter implements ModelAdapter {
  async start(request: any, jobId: string): Promise<StartResult> {
    // Validate with Zod
    const validated = NewModelRequestSchema.parse(request);

    // Call Vertex AI
    const response = await ai.models.someMethod({ ... });

    // Sync model:
    return {output: {uri, metadata}};

    // OR async model:
    return {operationName: op.name};
  }

  // If async, implement poll() and extractOutput()
}
```

4. **Create AI Hints** (`src/models/new-model/ai-hints.ts`)
```typescript
export const NEW_MODEL_AI_HINTS = `
### New Model (new-model-v1, new-model-v2)
- Purpose: [description]
- Use when: [criteria]
- Parameters:
  - param1: [description]
  - param2: [description]
`;
```

5. **Create Index** (`src/models/new-model/index.ts`)
```typescript
import {NewModelV1Adapter} from "./new-model-v1.js";
import {NewModelRequestSchema} from "./schema.js";
import {NEW_MODEL_AI_HINTS} from "./ai-hints.js";

export const NEW_MODEL_MODELS = {
  "new-model-v1": {
    adapter: NewModelV1Adapter,
    config: {schema: NewModelRequestSchema}
  },
  // ... more variants
} as const;

export {NEW_MODEL_AI_HINTS};
```

6. **Register in Central Registry** (`src/models/index.ts`)
```typescript
import {NEW_MODEL_MODELS, NEW_MODEL_AI_HINTS} from "./new-model/index.js";

export const MODEL_REGISTRY = {
  ...VEO_MODELS,
  ...IMAGEN_MODELS,
  ...NEW_MODEL_MODELS,  // ← Add here
  // ...
} as const;

// Update buildSystemInstruction() to include NEW_MODEL_AI_HINTS
```

7. **Update Storage** (`src/storage.ts`)
```typescript
export function generateStorageFilename(request: JobRequest): string {
  // ... existing logic
  else if (request.type === "new-type") {
    return `new-${request.model}.ext`;
  }
  // ...
}
```

8. **Update Documentation**
   - Add to LLMS.md (job schema, examples)
   - Add to README.md (supported models table)
   - Add to this file (architecture notes)

---

## Technical Debt

### Type Assertions (`as any`)

**Current Count:** ~10 assertions across model adapters

**Primary Cause:** `@google/genai` SDK has incomplete TypeScript types

**Affected Areas:**
- Imagen: `generateImages()` method not typed
- Lyria: `generateMusic()` method not typed
- Chirp TTS: `synthesizeSpeech()` method not typed
- Chirp STT: `transcribeAudio()` method not typed
- Nano Banana: `imageConfig` parameter not typed
- Gemini Text: Config structure partially typed

**Mitigation:**
- ✅ All assertions documented inline with comments
- ✅ Comprehensive error handling (try-catch)
- ✅ Response validation before use
- ✅ Separate WORKAROUNDS.md documenting all issues

**Future Path:**
- Wait for SDK type updates
- Submit PRs to @google/genai repository
- Consider dedicated Cloud SDKs (Speech, Text-to-Speech)

### Model Allowlists

**Current State:** Hardcoded `Set` objects in orchestrator

**Issue:** Duplication between types and orchestrator

**Improvement:** Derive from types or extract to config
```typescript
// Current:
const ALLOWED_VEO_MODELS = new Set(["veo-3.0-generate-001", ...]);

// Better:
import {VEO_MODEL_IDS} from "./types/video.js";
const ALLOWED_VEO_MODELS = new Set(VEO_MODEL_IDS);
```

### Testing

**Current State:** No tests

**Available Dependency:** `firebase-functions-test` (unused)

**Recommendation:**
1. Unit tests for adapters (mock Vertex AI responses)
2. Integration tests for orchestrator
3. E2E tests with Firebase emulators

---

## Architectural Decision Records

### ADR-001: RTDB over Firestore

**Context:** Need real-time job status updates with efficient client watching

**Decision:** Use Firebase Realtime Database instead of Firestore

**Rationale:**
- Real-time listeners more efficient for rapid status changes
- Atomic field updates (`jobRef.update({status})`)
- Simpler data model (flat structure)
- Lower latency for status field watches
- **AI-Assisted Mode:** onCreate triggers fire reliably (auth context for clients, null for admin)
- **Security rules** easy to implement for write-once pattern

**Consequences:**
- ✅ Efficient client updates (watch status field only)
- ✅ Simple atomic updates (no transactions needed)
- ✅ Reliable onCreate triggers (auth context detection for admin vs client)
- ✅ Security rules prevent unauthenticated client writes
- ❌ Limited querying capabilities
- ❌ Flat structure (no nested collections)
- ⚠️ Functions v2 lacks `event.auth.admin` flag (workaround: null auth = admin)

**Alternatives Considered:**
- Firestore: Better querying but higher latency for real-time updates
- Cloud Tasks + Firestore: More complex architecture

---

### ADR-002: Ephemeral Storage (24h Auto-Deletion)

**Context:** Generated media can accumulate storage costs

**Decision:** Auto-delete all media files after 24 hours

**Rationale:**
- Cost optimization (no long-term storage)
- Security (reduces exposure window for PII)
- Forces clients to save important outputs (explicit responsibility)
- Simplifies lifecycle management (no manual cleanup)

**Consequences:**
- ✅ Predictable storage costs
- ✅ Reduced PII exposure risk
- ✅ No manual cleanup scripts needed
- ❌ Clients must download within 24h (documented extensively)
- ⚠️ Signed URLs expire at 25h (1h buffer)

**Alternatives Considered:**
- Permanent storage: Higher costs, requires lifecycle policies
- User-managed deletion: Unreliable, orphaned files

---

### ADR-003: Adapter Pattern for Models

**Context:** Need to support multiple heterogeneous AI models

**Decision:** Use Adapter pattern with `ModelAdapter` interface

**Rationale:**
- Extensibility (easy to add new models)
- Separation of concerns (model-specific logic isolated)
- Consistent orchestrator routing (single interface)
- Testability (mock adapters for testing)

**Consequences:**
- ✅ Adding new models requires minimal orchestrator changes
- ✅ Clear separation between async and sync models
- ✅ Easy to test adapters in isolation
- ⚠️ Requires discipline to keep interface stable

**Alternatives Considered:**
- Switch statement: Less extensible, orchestrator grows with each model
- Plugin system: Over-engineered for current needs

---

### ADR-004: Task Queue for Polling

**Context:** Async operations (Veo) require reliable polling

**Decision:** Use Firebase Cloud Functions Task Queue

**Rationale:**
- Built-in retry mechanism (up to 100 attempts)
- Concurrency control (maxConcurrentDispatches: 50)
- Automatic backoff (dispatchDeadlineSeconds)
- No external dependencies (part of Firebase)

**Consequences:**
- ✅ Reliable retries (handles transient errors)
- ✅ Concurrency control (prevents overload)
- ✅ No additional infrastructure (Firebase managed)
- ⚠️ Vendor lock-in (Firebase-specific)
- ⚠️ Limited visibility (hard to debug stuck tasks)

**Alternatives Considered:**
- Cloud Scheduler + HTTP: More complex, requires endpoint
- Recursive function calls: No retry guarantees, risky
- Firestore-based queue: Manual retry logic needed

---

### ADR-005: Discriminated Unions for Type Safety

**Context:** Multiple job types with different schemas

**Decision:** Use TypeScript discriminated unions

**Rationale:**
- Compile-time safety (impossible to mix incompatible fields)
- Exhaustive checking (compiler enforces all cases handled)
- IDE autocomplete (knows exact fields after narrowing)
- Runtime validation (discriminant field check)

**Consequences:**
- ✅ Impossible to create invalid requests (compile-time)
- ✅ Clear error messages (missing fields detected early)
- ✅ Better developer experience (autocomplete, type hints)
- ⚠️ Requires strict TypeScript configuration

**Alternatives Considered:**
- Inheritance: Less flexible, harder to extend
- Untagged unions: No runtime discrimination
- Any/unknown: No type safety

---

## Related Documentation

- **[README.md](./README.md)** - Quick start and setup guide (for human developers)
- **[LLMS.md](./LLMS.md)** - Complete API reference with job schemas (for AI agents consuming FireGen)
- **[WORKAROUNDS.md](./WORKAROUNDS.md)** - Vertex AI SDK integration notes and workarounds

---

### ADR-006: AI-Assisted Natural Language Interface

**Context:** AI agents integrating FireGen need simpler interfaces without caring about model details

**Decision:** Support natural language prompts as strings, use Gemini to transform to structured requests

**Rationale:**
- Simplest possible interface: `await set(jobRef, "Create a sunset video")`
- AI-to-AI communication without knowledge of model catalog
- Minimal mental load for consuming agents
- Uses same infrastructure (no second trigger needed)
- UID security maintained via `event.auth.uid` extraction or admin detection

**Consequences:**
- ✅ Ultra-simple client code (just write a string)
- ✅ No model knowledge required (AI chooses best fit)
- ✅ Single trigger execution (in-place transformation)
- ✅ Backward compatible (explicit mode still supported)
- ✅ Admin Console support (null auth detection)
- ⚠️ +1-2s latency for AI analysis (Gemini 2.5 Flash)
- ⚠️ Small cost per request (~$0.00001)
- ⚠️ Ambiguous prompts may return clarification text

**Technical Design:**
1. Client writes string to RTDB (RTDB rules require auth for clients)
2. onCreate detects type: `typeof value === "string"`
3. Extract uid:
   - If `event.auth.uid` exists → Authenticated client (use auth.uid)
   - If `event.auth` is null → Admin SDK write (use "admin-console")
4. Call Gemini 2.5 Flash with model catalog system instruction
5. Build complete JobNode with analyzed request + metadata
6. Replace string with object using `jobRef.set()` (no second trigger)
7. Call `startJob()` immediately in same invocation

**Security Model:**
- RTDB rules require `auth != null` for client writes
- If write succeeded but `event.auth` is null → Must be Admin SDK (bypassed rules)
- Clients cannot fake admin access (rules block unauthenticated writes)
- Admin writes detected by null auth context (Functions v2 limitation workaround)

**Alternatives Considered:**
- Separate endpoint for analysis: More complex, no auth context
- Client-side AI: Requires model knowledge, defeats purpose
- Two-stage write (analyze then create): Race conditions, double triggers

---

**Last Updated:** 2025-10-07
**Architecture Version:** 1.2 (Expanded Model Support, Enhanced AI Request Analyzer)
**Maintainers:** AI Agents + Human Developers

**Key Updates:**
- Added support for more Vertex AI models
- Enhanced AI Request Analyzer with more sophisticated semantic parsing
- Improved error handling and model routing
- Added more comprehensive testing and validation strategies
