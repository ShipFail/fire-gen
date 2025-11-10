# FireGen API Reference

> **For AI Agents:** Complete integration guide for FireGen - serverless AI media generation via Firebase RTDB.

**For Human Developers:** See [README.md](./README.md) for setup, [ARCHITECTURE.md](./ARCHITECTURE.md) for internals.

---

## Quick Start

**What it does:** Write job to RTDB → Get generated video/image/audio back

**Two modes:**
1. **AI-Assisted** - Write a string prompt (fastest integration)
2. **Explicit** - Write structured object (production control)

```typescript
import {getDatabase, ref, push, onValue} from 'firebase/database';

const db = getDatabase();

// AI-Assisted Mode: Natural language
const job = await push(ref(db, 'firegen-jobs'), 
  "Create a 6-second sunset video"
);

// Explicit Mode: Full control
const job = await push(ref(db, 'firegen-jobs'), {
  model: "veo-3.1-fast-generate-preview",
  status: "requested",
  request: {
    model: "veo-3.1-fast-generate-preview",
    instances: [{prompt: "sunset over ocean"}],
    parameters: {durationSeconds: 6, aspectRatio: "16:9", generateAudio: true}
  }
});

// Monitor (subscribe to status only, not entire job)
onValue(ref(db, `firegen-jobs/${job.key}/status`), async (snap) => {
  if (snap.val() === 'succeeded') {
    const jobData = (await get(ref(db, `firegen-jobs/${job.key}`))).val();
    const videoUrl = jobData.files[0].https; // ⚠️ Download now - expires in 24h
  }
});
```

---

## RTDB Schema

**Path:** `firegen-jobs/{jobId}`

```typescript
{
  // ===== YOU WRITE (Client Input) =====
  model: string                             // e.g., "veo-3.1-fast-generate-preview"
  status: "requested"                       // Optional (defaults to "requested")
  request: Record<string, unknown>          // Model-specific request (see Models section)
  
  // ===== SYSTEM WRITES (Auto-generated) =====
  uid: string                               // Auto-injected from auth context
  status: "requested" | "starting" | "running" | "succeeded" | "failed" | "expired"
  
  response?: Record<string, unknown>        // Raw model API response
  
  files?: [                                 // ✅ ARRAY of generated files (ordered)
    {
      name: string                          // "file0.mp4", "file1.png", etc.
      gs: string                            // GCS URI: gs://bucket/path/file0.mp4
      https: string                         // Signed URL (expires 24h)
      mimeType?: string                     // "video/mp4", "image/png", "audio/wav"
      size?: number                         // Bytes
    }
  ]
  
  error?: {                                 // System errors only (model errors in response.error)
    code: string                            // "VALIDATION_ERROR", "UID_MISMATCH", etc.
    message: string
    details?: Record<string, unknown>
  }
  
  assisted?: {                              // Only if AI-Assisted mode used
    prompt: string                          // Original user prompt
    reasons: string[]                       // AI reasoning chain
  }
  
  metadata: {
    version: string                         // FireGen version
    createdAt: number                       // ms timestamp
    updatedAt: number                       // ms timestamp
    // Polling metadata (async operations only)
    operation?: string                      // Vertex AI operation name
    attempt?: number                        // Poll attempt count
    nextPoll?: number                       // Next poll time (ms)
    ttl?: number                            // Job expiration (90 min from creation)
    lastError?: number                      // Last error timestamp
  }
}
```

**⚠️ NEVER include these in your write:** `uid`, `metadata`, `files`, `response`, `error` - all auto-generated.

---

## Models (5 Total)

| Model ID | Type | Speed | Use When |
|----------|------|-------|----------|
| `veo-3.1-fast-generate-preview` | Video | 30-60s | Default video choice |
| `veo-3.1-generate-preview` | Video | 60-120s | High quality video |
| `gemini-2.5-flash-image` | Image | 2-5s | Image generation |
| `gemini-2.5-flash-preview-tts` | Audio | 2-5s | Default TTS |
| `gemini-2.5-pro-preview-tts` | Audio | 3-6s | High quality TTS |

---

## Model Schemas

### Veo 3.1 (Video)

**Models:** `veo-3.1-fast-generate-preview`, `veo-3.1-generate-preview`

- **Schema reference:** [`veo-3.1-fast-generate-preview.schema.ts`](https://raw.githubusercontent.com/ShipFail/firegen/main/extension/functions/src/models/veo/veo-3.1-fast-generate-preview.schema.ts) (contains both fast + standard exports)
- **Payload shape:** `instances[]` describe prompt + optional media (`image`, `video`, `lastFrame`, `referenceImages`); `parameters` aligns with official Veo REST enum/string literals.

**Example: Image-to-Video**
```typescript
{
  model: "veo-3.1-fast-generate-preview",
  instances: [{
    prompt: "Gentle camera pan across mountain landscape",
    image: {gcsUri: "gs://my-bucket/landscape.jpg"}
  }],
  parameters: {
    durationSeconds: 6,
    aspectRatio: "16:9",
    generateAudio: true
  }
}
```

**Example: Character Consistency (Reference Images)**
```typescript
{
  model: "veo-3.1-generate-preview",
  instances: [{
    prompt: "The character walks through a futuristic city",
    referenceImages: [
      {
        image: {gcsUri: "gs://my-bucket/character.png"},
        referenceType: "asset"
      }
    ]
  }],
  parameters: {durationSeconds: 8, aspectRatio: "16:9", generateAudio: true}
}
```

---

### Gemini 2.5 Flash Image

**Model:** `gemini-2.5-flash-image`

- **Schema reference:** [`gemini-2.5-flash-image.schema.ts`](https://raw.githubusercontent.com/ShipFail/firegen/main/extension/functions/src/models/gemini-flash-image/gemini-2.5-flash-image.schema.ts)
- **Key fields:** `contents[]` follow Gemini `Content` contract (`role`, `parts`); `generationConfig.responseModalities` must remain `IMAGE`; optional `imageConfig.aspectRatio` enumerates supported ratios.

**Example:**
```typescript
{
  model: "gemini-2.5-flash-image",
  contents: [{role: "user", parts: [{text: "A futuristic cityscape at sunset"}]}],
  generationConfig: {
    responseModalities: ["IMAGE"],
    imageConfig: {aspectRatio: "16:9"}
  }
}
```

---

### Gemini TTS (Audio)

**Models:** `gemini-2.5-flash-preview-tts`, `gemini-2.5-pro-preview-tts`

**Available Voices (30):** Zephyr, Puck, Charon, Kore, Fenrir, Leda, Aoede, Callisto, Dione, Ganymede, Helios, Iapetus, Juno, Kairos, Luna, Mimas, Nereus, Oberon, Proteus, Rhea, Selene, Titan, Umbriel, Vesta, Xanthe, Ymir, Zelus, Atlas, Borealis, Cygnus

- **Schema references:** [`gemini-2.5-flash-preview-tts.schema.ts`](https://raw.githubusercontent.com/ShipFail/firegen/main/extension/functions/src/models/gemini-tts/gemini-2.5-flash-preview-tts.schema.ts) and [`gemini-2.5-pro-preview-tts.schema.ts`](https://raw.githubusercontent.com/ShipFail/firegen/main/extension/functions/src/models/gemini-tts/gemini-2.5-pro-preview-tts.schema.ts)
- **Key fields:** Single `contents` message (`role: "user"`) with text parts; `generationConfig.responseModalities` locked to `AUDIO`; optional `speechConfig.voiceConfig.prebuiltVoiceConfig.voiceName` selects one of the prebuilt voices.

**Example:**
```typescript
{
  model: "gemini-2.5-flash-preview-tts",
  contents: [{role: "user", parts: [{text: "Welcome to FireGen!"}]}],
  generationConfig: {
    responseModalities: ["AUDIO"],
    speechConfig: {
      voiceConfig: {
        prebuiltVoiceConfig: {voiceName: "Zephyr"}
      }
    }
  }
}
```

---

## Job Lifecycle

### Async Models (Veo)
```
requested → starting → running (polls every 1s) → succeeded/failed/expired
                                                   (timeout: 10 min / 600 attempts)
```

### Sync Models (Gemini)
```
requested → starting → succeeded/failed (2-6s)
```

**Job TTL:** 90 minutes from creation  
**Polling Interval:** 1 second  
**Max Poll Attempts:** 600 (10 minutes of polling)

---

## Monitoring Jobs

**⚠️ CRITICAL:** Subscribe to `status` field only, not entire job. Polling updates `metadata.attempt` every second → 120+ re-renders if you subscribe to full job.

```typescript
import {ref, onValue, get} from 'firebase/database';

function watchJob(jobId: string) {
  const statusRef = ref(db, `firegen-jobs/${jobId}/status`);
  
  const unsubscribe = onValue(statusRef, async (snap) => {
    const status = snap.val();
    
    if (status === 'succeeded') {
      // Fetch full job once
      const job = (await get(ref(db, `firegen-jobs/${jobId}`))).val();
      
      // ⚠️ files is an ARRAY, not object
      const file = job.files[0];
      console.log('Video URL:', file.https);
      
      // Download immediately - URL expires in 24h
      await fetch(file.https).then(r => r.blob()).then(saveToStorage);
      
      unsubscribe();
    } else if (status === 'failed' || status === 'expired') {
      const job = (await get(ref(db, `firegen-jobs/${jobId}`))).val();
      console.error('Job failed:', job.error);
      unsubscribe();
    }
  });
  
  return unsubscribe;
}
```

---

## File Access

**Two URL types in `files` array:**

| Field | Format | Expiry | Auth Required | Use For |
|-------|--------|--------|---------------|---------|
| `gs` | `gs://bucket/path` | ⚠️ Unknown* | Yes (Admin SDK) | Backend copy operations |
| `https` | Signed URL | 24 hours | No | Browser playback, download |

**⚠️ File Persistence:** Source code shows 24h signed URL expiry, but no auto-deletion implementation found. Implement your own cleanup if needed.

## Security

**RTDB Rules Example:**

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
- Users can only read their own jobs (uid match)
- Can create new jobs (string or object)
- Cannot modify existing jobs
- `uid` auto-injected from auth context if missing
- Admin SDK writes bypass rules (uid defaults to `"admin-console"`)

---

## AI-Assisted Mode (How It Works)

When you write a string instead of object:

```typescript
await push(ref(db, 'firegen-jobs'), "Create a 6-second waterfall video");
```

**Backend 3-step AI pipeline:**

1. **URL Preprocessing** - Extract gs:// URIs → semantic tags
2. **Model Selection** - AI picks best model (JSON mode)
3. **Parameter Inference** - AI infers parameters from prompt
4. **JSON Generation** - AI generates final request (schema validation)
5. **URL Restoration** - Tags → original URIs

**Result:** String replaced with complete JobNode + `assisted.reasons` array

**When to use:**
- ✅ Prototyping and exploration
- ✅ Learning the API
- ✅ Debugging request structure
- ❌ Production (use Explicit mode for cost/control)

---

## Best Practices

1. **⚠️ Subscribe to `status` only** - Not entire job (avoids 120+ re-renders during polling)
2. **⚠️ Download files immediately** - Signed URLs expire in 24h
3. **Use AI-Assisted for prototyping** - Fast iteration with natural language
4. **Use Explicit for production** - Precise control, no AI overhead
5. **Validate before writing** - Check schema to avoid validation errors
6. **Implement rate limiting** - Prevent abuse and control costs
7. **Clean up old jobs** - Remove succeeded/failed jobs to save database space
8. **Use `https` URLs for browser** - `gs` URIs require Admin SDK authentication
9. **Save to permanent storage** - Don't rely on FireGen storage persistence

---

## Related Documentation

- [README.md](./README.md) - Setup and deployment
- [ARCHITECTURE.md](./ARCHITECTURE.md) - System design and internals
- [Vertex AI Veo Docs](https://cloud.google.com/vertex-ai/generative-ai/docs/video/generate-videos)
- [Vertex AI Gemini Docs](https://cloud.google.com/vertex-ai/generative-ai/docs/multimodal/overview)
