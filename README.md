# FireGen - AI Media Generation Extension

> Serverless AI media generation using Google Vertex AI. Supports 17 models across video, image, audio, and text generation through a unified Firebase RTDB job queue.

[![Firebase](https://img.shields.io/badge/Firebase-Cloud%20Functions-orange)](https://firebase.google.com/docs/functions)
[![Vertex AI](https://img.shields.io/badge/Vertex%20AI-Powered-blue)](https://cloud.google.com/vertex-ai)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-22-green)](https://nodejs.org/)
[![SDK Version](https://img.shields.io/badge/Google_GenAI_SDK-1.22.0-purple)](https://www.npmjs.com/package/@google/genai)

## Overview

FireGen is a Firebase Cloud Functions extension that provides serverless AI media generation using Google's Vertex AI models. It manages the complete lifecycle of AI generation requests through a simple RTDB job queue pattern.

**Key Features:**
- 🤖 **AI-Assisted Mode** - Natural language prompts (just write a string!)
- 🎬 **Video Generation** - Veo 2.0/3.0 models (async, 5-8s videos, 720p/1080p)
- 🖼️ **Image Generation** - Imagen 4, Nano Banana (sync, 2K resolution)
- 🎵 **Audio Generation** - Gemini TTS, Chirp TTS/STT, Lyria music generation
- 📝 **Text Generation** - Gemini 2.0/2.5 Pro/Flash/Lite models
- ⏱️ **Async & Sync** - Video polling, instant for other models
- 🔒 **Secure** - User-scoped jobs, signed URLs, auto-cleanup
- 💾 **Ephemeral Storage** - Auto-delete after 24h (cost optimization)

**Supported Models:** 17 models across 5 categories
**Generation Speed:** 1-120 seconds depending on model
**Storage:** Temporary (24h lifetime - must download/copy media)
**Operation Modes:**
- Async for Veo video generation
- Sync for images, audio, text generation

## Quick Start

### Two Ways to Use FireGen

FireGen supports **two modes** for creating jobs:

1. **🤖 AI-Assisted Mode (Recommended for AI agents)** - Just write natural language prompts
2. **🎯 Explicit Mode (Recommended for precision control)** - Write structured requests

#### AI-Assisted Mode - Ultra Simple

```typescript
import {getDatabase, ref, push, set} from "firebase/database";

// Just write a string! AI chooses the best model automatically.
async function createAIJob(prompt: string) {
  const db = getDatabase();
  const jobsRef = ref(db, 'firegen-jobs');
  const newJobRef = push(jobsRef);

  await set(newJobRef, prompt);  // ← Just the string!

  return newJobRef.key;
}

// Examples
await createAIJob("Create a 4-second video of a sunset over mountains");
await createAIJob("Generate a photorealistic portrait of a scientist in a lab");
await createAIJob("Say 'Welcome to FireGen' in a cheerful voice");
```

**How it works:**
- Gemini 2.5 Flash analyzes your prompt (~1-2s)
- Chooses the best model automatically
- Extracts parameters intelligently (duration, aspect ratio, quality)
- Your `uid` extracted securely from auth (no client input needed)

**See [LLMS.md](./LLMS.md#ai-assisted-mode-natural-language-interface) for complete examples.**

#### Explicit Mode - Full Control

```typescript
import {getDatabase, ref, push, set} from "firebase/database";

// Structured request with explicit model choice
const job = {
  uid: user.uid,
  status: "requested",
  request: {
    type: "video",
    model: "veo-3.0-fast-generate-001",
    prompt: "A serene sunset over majestic mountains",
    duration: 5,
    aspectRatio: "16:9",
    resolution: "1080p",
    audio: true
  }
};

const newJobRef = push(ref(db, 'firegen-jobs'));
await set(newJobRef, job);
```

**See [LLMS.md](./LLMS.md#explicit-mode-structured-requests) for job schemas.**

---

### Prerequisites

✅ **Firebase Project** with Blaze (pay-as-you-go) plan
✅ **Firebase Realtime Database** enabled
✅ **Cloud Storage** bucket configured
✅ **Vertex AI API** enabled in Google Cloud
✅ **Node.js 22** installed

### Installation

```bash
# Clone repository
git clone <your-repo>
cd functions

# Install dependencies
npm install

# Build TypeScript
npm run build
```

### Configuration

Create a Firebase project and enable required services:

```bash
# Enable Vertex AI API in Google Cloud Console
gcloud services enable aiplatform.googleapis.com

# Set up Firebase
firebase init functions
firebase init database
firebase init storage
```

### Environment Variables

**Single configurable variable:**

```bash
# Region for both Cloud Functions and Vertex AI
# Resolution order:
# 1. FIREGEN_REGION (explicit override for local development)
# 2. FUNCTION_REGION (auto-set by Cloud Functions in production)
# 3. Default: us-central1
FIREGEN_REGION=us-central1
```

**Hard-coded operational constants:**
- RTDB path: `firegen-jobs/{jobId}`
- Storage path: `gs://{bucket}/firegen-jobs/{jobId}/`
- Job TTL: 90 minutes
- Poll interval: 1 second
- Signed URL expiry: 25 hours
- Max concurrent poll tasks: 150
- Poll task timeout: 60 seconds

**See `src/config.ts`** for complete configuration values.

### Deployment

```bash
# Deploy to Firebase
npm run deploy

# Or deploy with Firebase CLI
firebase deploy --only functions
```

**Deployed Functions:**
1. `onFiregenJobCreated` - RTDB onCreate trigger
2. `onFiregenJobPoll` - Task Queue for async operations

## Project Structure

```
functions/
├── src/
│   ├── index.ts                    # Entry point - exports Cloud Functions
│   ├── firebase-admin.ts           # Firebase Admin SDK initialization
│   ├── config.ts                   # Centralized configuration
│   ├── env.ts                      # Environment variable resolution
│   ├── job-orchestrator.ts         # Central routing hub
│   ├── ai-request-analyzer/        # 🆕 AI prompt analysis (2-step pipeline)
│   │   ├── index.ts                # Main analyzer entry point
│   │   ├── passes/                 # Analysis pipeline passes
│   │   │   ├── step1-preprocess.ts # Candidate generation
│   │   │   └── step2-analyze.ts    # Final selection with validation
│   │   └── url-utils.ts            # URL handling utilities
│   ├── poller.ts                   # Polling utilities (async operations)
│   ├── storage.ts                  # GCS operations (upload, signed URLs)
│   ├── util.ts                     # Helper functions
│   │
│   ├── triggers/                   # Cloud Function triggers
│   │   ├── on-job-created.ts       # RTDB onCreate trigger (mode detection)
│   │   └── on-job-poll.ts          # Task Queue trigger (polling)
│   │
│   ├── models/                     # Model adapters (Adapter Pattern)
│   │   ├── index.ts                # Central MODEL_REGISTRY and exports
│   │   ├── _shared/                # Shared adapter utilities
│   │   │   ├── base.ts             # ModelAdapter interface
│   │   │   ├── ai-client.ts        # Shared GoogleGenAI singleton
│   │   │   └── zod-helpers.ts      # Zod schema helpers
│   │   ├── veo/                    # Video: Veo 2.0/3.0 (async)
│   │   ├── nano-banana/            # Image: Gemini 2.5 Flash (sync)
│   │   ├── imagen/                 # Image: Imagen 4.0 (sync)
│   │   ├── gemini-tts/             # Audio: Gemini TTS (sync)
│   │   ├── chirp/                  # Audio: Chirp TTS/STT (sync)
│   │   ├── lyria/                  # Audio: Lyria music (sync)
│   │   └── gemini-text/            # Text: Gemini 2.0/2.5 (sync)
│   │
│   └── types/                      # TypeScript type definitions
│       ├── index.ts                # Central exports + JobRequest union
│       ├── common.ts               # JobStatus, JobResponse, JobMeta
│       ├── video.ts                # VideoJobRequest, VeoModelId
│       ├── image.ts                # ImageJobRequest, ImageModelId
│       ├── audio.ts                # AudioJobRequest (TTS/STT/Music)
│       └── text.ts                 # TextJobRequest, GeminiTextModelId
│
├── package.json                    # Dependencies (Node 22, Firebase)
├── tsconfig.json                   # TypeScript config (ES2017, strict)
│
├── README.md                       # This file - Quick start guide
├── ARCHITECTURE.md                 # System design deep-dive (for AI agents)
├── LLMS.md                         # API guide for AI coding agents
└── WORKAROUNDS.md                  # Vertex AI SDK integration notes
```

**Organization Principles:**
- ✅ Separation of concerns (triggers, models, types, utilities)
- ✅ Adapter pattern for pluggable model implementations
- ✅ Discriminated unions for type-safe request handling
- ✅ Centralized configuration (single source of truth)
- ✅ Shared AI client (singleton pattern)

## Development

### Build Commands

```bash
# Build TypeScript to JavaScript
npm run build

# Watch mode (rebuild on file changes)
npm run build:watch

# Lint code
npm run lint

# Run local emulator
npm run serve
```

### Local Development

```bash
# Start Firebase emulators
firebase emulators:start --only functions,database,storage

# In another terminal, watch for changes
npm run build:watch
```

### Adding a New Model

1. **Add model ID to types** (`src/types/*.ts`)
2. **Create adapter** (implement `ModelAdapter` interface)
3. **Update orchestrator** routing (`src/job-orchestrator.ts`)
4. **Add to allowlist** (validation in orchestrator)
5. **Update documentation** (LLMS.md, this README)

**Example:**
```typescript
// 1. Add type
export type NewModelId = "new-model-v1";

// 2. Create adapter
export class NewModelAdapter implements ModelAdapter {
  async start(request: JobRequest, jobId: string): Promise<StartResult> {
    // Implementation
  }
}

// 3. Update orchestrator
if (request.type === "new-type") {
  return new NewModelAdapter();
}

// 4. Add to allowlist
const ALLOWED_NEW_MODELS = new Set(["new-model-v1"]);
```

## Supported Models

### Video (3 models - Async)
| Model | Speed | Quality | Operation | Resolution | Notes |
|-------|-------|---------|-----------|------------|-------|
| `veo-3.0-generate-001` | 30-120s | Highest | Async (polling) | 720p/1080p | Best quality, longer generation |
| `veo-3.0-fast-generate-001` | 15-60s | High | Async (polling) | 720p/1080p | Balanced speed/quality |
| `veo-2.0-generate-001` | 30-120s | High | Async (polling) | 720p/1080p | Previous generation |

### Image (4 models - Sync)
| Model | Speed | Quality | Operation | Notes |
|-------|-------|---------|-----------|-------|
| `nano-banana` | 2-5s | Good | Instant | Gemini 2.5 Flash Image, cost-effective |
| `imagen-4.0-generate-001` | 3-8s | Highest | Instant | Imagen 4 (2K, superior text generation) |
| `imagen-4.0-fast-generate-001` | 2-5s | High | Instant | Imagen 4 Fast, balanced quality/speed |
| `imagen-4.0-ultra-generate-001` | 5-12s | Ultra | Instant | Imagen 4 Ultra, most creative |

### Audio - TTS (3 models - Sync)
| Model | Voices | Languages | Operation | Notes |
|-------|--------|-----------|-----------|-------|
| `gemini-2.5-flash-preview-tts` | 30 | 24 | Instant | Natural language control |
| `gemini-2.5-pro-preview-tts` | 30 | 24 | Instant | Higher quality TTS |
| `chirp-3-hd` | 248 | 31 | Instant | Cloud TTS with wide voice range |

### Audio - Other (2 models)
| Model | Type | Operation | Output | Notes |
|-------|------|-----------|--------|-------|
| `chirp` | STT (Speech-to-Text) | Instant | Text | Universal speech recognition |
| `lyria-002` | Music Generation | Instant | 32.8s WAV | Instrumental music creation |

### Text (5 models - Sync)
| Model | Speed | Quality | Operation | Notes |
|-------|-------|---------|-----------|-------|
| `gemini-2.5-pro` | 2-10s | Highest | Instant | Extended reasoning, most powerful |
| `gemini-2.5-flash` | 1-5s | High | Instant | Best price/performance |
| `gemini-2.5-flash-lite` | 1-3s | Good | Instant | Most cost-effective |
| `gemini-2.0-flash` | 1-5s | High | Instant | Latest features |
| `gemini-2.0-flash-lite` | 1-3s | Good | Instant | Low latency |

**See [LLMS.md](./LLMS.md) for complete API reference and job schemas.**

## Key Concepts

### Ephemeral Storage (24h Auto-Deletion)

⚠️ **CRITICAL:** All generated media files are automatically deleted after 24 hours.

**Why:**
- Cost optimization (no long-term storage fees)
- Security (temporary outputs only)
- Forces clients to save important media

**Your Responsibility:**
```typescript
// ✅ REQUIRED: Download media immediately when job succeeds
const response = await fetch(job.response.url);
const blob = await response.blob();
await uploadToYourStorage(blob); // Save to Firebase Storage, S3, etc.
```

**URL Types:**
- `uri`: `gs://bucket/fire-gen/jobs/{id}/video.mp4` (backend operations)
- `url`: `https://storage.googleapis.com/...?Expires=...` (browser playback, expires 25h)

### Job Lifecycle

```
requested → starting → running → succeeded
                    └→ failed
                    └→ expired (TTL)
```

**Status Flow:**
1. **Client creates job** → `status: "requested"`
2. **Function validates** → `status: "starting"`
3. **For async (Veo):** → `status: "running"` → poll every 1s
4. **For sync (Imagen, TTS):** → direct to `succeeded`
5. **Terminal states:** `succeeded`, `failed`, `expired`, `canceled`

### Async vs Sync Operations

**Async (Polling Required):**
- Veo video generation (30-120s)
- Status: `requested` → `starting` → `running` → `succeeded`
- Task Queue polls every 1 second (max 100 attempts)

**Sync (Instant):**
- Images, TTS, Text (1-20s)
- Status: `requested` → `starting` → `succeeded`
- No polling - response written immediately

### Monitoring Jobs Efficiently

⚠️ **IMPORTANT:** Watch the `status` field only, not the entire job node.

**Why:** The `_meta` field updates every second during polling (30-120 times for videos), causing unnecessary bandwidth and re-renders.

**Efficient Pattern:**
```typescript
// ✅ EFFICIENT: Watch status field only
const statusRef = ref(db, `firegen-jobs/${jobId}/status`);
onValue(statusRef, async (snapshot) => {
  const status = snapshot.val();

  if (status === 'succeeded') {
    const jobData = await get(ref(db, `firegen-jobs/${jobId}`));
    const {response} = jobData.val();
    await saveMedia(response.url); // Download immediately!
  }
});

// ❌ INEFFICIENT: Watch entire job (triggers 30-120 times)
onValue(ref(db, `firegen-jobs/${jobId}`), (snapshot) => {
  // Re-renders on every _meta update during polling
});
```

## Configuration Reference

### Environment Variables

**Configurable:**

| Variable | Default | Description |
|----------|---------|-------------|
| `FIREGEN_REGION` | _(required)_ | Region for both Cloud Functions and Vertex AI (use same for low latency) |

**Hard-coded constants:**

| Constant | Value | Description |
|----------|-------|-------------|
| RTDB Path | `firegen-jobs/{jobId}` | Realtime Database job location |
| Storage Path | `firegen-jobs/{jobId}/` | Cloud Storage job directory |
| Job TTL | 90 minutes | Job expiration timeout |
| Poll Interval | 1 second | Async operation polling frequency |
| Signed URL Expiry | 25 hours | Temporary URL lifetime (24h file + 1h buffer) |
| Max Concurrent Polls | 150 | Maximum simultaneous poll tasks |
| Poll Task Timeout | 60 seconds | Maximum time per poll task |

**Note:** In Cloud Functions, `FUNCTION_REGION` is auto-set by the platform and used if `FIREGEN_REGION` is not explicitly configured.

### Firebase Setup Requirements

1. **Blaze Plan** - Pay-as-you-go (required for Cloud Functions)
2. **Realtime Database** - Job queue storage
3. **Cloud Storage** - Temporary media files
4. **Vertex AI API** - Enable in Google Cloud Console
5. **IAM Permissions:**
   - Storage Admin (GCS write/read)
   - Vertex AI User (model access)

### RTDB Security Rules

**Production-Ready Rules (Supports AI-Assisted Mode + Admin Console):**

```json
{
  "rules": {
    "firegen-jobs": {
      "$jobId": {
        ".read": "auth != null && data.child('uid').val() === auth.uid",
        ".write": "auth != null && !data.exists() && (newData.isString() || newData.child('uid').val() === auth.uid)"
      }
    }
  }
}
```

**What these rules do:**
- ✅ **Block unauthenticated client writes** - `auth != null` requirement
- ✅ **AI-Assisted Mode** - `newData.isString()` allows authenticated users to write strings
- ✅ **Explicit Mode** - `newData.child('uid').val() === auth.uid` validates structured objects
- ✅ **Write-once protection** - `!data.exists()` prevents client updates after creation
- ✅ **User isolation** - Users can only read their own jobs
- ✅ **Admin Console support** - Admin SDK bypasses rules (Cloud Function detects via null auth)

**Security Model:**
1. RTDB rules enforce authentication for ALL client writes
2. Admin SDK writes bypass rules (detected by null `event.auth` in Cloud Function)
3. Clients cannot fake admin access (rules block unauthenticated writes)
4. Cloud Functions use special `"admin-console"` uid for admin-initiated jobs

## Documentation

- **[README.md](./README.md)** (this file) - Quick start and setup guide
- **[ARCHITECTURE.md](./ARCHITECTURE.md)** - System design, patterns, data flows (for AI agents)
- **[LLMS.md](./LLMS.md)** - Complete API reference with job schemas (for AI agents)
- **[WORKAROUNDS.md](./WORKAROUNDS.md)** - Vertex AI SDK integration notes and workarounds
- **[CLAUDE.md](./CLAUDE.md)** - Working directory rules for AI agents

## Troubleshooting

### Job stuck in "running" status
- Check Cloud Functions logs: `firebase functions:log`
- Verify Vertex AI quota in Google Cloud Console
- Ensure Task Queue is processing jobs
- Review AI request analyzer logs for prompt analysis issues

### Media not appearing in Storage
- Videos written directly by Veo (check outputGcsUri)
- Images/audio uploaded by FireGen after generation
- Verify prompt meets model requirements
- Inspect semantic hint detection logs
- Remember: all files auto-deleted after 24h

### High latency
- Check region matching (FUNCTION_REGION = VERTEX_LOCATION)
- Monitor Task Queue backlog
- Review AI request analyzer performance metrics
- Consider cold start delays (2-5s first invocation)

### Prompt Analysis Failures
- Ensure clear, specific prompts
- Check ARCHITECTURE.md for advanced hint parsing
- Use Explicit Mode for guaranteed behavior
- Monitor AI analysis logs

### Type errors during build
- Ensure `@google/genai@1.22.0+` installed
- Some methods require `as any` (see WORKAROUNDS.md)
- Run `npm run build` to verify
- Check discriminated union type definitions

**For detailed troubleshooting, see [LLMS.md](./LLMS.md#troubleshooting).**

## Performance Characteristics

**Cold Start:** ~2-5 seconds (first function invocation)
**Warm Start:** <500ms (subsequent invocations)
**Polling Overhead:** 1 second between checks (async operations only)

**Generation Times:**
- Videos (Veo): 30-120s
- Images: 2-8s
- Audio (TTS): 2-8s
- Audio (Music): 10-20s
- Text: 1-10s

## Security

- **Authentication:** Firebase Auth (user-scoped jobs)
- **Authorization:** RTDB security rules (uid-based)
- **Signed URLs:** Temporary unauthenticated access (25h expiry)
- **Data Lifecycle:** Auto-delete after 24h
- **Service Account:** Cloud Functions bypass RTDB rules

## License

[Your License Here]

## Support

- **Issues:** [GitHub Issues](your-repo-link)
- **Documentation:** [Firebase Functions Docs](https://firebase.google.com/docs/functions)
- **Vertex AI:** [Vertex AI Docs](https://cloud.google.com/vertex-ai/docs)
