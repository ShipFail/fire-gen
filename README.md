# FireGen - AI Media Generation Extension

<p align="center"><img src="./docs/firegen-logo.webp" width="256" alt="FireGen Logo" /></p>

> **Turn Firebase RTDB into your universal Generative AI API.**

[![Firebase](https://img.shields.io/badge/Firebase-Cloud%20Functions-orange)](https://firebase.google.com/docs/functions)
[![Vertex AI](https://img.shields.io/badge/Vertex%20AI-Powered-blue)](https://cloud.google.com/vertex-ai)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-22-green)](https://nodejs.org/)
[![REST API](https://img.shields.io/badge/REST%20API-Pure-purple)](https://cloud.google.com/vertex-ai/docs/reference/rest)

## The Problem

Solo founders and AI co-founder practitioners waste **days debugging Vertex AI integration** instead of shipping features:

- **SDK Hell**: Multiple SDKs (Veo, Gemini, Imagen) with inconsistent APIs, outdated docs, and breaking changes
- **Async Complexity**: Long-running operations (LROs) require custom polling, exponential backoff, TTL management, and dead-letter queues
- **Storage Gymnastics**: Juggling GCS URIs, signed URLs, file transfers between GCS and Firebase Storage
- **Auth Confusion**: OIDC tokens, service accounts, and security rules across multiple Google services
- **Model Catalog Chaos**: Guessing which model fits your prompt, which parameters are valid, and which combinations break
- **Time Drain**: What should take 15 minutes takes 3 days of Stack Overflow, trial-and-error, and debugging

**Result**: Founders spend time fighting infrastructure instead of validating ideas with real users.

## The Solution

FireGen is a **Firebase Extension** that turns RTDB into a universal AI generation queue with **two operational modes**:

### 🤖 AI-Assisted Mode (Natural Language)
```typescript
// Just write a string - AI picks the model automatically
await push(ref(db, 'firegen-jobs'), 
  "Create a 4-second vertical video of a waterfall with ambient sound"
);
```

**How it works:**
- Gemini 2.5 Flash analyzes your prompt semantically (~1-2s)
- Automatically selects best model (Veo 3.1, Gemini Image, TTS)
- Extracts parameters intelligently (duration, aspect ratio, audio, quality)
- Saves reasoning chain to `assisted.reasons` for transparency
- Perfect for prototyping, learning the API, and AI-to-AI workflows

### 🎯 Explicit Mode (Production Control)
```typescript
// Structured request with full parameter control
await push(ref(db, 'firegen-jobs'), {
  model: "veo-3.1-fast-generate-preview",
  request: {
    instances: [{prompt: "A serene sunset over mountains"}],
    parameters: {durationSeconds: 8, aspectRatio: "16:9"}
  }
});
```

**What happens behind the scenes:**
1. **onCreate trigger** validates job and routes to model adapter
2. **Task Queue** handles async polling (Veo) or **sync execution** (Gemini, TTS)
3. **Results written back** to RTDB with signed URLs in `files[]` array
4. **Auto-cleanup** after 24h (ephemeral storage saves costs)

**Unified interface across 5 models:**
- Video: Veo 3.1 Generate, Veo 3.1 Fast (async, 60-120s)
- Image: Gemini 2.5 Flash Image (sync, 2-5s)
- Audio: Gemini 2.5 Flash TTS, Gemini 2.5 Pro TTS (sync, 2-6s)

## Why FireGen

### For Solo Founders Practicing AI Co-Founder Frameworks:

**1. Ship in Minutes, Not Days**
- Install extension → Write to RTDB → Subscribe to results
- Zero SDK juggling, zero model guessing, zero schema errors
- **Time saved**: 3 days → 15 minutes

**2. AI-Native DX for AI-First Builders**
- Natural language prompts work out-of-box (AI-to-AI communication)
- Reasoning chains stored for transparency (`assisted.reasons`)
- Single interface for all models (video, image, audio, text)

**3. Firebase-Native Architecture**
- Built on familiar primitives: RTDB triggers, Cloud Functions v2, Task Queue
- Secure by default: user-scoped jobs via `event.auth.uid`, App Check ready
- No new infrastructure: works with your existing Firebase project

**4. Production-Ready Patterns**
- **Async/Sync unified**: Same client code for Veo (async) and Gemini (sync)
- **LRO polling handled**: Exponential backoff, TTL, retries, dead-letter
- **Big-file friendly**: GCS integration with signed URLs (no 10MB Firebase limits)
- **Cost optimized**: 24h ephemeral storage, minimal polling overhead

**5. Iterate Faster with AI Assistance**
- **Development mode**: Use natural language to prototype and learn
- **Production mode**: Switch to explicit parameters for full control
- **Debugging**: Inspect `assisted.reasons` to understand AI model selection

**6. Open Source & Extensible**
- MIT licensed, verifiable source on GitHub
- Adapter pattern for adding new models
- Zod schema validation for type safety
- Full TypeScript support

### Perfect for:
- **Solo founders** building AI-powered apps without DevOps teams
- **AI co-founder practitioners** using LLMs to build product features
- **Prototyping** - Test ideas fast with natural language prompts
- **Production apps** - Scale with explicit mode and full parameter control
- **Multi-modal apps** - Unified interface across video, image, audio, text

### Not Another SDK Wrapper:
FireGen isn't a thin API layer—it's a **complete job orchestration system** with:
- State machine (requested → starting → running → succeeded/failed)
- Polling infrastructure with backoff and TTL
- Security rules and user isolation
- Storage lifecycle management
- AI-powered request analysis (unique to FireGen)

**Bottom Line**: FireGen lets solo founders and AI co-founder practitioners **focus on product validation** instead of infrastructure debugging. Write a string to RTDB, get AI-generated media back. That's it.

## Quick Start

### Two Ways to Use FireGen

FireGen supports **two modes** for creating jobs:

1. **🎯 Explicit Mode (Production - Precise Control)** ✅ **DEFAULT** - Write structured requests for production apps
2. **🤖 AI-Assisted Mode (Development - Debug Tool)** - Natural language prompts for prototyping

#### Explicit Mode - Production Default

```typescript
import {getDatabase, ref, push} from "firebase/database";

// Structured request with explicit model choice
async function createJob() {
  const db = getDatabase();

  const newJobRef = await push(ref(db, 'firegen-jobs'), {
    model: "veo-3.1-fast-generate-preview",
    status: "requested",
    request: {
      model: "veo-3.1-fast-generate-preview",
      instances: [{
        prompt: "A serene sunset over majestic mountains",
      }],
      parameters: {
        durationSeconds: 8,
        aspectRatio: "16:9",
        generateAudio: true,
      },
    },
  });

  return newJobRef.key;
}
```

**Use when:**
- Production applications requiring precise control
- You know the exact model and parameters
- Automated systems and APIs
- Cost-sensitive scenarios (no AI overhead)

**See [LLMS.md](./LLMS.md#mode-1-explicit-mode-production) for complete examples.**

#### AI-Assisted Mode - Development Only

```typescript
import {getDatabase, ref, push} from "firebase/database";

// Just write a string! AI chooses the best model automatically.
async function createAIJob(prompt: string) {
  const db = getDatabase();
  const newJobRef = await push(ref(db, 'firegen-jobs'), prompt);
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

**Use when:**
- Rapid prototyping and iteration
- Learning FireGen capabilities
- Debugging with natural language
- Non-production environments

**See [LLMS.md](./LLMS.md#mode-2-ai-assisted-mode-development) for complete examples.**

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
- Signed URL expiry: 24 hours
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
│   │   │   └── zod-helpers.ts      # Zod schema helpers
│   │   ├── veo/                    # Video: Veo 3.1 (async)
│   │   ├── gemini-flash-image/     # Image: Gemini 2.5 Flash (sync)
│   │   └── gemini-tts/             # Audio: Gemini TTS (sync)
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
└── LLMS.md                         # API guide for AI coding agents
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

### Video (2 models - Async)
| Model | Speed | Quality | Operation | Resolution | Notes |
|-------|-------|---------|-----------|------------|-------|
| `veo-3.1-generate-preview` | 30-120s | Highest | Async (polling) | 720p/1080p | Best quality |
| `veo-3.1-fast-generate-preview` | 15-60s | High | Async (polling) | 720p/1080p | **Default** - fast & high quality |

### Image (1 model - Sync)
| Model | Speed | Quality | Operation | Notes |
|-------|-------|---------|-----------|-------|
| `gemini-2.5-flash-image` | 2-5s | High | Instant | Multimodal, cost-effective, fast generation |

### Audio - TTS (2 models - Sync)
| Model | Voices | Languages | Operation | Notes |
|-------|--------|-----------|-----------|-------|
| `gemini-2.5-flash-preview-tts` | 30 | 24 | Instant | **Default** - natural language control |
| `gemini-2.5-pro-preview-tts` | 30 | 24 | Instant | Higher quality TTS |

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
- `uri`: `gs://bucket/firegen-jobs/{id}/video.mp4` (backend operations)
- `url`: `https://storage.googleapis.com/...?Expires=...` (browser playback, expires 24h)

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
| Signed URL Expiry | 24 hours | Temporary URL lifetime |
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
- **[AGENTS.md](./AGENTS.md)** - Working directory rules for AI agents

## Troubleshooting

### Cloud Tasks Permission Error (Legacy Installations Only)

**Error:** `lacks IAM permission "cloudtasks.tasks.create"`

**Note:** Fixed in v0.1.0+ with proper Cloud Functions v2 configuration.

**Manual Fix (if needed):**
```bash
PROJECT_ID="your-project-id"
SERVICE_ACCOUNT="ext-firegen@${PROJECT_ID}.iam.gserviceaccount.com"

gcloud projects add-iam-policy-binding ${PROJECT_ID} \
  --member="serviceAccount:${SERVICE_ACCOUNT}" \
  --role="roles/cloudtasks.enqueuer"
```

See [POSTINSTALL.md](./extension/POSTINSTALL.md#troubleshooting) for detailed steps.

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

### Build or Runtime Errors
- Verify all dependencies installed: `npm install`
- Check Node.js version (requires v22+)
- Review function logs in Firebase Console
- All models use direct Vertex AI REST API (no SDK dependencies)

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
- **Signed URLs:** Temporary unauthenticated access (24h expiry)
- **Data Lifecycle:** Auto-delete after 24h
- **Service Account:** Cloud Functions bypass RTDB rules

## License

[Your License Here]

## Support

- **Issues:** [GitHub Issues](your-repo-link)
- **Documentation:** [Firebase Functions Docs](https://firebase.google.com/docs/functions)
- **Vertex AI:** [Vertex AI Docs](https://cloud.google.com/vertex-ai/docs)

## Authors

- Huan Li ([@huan](https://github.com/huan))
- Gemini & ChatGPT & Copilot - Shipfail Team ([@shipfail](https://github.com/shipfail))

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details
