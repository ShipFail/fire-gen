# FireGen - AI Media Generation Extension

> **For AI Agents:** This document provides complete API schemas and examples for integrating FireGen into applications. Use this as your primary reference when consuming FireGen from other projects/codebases.

**For Human Developers:**
- Setup guide: [README.md](./README.md)
- System architecture: [ARCHITECTURE.md](./ARCHITECTURE.md)

## Overview

FireGen is a Firebase extension providing serverless AI media generation using Google Vertex AI models via REST API. Write jobs to RTDB, get generated media files back.

**Quick Facts:**
- **Architecture**: Firebase RTDB + Cloud Functions + Task Queue + Vertex AI REST API  
- **RTDB Path**: `firegen-jobs/{jobId}`
- **Two Modes**: AI-Assisted (string prompt) or Explicit (structured object)
- **Job TTL**: 90 minutes
- **Polling**: 1-second intervals (async models only)
- **File Expiry**: 24 hours (auto-deleted)
- **Signed URL Expiry**: 25 hours

**Supported Models (5 total):**
- **Video**: `veo-3.1-generate-preview`, `veo-3.1-fast-generate-preview` (async, 60-120s)
- **Image**: `gemini-2.5-flash-image` (sync, 2-5s)
- **Audio TTS**: `gemini-2.5-flash-preview-tts`, `gemini-2.5-pro-preview-tts` (sync, 2-6s)

## Job Schema

### Complete RTDB Structure

```typescript
firegen-jobs/{jobId}/
  uid: string                               // User ID (required)
  model: string                             // Model identifier (e.g., "veo-3.1-fast-generate-preview")
  status: "requested" | "starting" | "running" | "succeeded" | "failed" | "expired" | "canceled"
  
  request: Record<string, unknown>          // Raw request sent to model API
  response?: Record<string, unknown>        // Raw response from model API
  
  files?: [                                 // Array of generated files (ordered)
    {
      name: string                          // Filename (e.g., "file0.mp4", "file1.png")
      gs: string                            // GCS URI (gs://bucket/path/file0.mp4)
      https: string                         // Signed URL (expires in 25h, file deleted in 24h)
      mimeType?: string                     // e.g., "video/mp4", "image/png"
      size?: number                         // File size in bytes
    }
  ]
  
  error?: {
    code: string                            // Error code (e.g., "VALIDATION_ERROR")
    message: string                         // Human-readable error message
    details?: Record<string, unknown>       // Additional error context
  }

  assisted?: {                              // Only present if AI-Assisted mode was used
    prompt: string                          // Original user prompt
    reasons: string[]                       // AI reasoning chain
  }

  metadata: {
    version: string                         // FireGen version
    createdAt: number                       // Job creation timestamp (ms)
    updatedAt: number                       // Last update timestamp (ms)
    // Async operation metadata (Veo only)
    operation?: string                      // Vertex AI operation name
    attempt?: number                        // Poll attempts
    nextPoll?: number                       // Next poll timestamp (ms)
    ttl?: number                            // Job expiration timestamp (ms)
    lastError?: number                      // Last error timestamp (ms)
  }
```

**Key Design Principles:**
1. `request` and `response` are raw model API format (no transformation)
2. `files` is user-facing with clean URLs and sequential naming
3. `error` contains system errors (model errors stay in `response.error`)
4. `model` at root level enables efficient querying
5. `assisted` only present for AI-assisted jobs

### ⚠️ Client Input vs Server Output

**What YOU send (client):**
```typescript
{
  model: string                             // Required: Model identifier
  status?: "requested"                      // Optional: Server defaults to "requested"
  request: Record<string, unknown>          // Required: Model API request
}
// uid: Auto-injected from authentication context
// metadata, files, response, error: Server-generated ONLY
```

**What YOU read (RTDB after processing):**
```typescript
{
  uid: string                               // Server-injected
  model: string                             // Your input
  status: "succeeded" | "failed" | ...      // Server-updated
  request: Record<string, unknown>          // Your input
  response?: Record<string, unknown>        // Server-added (model response)
  files?: Record<string, FileInfo>          // Server-added (generated files)
  error?: {code, message, details}          // Server-added (if failed)
  metadata: {...}                           // Server-generated timestamps
  assisted?: {prompt, reasons}              // Server-added (AI mode only)
}
```

**Golden Rule:** Never include `uid`, `metadata`, `files`, `response`, or `error` in your job creation code. The server generates these fields automatically.

## Usage

### Two Modes

FireGen supports two ways to create jobs:

1. **Explicit Mode** (Production - Precise Control) ✅ **DEFAULT**
2. **AI-Assisted Mode** (Development - Debug Tool)

### Mode 1: Explicit Mode (Production)

Write a structured object for full control over all parameters. Use this for production applications.

**When to use:**
- Production applications requiring precise control
- When you know exact model and parameters
- Automated systems and APIs
- Cost-sensitive scenarios (no AI overhead)

### Mode 2: AI-Assisted Mode (Development)

Write a natural language string. AI analyzes it and creates the structured request.

**When to use:**
- Prototyping and exploring FireGen capabilities
- Understanding how prompts map to parameters
- Debugging request structure generation
- Learning the API and model schemas
- Development and testing workflows

```typescript
import {getDatabase, ref, push} from 'firebase/database';

const db = getDatabase();

// Just write a string!
const newJobRef = await push(ref(db, 'firegen-jobs'), "Create a 6-second vertical waterfall video");
const jobId = newJobRef.key;
```

**How it works:**
1. Cloud Function detects string value
2. AI analyzes prompt in 3 steps (model selection → parameter inference → JSON generation)
3. String replaced with complete structured job
4. Job processed normally
5. Result includes \`assisted.prompt\` and \`assisted.reasons\` fields

**Examples:**

```typescript
// Video generation
await push(ref(db, 'firegen-jobs'), "Create a cinematic sunset over mountains");
// → veo-3.1-generate-preview, 8s, 16:9, audio

await push(ref(db, 'firegen-jobs'), "Quick vertical video of a cat playing");
// → veo-3.1-fast-generate-preview, 4s, 9:16

// Image generation
await push(ref(db, 'firegen-jobs'), "Generate a photorealistic portrait of a scientist");
// → gemini-2.5-flash-image, 1:1

// Audio generation
await push(ref(db, 'firegen-jobs'), "Say 'Welcome to FireGen' in a cheerful voice");
// → gemini-2.5-flash-preview-tts, voice: Zephyr
```

### Mode 1: Explicit Mode (Examples)

Write a structured object for full control.

**Video (Veo 3.1 Fast):**

```typescript
await push(ref(db, 'firegen-jobs'), {
  model: "veo-3.1-fast-generate-preview",
  status: "requested",
  request: {
    model: "veo-3.1-fast-generate-preview",
    instances: [{
      prompt: "A serene sunset over mountains, cinematic 4K",
    }],
    parameters: {
      durationSeconds: 8,
      aspectRatio: "16:9",
      generateAudio: true,
    },
  },
});
```

**Video with Reference Images (Veo 3.1):**

```typescript
await push(ref(db, 'firegen-jobs'), {
  model: "veo-3.1-generate-preview",
  status: "requested",
  request: {
    model: "veo-3.1-generate-preview",
    instances: [{
      prompt: "The character walks through a forest",
      referenceImages: [
        {
          image: {gcsUri: "gs://bucket/character.png"},
          referenceType: "asset"
        }
      ],
    }],
    parameters: {
      durationSeconds: 8,
      aspectRatio: "16:9",
      generateAudio: true,
    },
  },
});
```

**Image (Gemini Flash Image):**

```typescript
await push(ref(db, 'firegen-jobs'), {
  model: "gemini-2.5-flash-image",
  status: "requested",
  request: {
    model: "gemini-2.5-flash-image",
    contents: [{
      role: "user",
      parts: [{text: "A futuristic cityscape at sunset"}]
    }],
    generationConfig: {
      responseModalities: ["IMAGE"],
      imageConfig: {
        aspectRatio: "16:9"
      }
    },
  },
});
```

**Audio TTS (Gemini TTS):**

```typescript
await push(ref(db, 'firegen-jobs'), {
  model: "gemini-2.5-flash-preview-tts",
  status: "requested",
  request: {
    model: "gemini-2.5-flash-preview-tts",
    contents: [{
      role: "user",
      parts: [{text: "Welcome to FireGen!"}]
    }],
    generationConfig: {
      responseModalities: ["AUDIO"],
      speechConfig: {
        voiceConfig: {
          prebuiltVoiceConfig: {
            voiceName: "Zephyr"
          }
        }
      }
    },
  },
});
```

## Monitoring Jobs

**⚠️ IMPORTANT: Monitor \`status\` field only, not entire job**

The backend updates \`metadata.attempt\` and \`metadata.nextPoll\` every second during polling. Subscribing to the entire job causes unnecessary re-renders.

```typescript
import {getDatabase, ref, onValue, get} from 'firebase/database';

function watchJob(jobId: string) {
  const db = getDatabase();
  const statusRef = ref(db, \`firegen-jobs/\${jobId}/status\`);

  // Subscribe ONLY to status changes
  const unsubscribe = onValue(statusRef, async (snapshot) => {
    const status = snapshot.val();

    switch (status) {
      case 'starting':
      case 'running':
        console.log('Job in progress...');
        break;

      case 'succeeded':
        // Fetch complete job data once
        const jobSnap = await get(ref(db, `firegen-jobs/${jobId}`));
        const job = jobSnap.val();
        
        // Access generated files (array)
        const files = job.files;
        console.log('Files:', files);
        // [
        //   {
        //     name: "file0.mp4",
        //     gs: "gs://bucket/firegen-jobs/abc123/file0.mp4",
        //     https: "https://storage.googleapis.com/...?Expires=...",
        //     mimeType: "video/mp4",
        //     size: 1234567
        //   }
        // ]

        // ⚠️ Download immediately - files deleted in 24h!
        await downloadFile(files[0].https);
        
        unsubscribe();
        break;

      case 'failed':
      case 'expired':
        const errorSnap = await get(ref(db, \`firegen-jobs/\${jobId}/error\`));
        console.error('Job failed:', errorSnap.val());
        unsubscribe();
        break;
    }
  });

  return unsubscribe;
}
```

**Why this approach?**
- ✅ Efficient: ~10 bytes per update vs ~500 bytes for entire job
- ✅ Fewer renders: Status changes 4-5 times total, not 30-120 times
- ✅ Auto-cleanup: Unsubscribes when terminal state reached

## Job Lifecycle

### Async Models (Veo)

```
requested → starting → running → succeeded/failed/expired
            (↑ polling every 1s for 30-120s)
```

1. Client writes job
2. Function validates → \`starting\`
3. Vertex AI operation started → \`running\`
4. Poll every 1 second
5. Complete → \`succeeded\` (or \`failed\` / \`expired\`)

### Sync Models (Gemini Flash Image, Gemini TTS)

```
requested → starting → succeeded/failed
            (↑ completes in 2-6s)
```

1. Client writes job
2. Function validates → \`starting\`
3. Model generates → \`succeeded\` immediately
4. No polling needed

## Model Reference

### Veo 3.1 Generate Preview (High Quality)

**Model ID**: \`veo-3.1-generate-preview\`

**Type**: Async video generation (60-120s)

**Request Schema**:
```typescript
{
  model: "veo-3.1-generate-preview",
  instances: [{
    prompt: string,                        // Required: video description
    image?: {gcsUri: string},              // Optional: starting keyframe
    video?: {gcsUri: string},              // Optional: extend video
    lastFrame?: {gcsUri: string},          // Optional: target ending frame
    referenceImages?: Array<{              // Optional: max 3 references
      image: {gcsUri: string},
      referenceType: "asset" | "style"
    }>,
  }],
  parameters: {
    durationSeconds: 4 | 6 | 8,           // Default: 8
    aspectRatio: "16:9" | "9:16" | "1:1" | "21:9" | "3:4" | "4:3",  // Default: "16:9"
    generateAudio: boolean,                // Default: true
    enhancePrompt?: boolean,               // Optional: LLM-enhanced prompt
    negativePrompt?: string,               // Optional: suppress elements
    personGeneration?: "dont_allow" | "allow_adult",
    sampleCount?: number,                  // Default: 1
    seed?: number,                         // Optional: deterministic generation
    compressionQuality?: "optimized" | "lossless",
  }
}
```

**Use when**: Prompt mentions "high quality", "best quality", "cinematic", "professional"

### Veo 3.1 Fast Generate Preview (Fast)

**Model ID**: \`veo-3.1-fast-generate-preview\`

**Type**: Async video generation (30-60s)

**Request Schema**: Same as \`veo-3.1-generate-preview\`

**Use when**: Default choice for video, or prompt mentions "quick", "fast"

### Gemini 2.5 Flash Image

**Model ID**: \`gemini-2.5-flash-image\`

**Type**: Sync image generation (2-5s)

**Request Schema**:
```typescript
{
  model: "gemini-2.5-flash-image",
  contents: [{
    role: "user",
    parts: [{text: string}]               // Image generation prompt
  }],
  generationConfig: {
    responseModalities: ["IMAGE"],
    imageConfig?: {
      aspectRatio?: "1:1" | "3:2" | "2:3" | "3:4" | "4:3" | "4:5" | "5:4" | "9:16" | "16:9" | "21:9"
    }
  },
  safetySettings?: Array<{
    category: string,
    threshold: string
  }>
}
```

**Use when**: User requests "image" generation

### Gemini 2.5 Flash Preview TTS

**Model ID**: \`gemini-2.5-flash-preview-tts\`

**Type**: Sync text-to-speech (2-5s)

**Available Voices**: Zephyr, Puck, Charon, Kore, Fenrir, Leda, Aoede, Callisto, Dione, Ganymede, Helios, Iapetus, Juno, Kairos, Luna, Mimas, Nereus, Oberon, Proteus, Rhea, Selene, Titan, Umbriel, Vesta, Xanthe, Ymir, Zelus, Atlas, Borealis, Cygnus

**Request Schema**:
```typescript
{
  model: "gemini-2.5-flash-preview-tts",
  contents: [{
    role: "user",
    parts: [{text: string}]               // Text to synthesize
  }],
  generationConfig: {
    responseModalities: ["AUDIO"],
    speechConfig?: {
      voiceConfig?: {
        prebuiltVoiceConfig?: {
          voiceName: string               // One of 30 voices (default: auto-selected)
        }
      }
    }
  }
}
```

**Use when**: Default choice for TTS, or prompt mentions "fast", "quick"

### Gemini 2.5 Pro Preview TTS

**Model ID**: \`gemini-2.5-pro-preview-tts\`

**Type**: Sync text-to-speech (3-6s)

**Request Schema**: Same as \`gemini-2.5-flash-preview-tts\`

**Use when**: Prompt mentions "high quality", "best quality", "professional"

## Performance

| Model | Generation Time | Type | File Upload |
|-------|----------------|------|-------------|
| veo-3.1-generate-preview | 60-120s | Async | Vertex AI → GCS |
| veo-3.1-fast-generate-preview | 30-60s | Async | Vertex AI → GCS |
| gemini-2.5-flash-image | 2-5s | Sync | Function → GCS |
| gemini-2.5-flash-preview-tts | 2-5s | Sync | Function → GCS |
| gemini-2.5-pro-preview-tts | 3-6s | Sync | Function → GCS |

**Additional:**
- Cold start: ~2-5s (first function invocation)
- Warm start: <500ms
- Polling overhead: 1s between checks (Veo only)

## Storage & Security

### File Lifecycle

⚠️ **CRITICAL: All generated files are automatically deleted after 24 hours.**

You MUST download or copy files to your own storage immediately upon job completion.

```typescript
// Download file when job succeeds
const response = await fetch(job.files['file0.mp4'].https);
const blob = await response.blob();

// Upload to your permanent storage
const storage = getStorage();
const videoRef = ref(storage, \`my-videos/\${jobId}.mp4\`);
await uploadBytes(videoRef, blob);
```

### File Access

**Two URL types in \`files\` field:**

| Field | Format | Lifetime | Auth Required | Best For |
|-------|--------|----------|---------------|----------|
| \`gs\` | \`gs://bucket/path\` | 24h | Yes (Admin SDK) | Backend copy operations |
| \`https\` | \`https://storage.googleapis.com/...?Expires=...\` | 25h expiry (file deleted 24h) | No | Browser playback, download |

### RTDB Security Rules

Jobs are user-scoped via \`uid\` field. Example rules:

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

**Key points:**
- Read: Only owner can read their jobs
- Write: Can create new jobs (string or object) but cannot modify existing ones
- UID injection: Backend injects \`uid\` from auth context if missing

## Error Handling

### Common Errors

```typescript
// Invalid format
{
  status: "failed",
  error: {
    code: "INVALID_FORMAT",
    message: "Invalid job format. Provide either a string or structured JobNode."
  }
}

// UID mismatch (security violation)
{
  status: "failed",
  error: {
    code: "UID_MISMATCH",
    message: "UID mismatch - you can only create jobs for yourself"
  }
}

// Validation error
{
  status: "failed",
  error: {
    code: "VALIDATION_ERROR",
    message: "Validation failed: parameters.durationSeconds: Invalid literal value..."
  }
}

// AI analysis failed (AI-Assisted mode only)
{
  status: "failed",
  error: {
    code: "AI_ANALYSIS_FAILED",
    message: "AI analysis failed: ..."
  },
  assisted: {
    prompt: "original prompt here",
    reasons: []
  }
}

// Job expired
{
  status: "expired"
}

// Model error (in response.error, not error field)
{
  status: "succeeded",  // or "failed"
  response: {
    error: {
      message: "Safety filter triggered",
      code: "SAFETY_ERROR"
    }
  }
}
```

### Troubleshooting

**Job stuck in "running":**
- Check Cloud Functions logs
- Verify Vertex AI quota and API status
- Check Task Queue processing in Firebase Console

**Job fails immediately:**
- Check \`error.code\` and \`error.message\`
- Validate request schema against model requirements
- Check authentication (is \`uid\` correct?)

**AI-Assisted mode fails:**
- Prompt too vague or too long (max 10000 characters)
- Check \`assisted.reasons\` for AI's analysis steps
- Try Explicit mode for precise control

## Best Practices

1. **⚠️ Download files immediately** - All media deleted after 24h
2. **Monitor status only** - Subscribe to \`status\` field, not entire job
3. **Use AI-Assisted for prototyping** - Fast iteration with natural language
4. **Use Explicit for production** - Precise control over all parameters
5. **Validate before writing** - Check schema before creating jobs
6. **Implement rate limiting** - Prevent abuse and control costs
7. **Clean up old jobs** - Remove succeeded/failed jobs to save database space
8. **Handle errors gracefully** - Parse \`error.code\` for specific error handling
9. **Use \`https\` URLs** - For browser playback (valid 25h, file deleted 24h)
10. **Copy to permanent storage** - GCS, Firebase Storage, S3, etc. immediately

## Example: Complete Flow

```typescript
import {getDatabase, ref, push, onValue, get} from 'firebase/database';

async function generateVideo(prompt: string) {
  const db = getDatabase();

  // 1. Create job (AI-Assisted mode)
  const newJobRef = await push(ref(db, 'firegen-jobs'), prompt);
  const jobId = newJobRef.key!;

  // 2. Monitor status
  const statusRef = ref(db, \`firegen-jobs/\${jobId}/status\`);
  
  return new Promise((resolve, reject) => {
    const unsubscribe = onValue(statusRef, async (snapshot) => {
      const status = snapshot.val();

      if (status === 'succeeded') {
        // 3. Get complete job
        const jobSnap = await get(ref(db, `firegen-jobs/${jobId}`));
        const job = jobSnap.val();

        // 4. Download file immediately (array access)
        const videoUrl = job.files[0].https;
        const response = await fetch(videoUrl);
        const blob = await response.blob();

        // 5. Save to permanent storage
        // ... upload to your storage ...

        unsubscribe();
        resolve({jobId, blob, job});
      } else if (status === 'failed' || status === 'expired') {
        const jobSnap = await get(ref(db, \`firegen-jobs/\${jobId}\`));
        const job = jobSnap.val();
        
        unsubscribe();
        reject(new Error(job.error?.message || 'Job failed'));
      }
    });
  });
}

// Usage
try {
  const result = await generateVideo("Create a 6-second sunset video");
  console.log('Video generated:', result.jobId);
  console.log('AI reasoning:', result.job.assisted?.reasons);
} catch (error) {
  console.error('Generation failed:', error);
}
```

## Related Documentation

- [README.md](./README.md) - Developer setup and deployment guide
- [ARCHITECTURE.md](./ARCHITECTURE.md) - System design and technical details
- [Vertex AI Veo Documentation](https://cloud.google.com/vertex-ai/generative-ai/docs/video/generate-videos)
- [Vertex AI Gemini Documentation](https://cloud.google.com/vertex-ai/generative-ai/docs/multimodal/overview)
