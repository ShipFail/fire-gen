# FireGen - AI Media Generation Extension

> **For AI Agents:** This document provides complete API schemas and examples for integrating FireGen into applications. Use this as your primary reference when consuming FireGen from other projects/codebases.

> FireGen is a Firebase Cloud Functions extension that provides serverless AI media generation using Google's Vertex AI models. It supports video generation (Veo), image generation (Imagen, Nano Banana), audio generation (Gemini TTS, Chirp TTS, Lyria), and text generation (Gemini 2.0/2.5). It manages job queuing, polling, and storage orchestration for AI-powered media creation applications.

**For Human Developers:**
- Setup guide: [README.md](./README.md)
- System architecture: [ARCHITECTURE.md](./ARCHITECTURE.md)
- SDK workarounds: [WORKAROUNDS.md](./WORKAROUNDS.md)

## Overview

FireGen is a Firebase extension that integrates Google Vertex AI's media generation models into your application through a simple RTDB job queue pattern. It handles the complete lifecycle of media generation requests:

- **Architecture**: Firebase RTDB + Cloud Functions + Task Queue + Vertex AI
- **RTDB Path**: `firegen-jobs/{jobId}`
- **Storage Path**: `gs://{bucket}/firegen-jobs/{jobId}/{mediaType}-{modelId}.{ext}`
- **Polling Strategy**: 1-second intervals (for async operations like Veo)
- **Job TTL**: 90 minutes (configurable via `JOB_TTL_MINUTES`)
- **⚠️ IMPORTANT: Media Storage is Ephemeral (24 hours)**
  - Generated media (videos/images) are automatically deleted after 24 hours
  - You MUST download/copy media to your own storage before expiration
  - FireGen only provides temporary generation - long-term storage is your responsibility
- **Supported Video Models** (async):
  - `veo-3.0-generate-001` (latest, highest quality)
  - `veo-3.0-fast-generate-001` (faster generation)
  - `veo-2.0-generate-001` (previous generation)
- **Supported Image Models** (sync):
  - `nano-banana` (Gemini 2.5 Flash Image - instant generation)
  - `imagen-4.0-generate-001` (Imagen 4 - highest quality, 2K resolution)
  - `imagen-4.0-fast-generate-001` (Imagen 4 Fast)
  - `imagen-4.0-ultra-generate-001` (Imagen 4 Ultra)
- **Supported Audio Models - TTS** (sync):
  - `gemini-2.5-flash-preview-tts` (30 voices, 24 languages)
  - `gemini-2.5-pro-preview-tts` (high quality TTS)
  - `chirp-3-hd` (Chirp TTS - 248 voices, 31 languages)
- **Supported Audio Models - STT** (sync):
  - `chirp` (Chirp STT - universal speech recognition)
- **Supported Audio Models - Music** (sync):
  - `lyria-002` (instrumental music, 32.8s clips)
- **Supported Text Models** (sync):
  - `gemini-2.5-pro` (most powerful, extended thinking)
  - `gemini-2.5-flash` (best price/performance)
  - `gemini-2.5-flash-lite` (most cost-effective)
  - `gemini-2.0-flash` (latest features)
  - `gemini-2.0-flash-lite` (low latency)

## Job Schema

### RTDB Structure: `firegen-jobs/{jobId}`

### Video Job Example

```typescript
{
  uid: string,                    // User ID (required)
  status: "requested" | "starting" | "running" | "succeeded" | "failed" | "expired" | "canceled",

  request: {
    type: "video",
    model: "veo-3.0-generate-001" | "veo-3.0-fast-generate-001" | "veo-2.0-generate-001",
    prompt: string,               // Video generation prompt
    duration: number,             // Video duration in seconds (typically 8)
    aspectRatio: "16:9" | "9:16", // Video aspect ratio
    resolution: "720p" | "1080p", // Video resolution
    audio: boolean,               // Generate audio track
    referenceImageGcsUri?: string // Optional: GCS URI for image-to-video (gs://bucket/path/image.jpg)
  },

  response?: {
    uri?: string,                 // gs://bucket/firegen-jobs/{id}/video-{model}.mp4 (ephemeral, 24h lifetime)
    url?: string,                 // https://storage.googleapis.com/...?Expires=... (signed URL, 25h expiry, file deleted after 24h)
    metadata?: object,            // Model-specific metadata
    error?: {
      message: string,
      code?: string
    }
  },

  _meta?: {
    operation: string,            // Vertex AI operation name (backend-only, async models only)
    attempt: number,              // Poll attempt counter (backend-only)
    nextPoll: number,             // Next poll timestamp ms (backend-only)
    ttl: number,                  // Job expiration timestamp ms (backend-only)
    lastError?: number            // Last error timestamp ms (backend-only)
  }
}
```

### Image Job Example

```typescript
{
  uid: string,                    // User ID (required)
  status: "requested" | "starting" | "succeeded" | "failed" | "expired" | "canceled",
  // Note: No "running" status for images - they complete instantly

  request: {
    type: "image",
    model: "nano-banana",         // Gemini 2.5 Flash Image
    prompt: string,               // Image generation prompt
    aspectRatio?: "1:1" | "3:2" | "2:3" | "3:4" | "4:3" | "4:5" | "5:4" | "9:16" | "16:9" | "21:9", // Optional, defaults to 1:1
    safetySettings?: Array<{      // Optional safety filters
      category: string,
      threshold: string
    }>
  },

  response?: {
    uri?: string,                 // gs://bucket/firegen-jobs/{id}/image-nano-banana.png (ephemeral, 24h lifetime)
    url?: string,                 // https://storage.googleapis.com/...?Expires=... (signed URL, 25h expiry, file deleted after 24h)
    metadata?: {
      mimeType: string,           // e.g., "image/png"
      size: number,               // File size in bytes
      aspectRatio: string         // Actual aspect ratio used
    },
    error?: {
      message: string,
      code?: string
    }
  }
}
```

### Audio Job Examples (TTS & Music)

**TTS Job:**
```typescript
{
  uid: string,                    // User ID (required)
  status: "requested" | "starting" | "succeeded" | "failed" | "expired" | "canceled",
  // Note: No "running" status for audio - they complete instantly

  request: {
    type: "audio",
    subtype: "tts",               // Text-to-speech
    model: "gemini-2.5-flash-preview-tts" | "gemini-2.5-pro-preview-tts",
    text: string,                 // Text to synthesize (natural language style control supported)
    voice?: string,               // Optional: One of 30 voices (Zephyr, Puck, Charon, Kore, etc.)
    language?: string             // Optional: Language code (auto-detected if omitted, supports 24 languages)
  },

  response?: {
    uri?: string,                 // gs://bucket/firegen-jobs/{id}/audio-tts-{model}.wav (ephemeral, 24h lifetime)
    url?: string,                 // https://storage.googleapis.com/...?Expires=... (signed URL, 25h expiry, file deleted after 24h)
    metadata?: {
      mimeType: string,           // "audio/wav"
      size: number,               // File size in bytes
      voice: string,              // Voice used (or "auto")
      language: string,           // Language detected (or specified)
      duration: number,           // Audio duration in seconds
      sampleRate: 24000,          // Always 24kHz
      channels: 1                 // Always mono
    },
    error?: {
      message: string,
      code?: string
    }
  }
}
```

**Music Job (Lyria):**
```typescript
{
  uid: string,                    // User ID (required)
  status: "requested" | "starting" | "succeeded" | "failed" | "expired" | "canceled",

  request: {
    type: "audio",
    subtype: "music",             // Music generation
    model: "lyria-002",           // Lyria 2 model
    prompt: string,               // Music description (US English)
    negativePrompt?: string,      // Optional: Terms to exclude (e.g., "vocals, singing")
    seed?: number                 // Optional: Seed for reproducible generation
  },

  response?: {
    uri?: string,                 // gs://bucket/firegen-jobs/{id}/audio-music-lyria-002.wav (ephemeral, 24h lifetime)
    url?: string,                 // https://storage.googleapis.com/...?Expires=... (signed URL, 25h expiry, file deleted after 24h)
    metadata?: {
      mimeType: "audio/wav",
      size: number,               // File size in bytes
      duration: 32.8,             // Always 32.8 seconds
      sampleRate: 48000,          // Always 48kHz
      channels: 2,                // Always stereo
      seed?: number               // Seed used (if provided)
    },
    error?: {
      message: string,
      code?: string
    }
  }
}
```

**Chirp TTS Job:**
```typescript
{
  uid: string,                    // User ID (required)
  status: "requested" | "starting" | "succeeded" | "failed" | "expired" | "canceled",

  request: {
    type: "audio",
    subtype: "chirp-tts",         // Chirp Text-to-Speech
    model: "chirp-3-hd",          // Chirp 3 HD model
    text: string,                 // Text to synthesize
    voice: string,                // Voice ID (required, 248 voices available)
    language?: string,            // Optional: BCP-47 language code (supports 31 languages)
    sampleRate?: number           // Optional: Output sample rate in Hz (default: 24000)
  },

  response?: {
    uri?: string,                 // gs://bucket/firegen-jobs/{id}/audio-chirp-tts-chirp-3-hd.wav (ephemeral, 24h lifetime)
    url?: string,                 // https://storage.googleapis.com/...?Expires=... (signed URL, 25h expiry, file deleted after 24h)
    metadata?: {
      mimeType: "audio/wav",
      size: number,               // File size in bytes
      voice: string,              // Voice ID used
      language?: string,          // Language code
      sampleRate: number          // Sample rate (default: 24000)
    },
    error?: {
      message: string,
      code?: string
    }
  }
}
```

**Chirp STT Job:**
```typescript
{
  uid: string,                    // User ID (required)
  status: "requested" | "starting" | "succeeded" | "failed" | "expired" | "canceled",
  // Note: No file output - transcription text in response.text

  request: {
    type: "audio",
    subtype: "chirp-stt",         // Chirp Speech-to-Text
    model: "chirp",               // Chirp STT model
    audioUri: string,             // GCS URI of audio file to transcribe (gs://bucket/path/audio.wav)
    language?: string,            // Optional: BCP-47 language code (auto-detected if omitted)
    encoding?: string,            // Optional: Audio encoding (e.g., "LINEAR16", "FLAC")
    sampleRate?: number           // Optional: Audio sample rate in Hz
  },

  response?: {
    text: string,                 // Transcription text
    metadata?: {
      model: "chirp",
      audioUri: string,           // Source audio URI
      language?: string,          // Language specified
      detectedLanguage?: string,  // Auto-detected language
      confidence?: number         // Confidence score (0-1)
    },
    error?: {
      message: string,
      code?: string
    }
  }
}
```

### Text Job Example

```typescript
{
  uid: string,                    // User ID (required)
  status: "requested" | "starting" | "succeeded" | "failed" | "expired" | "canceled",
  // Note: No file output - text in response.text

  request: {
    type: "text",
    model: "gemini-2.5-pro" | "gemini-2.5-flash" | "gemini-2.5-flash-lite" | "gemini-2.0-flash" | "gemini-2.0-flash-lite",
    prompt: string,               // User message/prompt
    systemInstruction?: string,   // Optional: System instruction
    temperature?: number,         // Optional: 0.0-2.0 (default: 1.0)
    maxOutputTokens?: number,     // Optional: Max response length
    topP?: number,                // Optional: Nucleus sampling (0.0-1.0)
    topK?: number,                // Optional: Top-K sampling
    stopSequences?: string[]      // Optional: Stop generation at these sequences
  },

  response?: {
    text: string,                 // Generated text response
    metadata?: {
      model: string,              // Model used
      promptTokens: number,       // Input token count
      completionTokens: number,   // Output token count
      totalTokens: number,        // Total token count
      finishReason: string        // Completion reason (e.g., "STOP")
    },
    error?: {
      message: string,
      code?: string
    }
  }
}
```

## How to Use FireGen

FireGen supports **two modes** for creating jobs:
1. **AI-Assisted Mode** (Recommended for AI agents) - Natural language prompts
2. **Explicit Mode** (Recommended for precision control) - Structured requests

---

## AI-Assisted Mode (Natural Language Interface)

### Overview

An intelligent, semantic approach to generating AI media: write a natural language prompt, and let advanced AI transform it into a precise, optimized generation request.

**Intelligent Features:**
- 🧠 **Semantic Understanding:** Extracts nuanced hints from prompts
- 🎯 **Context-Aware Selection:** Chooses optimal models and parameters
- 🚀 **Zero-Configuration Generation:** Minimal client-side complexity
- 💡 **Multi-Modal Intelligence:** Supports video, image, audio, text generation

### How It Works

```typescript
import { getDatabase, ref, push, set } from 'firebase/database';

async function createAIJob(prompt: string) {
  const db = getDatabase();
  const jobsRef = ref(db, 'firegen-jobs');
  const newJobRef = push(jobsRef);

  // Single line, full AI-powered generation
  await set(newJobRef, prompt);

  return newJobRef.key;
}

// Intelligent, context-rich generation
const jobId = await createAIJob(
  "Create an inspirational video about scientific discovery that captures the wonder of human innovation"
);
```

**Advanced Semantic Analysis:**
1. Detect prompt's semantic context
2. Extract generation hints (quality, duration, mood)
3. Choose optimal model dynamically
4. Transform to structured, type-safe request
5. Generate with precise, intelligent parameters

**Benefits:**
- 🔬 **Advanced Semantic Processing**
- 🤖 **Intelligent Model Selection**
- 💨 **Instant Generation Setup**
- 🌐 **Multi-Lingual Support**

### Intelligent Examples

**Video Generation with Nuanced Hints:**
```typescript
// Scientific quality video
await set(jobRef, "Create a high-resolution educational video about quantum physics");
→ Chooses:
   - Model: "veo-3.0-generate-001" (highest quality)
   - Duration: 8 seconds
   - Resolution: 1080p
   - Aspect Ratio: 16:9
   - Enhanced educational prompt

// Emotional storytelling
await set(jobRef, "A heartwarming short film about human resilience");
→ Chooses:
   - Model: "veo-3.0-fast-generate-001" (balanced quality/speed)
   - Duration: 5 seconds
   - Mood-aware prompt enhancement
```

**Image Generation with Contextual Intelligence:**
```typescript
// Professional visualization
await set(jobRef, "Design a futuristic technology conference poster");
→ Chooses:
   - Model: "imagen-4.0-generate-001" (high detail)
   - Aspect Ratio: 3:2 (poster-friendly)
   - Enhanced professional prompt

// Creative exploration
await set(jobRef, "Surreal landscape blending natural and technological elements");
→ Chooses:
   - Model: "imagen-4.0-ultra-generate-001" (highest creativity)
   - Aspect Ratio: 16:9 (cinematic)
```

**Audio Generation with Emotional Intelligence:**
```typescript
// Expressive Text-to-Speech
await set(jobRef, "Narrate a motivational message with inspiring energy");
→ Chooses:
   - Model: "gemini-2.5-pro-preview-tts"
   - Voice: "Zephyr" (inspirational tone)
   - Language: Auto-detected

// Instrumental Composition
await set(jobRef, "Create an epic soundtrack for a science documentary");
→ Chooses:
   - Model: "lyria-002"
   - Negative Prompt: "vocals, singing"
   - Instrumental, cinematic generation
```

**Text Generation with Reasoning Depth:**
```typescript
// Analytical writing
await set(jobRef, "Comprehensive analysis of AI's societal impact, balancing technical and ethical perspectives");
→ Chooses:
   - Model: "gemini-2.5-pro"
   - Enhanced system instruction for balanced analysis
   - Nuanced, multi-perspective generation
```

### Advanced Monitoring

```typescript
async function getDetailedJobAnalysis(jobId: string) {
  const job = await getJobDetails(jobId);

  // Rich semantic insights
  console.log({
    originalPrompt: job._meta.prompt,
    aiAssisted: job._meta.aiAssisted,
    semanticContext: job._meta.semanticHints,
    modelSelectionReasoning: job._meta.modelSelectionReasoning
  });
}
```

### Error Handling & Edge Cases

**Intelligent Error Management:**
- Ambiguous prompts trigger clarification
- Semantic hint extraction with fallback strategies
- Detailed error reporting
- Graceful degradation to conservative defaults

**Example Scenarios:**
```typescript
// Vague prompt
await set(jobRef, "Make something interesting");
→ Status: "failed"
→ Error: "Please provide more specific details about your desired media type and content"

// Conflicting hints
await set(jobRef, "Ultra-fast high-resolution 4K video");
→ Resolves conflicting requirements intelligently
→ Provides balanced generation parameters
```

**Best Practices:**
- Provide clear, specific prompts
- Use descriptive language
- Include quality and style hints
- Be explicit about creative intentions

**Tip:** For mission-critical or precisely controlled generations, use Explicit Mode with full parameter specification.

---

## Explicit Mode (Structured Requests)

### 1. Create a Generation Job

Write a structured job to the RTDB at `firegen-jobs/{jobId}`:

#### Video Generation

```typescript
import { getDatabase, ref, push, set } from 'firebase/database';

// Text-to-video example
async function createVideoJob(userId: string, prompt: string) {
  const db = getDatabase();
  const jobsRef = ref(db, 'firegen-jobs');
  const newJobRef = push(jobsRef);

  await set(newJobRef, {
    uid: userId,
    status: 'requested',
    request: {
      type: 'video',
      model: 'veo-3.0-generate-001',
      prompt: prompt,
      duration: 8,
      aspectRatio: '16:9',
      resolution: '1080p',
      audio: true
    }
  });

  return newJobRef.key; // Job ID
}

// Image-to-video example (with reference image)
async function createImageToVideoJob(userId: string, prompt: string, imageGcsUri: string) {
  const db = getDatabase();
  const jobsRef = ref(db, 'firegen-jobs');
  const newJobRef = push(jobsRef);

  await set(newJobRef, {
    uid: userId,
    status: 'requested',
    request: {
      type: 'video',
      model: 'veo-3.0-fast-generate-001',
      prompt: prompt,
      duration: 5,
      aspectRatio: '16:9',
      resolution: '720p',
      audio: true,
      referenceImageGcsUri: imageGcsUri // GCS URI (gs://bucket/path/image.jpg)
    }
  });

  return newJobRef.key; // Job ID
}

// Example usage
const videoJobId = await createVideoJob('user123', 'A serene sunset over mountains');
const imageToVideoJobId = await createImageToVideoJob('user123', 'Camera zooming through mountains', 'gs://my-bucket/images/keyframe.jpg');
```

#### Image Generation (Nano Banana)

```typescript
import { getDatabase, ref, push, set } from 'firebase/database';

// Image generation example
async function createImageJob(userId: string, prompt: string, aspectRatio?: string) {
  const db = getDatabase();
  const jobsRef = ref(db, 'firegen-jobs');
  const newJobRef = push(jobsRef);

  await set(newJobRef, {
    uid: userId,
    status: 'requested',
    request: {
      type: 'image',
      model: 'nano-banana',
      prompt: prompt,
      aspectRatio: aspectRatio || '1:1' // Optional: defaults to 1:1
    }
  });

  return newJobRef.key; // Job ID
}

// Example usage
const imageJobId = await createImageJob('user123', 'A futuristic cityscape at sunset', '16:9');
```

#### Image Generation (Imagen)

```typescript
import { getDatabase, ref, push, set } from 'firebase/database';

// Imagen 4 generation example
async function createImagenJob(userId: string, prompt: string, aspectRatio?: string) {
  const db = getDatabase();
  const jobsRef = ref(db, 'firegen-jobs');
  const newJobRef = push(jobsRef);

  await set(newJobRef, {
    uid: userId,
    status: 'requested',
    request: {
      type: 'image',
      model: 'imagen-4.0-generate-001',
      prompt: prompt,
      aspectRatio: aspectRatio || '1:1',
      enhancePrompt: true,      // LLM-based prompt enhancement (default: true)
      sampleCount: 1,            // Number of images (1-4)
      personGeneration: 'allow_adult' // Control person generation
    }
  });

  return newJobRef.key; // Job ID
}

// Example usage
const imagenJobId = await createImagenJob('user123', 'A serene mountain landscape at sunset', '16:9');
```

#### Audio Generation - Text-to-Speech

```typescript
import { getDatabase, ref, push, set } from 'firebase/database';

// TTS generation example
async function createTTSJob(userId: string, text: string, voice?: string) {
  const db = getDatabase();
  const jobsRef = ref(db, 'firegen-jobs');
  const newJobRef = push(jobsRef);

  await set(newJobRef, {
    uid: userId,
    status: 'requested',
    request: {
      type: 'audio',
      subtype: 'tts',
      model: 'gemini-2.5-flash-preview-tts',
      text: text,
      voice: voice || 'Kore',  // 30 voices available
      language: 'en-US'         // Optional: auto-detected if omitted
    }
  });

  return newJobRef.key; // Job ID
}

// Example usage
const ttsJobId = await createTTSJob('user123', 'Say cheerfully: Welcome to FireGen!', 'Zephyr');
```

#### Audio Generation - Music (Lyria)

```typescript
import { getDatabase, ref, push, set } from 'firebase/database';

// Music generation example
async function createMusicJob(userId: string, prompt: string, seed?: number) {
  const db = getDatabase();
  const jobsRef = ref(db, 'firegen-jobs');
  const newJobRef = push(jobsRef);

  await set(newJobRef, {
    uid: userId,
    status: 'requested',
    request: {
      type: 'audio',
      subtype: 'music',
      model: 'lyria-002',
      prompt: prompt,
      negativePrompt: 'vocals, singing', // Optional: exclude terms
      seed: seed                          // Optional: reproducible generation
    }
  });

  return newJobRef.key; // Job ID
}

// Example usage
const musicJobId = await createMusicJob('user123', 'Upbeat electronic dance music with heavy bass', 42);
```

#### Audio Generation - Chirp TTS

```typescript
import { getDatabase, ref, push, set } from 'firebase/database';

// Chirp TTS generation example
async function createChirpTTSJob(userId: string, text: string, voice: string, language?: string) {
  const db = getDatabase();
  const jobsRef = ref(db, 'firegen-jobs');
  const newJobRef = push(jobsRef);

  await set(newJobRef, {
    uid: userId,
    status: 'requested',
    request: {
      type: 'audio',
      subtype: 'chirp-tts',
      model: 'chirp-3-hd',
      text: text,
      voice: voice,         // 248 voices available
      language: language,   // Optional: BCP-47 code (e.g., 'en-US', 'es-ES')
      sampleRate: 24000     // Optional: default 24000
    }
  });

  return newJobRef.key; // Job ID
}

// Example usage
const chirpTTSJobId = await createChirpTTSJob('user123', 'Hello, world!', 'en-US-Journey-F');
```

#### Audio Transcription - Chirp STT

```typescript
import { getDatabase, ref, push, set } from 'firebase/database';

// Chirp STT transcription example
async function createChirpSTTJob(userId: string, audioUri: string, language?: string) {
  const db = getDatabase();
  const jobsRef = ref(db, 'firegen-jobs');
  const newJobRef = push(jobsRef);

  await set(newJobRef, {
    uid: userId,
    status: 'requested',
    request: {
      type: 'audio',
      subtype: 'chirp-stt',
      model: 'chirp',
      audioUri: audioUri,   // GCS URI: gs://bucket/path/audio.wav
      language: language,   // Optional: auto-detected if omitted
      encoding: 'LINEAR16', // Optional: audio encoding
      sampleRate: 16000     // Optional: audio sample rate
    }
  });

  return newJobRef.key; // Job ID
}

// Example usage
const chirpSTTJobId = await createChirpSTTJob('user123', 'gs://my-bucket/audio/recording.wav', 'en-US');
```

#### Text Generation - Gemini

```typescript
import { getDatabase, ref, push, set } from 'firebase/database';

// Gemini text generation example
async function createTextJob(userId: string, prompt: string, systemInstruction?: string) {
  const db = getDatabase();
  const jobsRef = ref(db, 'firegen-jobs');
  const newJobRef = push(jobsRef);

  await set(newJobRef, {
    uid: userId,
    status: 'requested',
    request: {
      type: 'text',
      model: 'gemini-2.5-flash',  // or gemini-2.5-pro for highest quality
      prompt: prompt,
      systemInstruction: systemInstruction, // Optional: system instruction
      temperature: 0.7,                     // Optional: 0.0-2.0
      maxOutputTokens: 2048,                // Optional: max response length
      topP: 0.95,                           // Optional: nucleus sampling
      topK: 40                              // Optional: top-k sampling
    }
  });

  return newJobRef.key; // Job ID
}

// Example usage
const textJobId = await createTextJob(
  'user123',
  'Explain quantum computing in simple terms',
  'You are a helpful science teacher who explains complex topics in simple terms.'
);
```

**Key Differences:**
- **Video jobs** (Veo): Async (~30-120 seconds) - status goes `requested` → `starting` → `running` → `succeeded`
- **Image jobs** (Nano Banana, Imagen): Sync (~2-5 seconds) - status goes `requested` → `starting` → `succeeded`
- **Audio jobs** (TTS, Chirp TTS, Lyria): Sync (~2-20 seconds) - status goes `requested` → `starting` → `succeeded`
- **Text jobs** (Gemini): Sync (~1-10 seconds) - status goes `requested` → `starting` → `succeeded`
- **Chirp STT**: No file output - transcription text in `response.text`
- **Text**: No file output - generated text in `response.text`

### 2. Monitor Job Status

**⚠️ IMPORTANT: Monitor `status` field only, not the entire job node**

The backend updates `_meta` fields (attempt, nextPoll) every second during polling, which would cause unnecessary re-renders if you subscribe to the entire job. Instead, use this efficient pattern:

```typescript
import { getDatabase, ref, onValue, get } from 'firebase/database';

function watchJob(jobId: string) {
  const db = getDatabase();
  const statusRef = ref(db, `firegen-jobs/${jobId}/status`);

  // Subscribe ONLY to status changes (not the whole job)
  const unsubscribe = onValue(statusRef, async (snapshot) => {
    const status = snapshot.val();
    console.log('Job status:', status);

    switch (status) {
      case 'starting':
      case 'running':
        showProgressUI(status);
        break;

      case 'succeeded':
        // Fetch response ONCE when complete
        const jobSnap = await get(ref(db, `firegen-jobs/${jobId}`));
        const { response } = jobSnap.val();

        // ⚠️ IMPORTANT: Save video immediately - it will be deleted after 24 hours!
        await saveVideoToYourStorage(response.url); // Download to permanent storage
        displayVideo(response.url); // Use the signed URL for playback
        unsubscribe(); // Stop listening
        break;

      case 'failed':
      case 'expired':
        const errorSnap = await get(ref(db, `firegen-jobs/${jobId}/response/error`));
        showError(errorSnap.val()?.message);
        unsubscribe(); // Stop listening
        break;
    }
  });

  return unsubscribe;
}

// Example usage
const unsubscribe = watchJob('job123');
```

**Why this approach?**
- ✅ **Bandwidth efficient**: Only 10 bytes per status update (vs 500+ bytes for entire job)
- ✅ **Fewer renders**: Status changes 4-5 times total, not 30-120 times during polling
- ✅ **Cleaner code**: Clear state machine for UI updates
- ✅ **Auto-cleanup**: Unsubscribes when terminal state reached

### 3. Download or Display Media

**⚠️ CRITICAL: Media files are deleted after 24 hours - save them immediately!**

When the job succeeds, you have two URL options (both ephemeral):

```typescript
async function handleJobComplete(response: any) {
  // Option 1: Signed URL for browser playback (expires in 25h, file deleted in 24h)
  const signedUrl = response.url;
  // https://storage.googleapis.com/...?Expires=...&Signature=...

  // Option 2: GCS URI for backend operations (file deleted in 24h)
  const gcsUri = response.uri;
  // gs://bucket/firegen-jobs/{id}/video.mp4

  // ⚠️ REQUIRED: Download to your permanent storage immediately
  await fetch(signedUrl)
    .then(res => res.blob())
    .then(blob => uploadToYourStorage(blob)); // Save to Firebase Storage, S3, etc.

  // Display in video player (works for 24h only)
  const videoElement = document.querySelector('video');
  videoElement.src = signedUrl; // ✅ Use 'url' for temporary playback
}
```

**URL Comparison:**

| Field | Format | Lifetime | Best For |
|-------|--------|----------|----------|
| `url` | `https://storage.googleapis.com/...?Expires=...` | 25h expiry (file deleted 24h) | **Browser playback, immediate download** |
| `uri` | `gs://...` | 24h | Backend: copy to permanent storage |

**Example: Save to Firebase Storage**

```typescript
import { getStorage, ref, uploadBytes } from 'firebase/storage';

async function saveVideo(signedUrl: string, jobId: string) {
  // Download from FireGen (temporary)
  const response = await fetch(signedUrl);
  const blob = await response.blob();

  // Upload to your permanent storage
  const storage = getStorage();
  const videoRef = ref(storage, `my-videos/${jobId}.mp4`);
  await uploadBytes(videoRef, blob);

  console.log('Video saved permanently!');
}
```

## Job Lifecycle

1. **Client creates job** → Status: `requested`
2. **Function validates and starts Veo** → Status: `starting` → `running`
3. **Function polls every 1 second** → `_meta.attempt` increments
4. **On completion**:
   - **Success** → Status: `succeeded`, `response` contains video URIs
   - **Error** → Status: `failed`, `response.error` contains error details
   - **Timeout** → Status: `expired` (after 90 minutes)

## Cloud Functions

### `onFireGenJobRequested`
- **Trigger**: RTDB onCreate at `firegen-jobs/{jobId}`
- **Purpose**: Validates job and initiates Vertex AI video generation
- **Region**: `us-central1` (configurable via `FUNCTION_REGION`)

### `pollFireGenOperation`
- **Trigger**: Task Queue
- **Purpose**: Polls Vertex AI operation until complete
- **Retry**: Max 100 attempts
- **Concurrency**: Max 50 concurrent dispatches
- **Timeout**: 540 seconds per task

## Configuration

### Environment Variables

```bash
# Region for both Cloud Functions and Vertex AI
# Resolution order:
# 1. FIREGEN_REGION (explicit override for local development)
# 2. FUNCTION_REGION (auto-set by Cloud Functions in production)
# 3. Default: us-central1
FIREGEN_REGION=us-central1
```

All other constants are hard-coded in `src/config.ts`.

### Firebase Setup Requirements

1. **Firebase Project** with Blaze (pay-as-you-go) plan
2. **Realtime Database** enabled
3. **Cloud Storage** bucket configured
4. **Vertex AI API** enabled in Google Cloud
5. **Application Default Credentials** (ADC) for Vertex AI authentication

### Storage Structure

Media files are stored temporarily (24h) using the pattern `{mediaType}-{modelId}.{ext}`:

**Videos:**
```
uri: gs://{bucket}/firegen-jobs/{jobId}/video-veo-3.0-generate-001.mp4
url: https://storage.googleapis.com/{bucket}/firegen-jobs/{jobId}/video-veo-3.0-generate-001.mp4?Expires=...&Signature=...
```

**Images:**
```
uri: gs://{bucket}/firegen-jobs/{jobId}/image-nano-banana.png
uri: gs://{bucket}/firegen-jobs/{jobId}/image-imagen-4.0-generate-001.png
url: https://storage.googleapis.com/{bucket}/firegen-jobs/{jobId}/image-{model}.png?Expires=...&Signature=...
```

**Audio (TTS):**
```
uri: gs://{bucket}/firegen-jobs/{jobId}/audio-tts-gemini-2.5-flash-preview-tts.wav
url: https://storage.googleapis.com/{bucket}/firegen-jobs/{jobId}/audio-tts-{model}.wav?Expires=...&Signature=...
```

**Audio (Music):**
```
uri: gs://{bucket}/firegen-jobs/{jobId}/audio-music-lyria-002.wav
url: https://storage.googleapis.com/{bucket}/firegen-jobs/{jobId}/audio-music-{model}.wav?Expires=...&Signature=...
```

**Audio (Chirp TTS):**
```
uri: gs://{bucket}/firegen-jobs/{jobId}/audio-chirp-tts-chirp-3-hd.wav
url: https://storage.googleapis.com/{bucket}/firegen-jobs/{jobId}/audio-chirp-tts-{model}.wav?Expires=...&Signature=...
```

**Audio (Chirp STT) & Text (Gemini):**
```
text: "..."                     # Transcription or generated text (no file created)
# uri and url fields are omitted (not present in response)
```

The storage path mirrors the RTDB job path for easy correlation. All media files are automatically deleted after 24 hours. Text and transcription responses don't create files - they're stored directly in `response.text` with `uri` and `url` fields omitted.

## Error Handling

Common error scenarios:

```typescript
// Unsupported model
{
  status: 'failed',
  response: {
    error: { message: 'Unsupported Veo model' }
  }
}

// Missing operation name (internal error)
{
  status: 'failed',
  response: {
    error: { message: 'Missing operation name' }
  }
}

// Vertex AI error
{
  status: 'failed',
  response: {
    error: {
      message: 'Quota exceeded',
      code: 'RESOURCE_EXHAUSTED'
    }
  }
}

// Job expired
{
  status: 'expired'
}
```

## Performance Characteristics

| Model Type | Generation Time | Operation | Storage Upload |
|------------|-----------------|-----------|----------------|
| **Veo 3.0** | 30-120s | Async (polling) | Vertex AI (direct GCS) |
| **Veo 3.0 Fast** | 15-60s | Async (polling) | Vertex AI (direct GCS) |
| **Veo 2.0** | 30-120s | Async (polling) | Vertex AI (direct GCS) |
| **Nano Banana** | 2-5s | Sync (instant) | FireGen upload |
| **Imagen 4.0** | 3-8s | Sync (instant) | FireGen upload |
| **Imagen 4.0 Fast** | 2-5s | Sync (instant) | FireGen upload |
| **Imagen 4.0 Ultra** | 5-12s | Sync (instant) | FireGen upload |
| **Gemini TTS Flash** | 2-5s | Sync (instant) | FireGen upload |
| **Gemini TTS Pro** | 3-6s | Sync (instant) | FireGen upload |
| **Chirp 3 HD (TTS)** | 2-8s | Sync (instant) | FireGen upload |
| **Chirp (STT)** | 1-10s | Sync (instant) | No file (metadata only) |
| **Lyria 2** | 10-20s | Sync (instant) | FireGen upload |
| **Gemini 2.5 Pro** | 2-10s | Sync (instant) | No file (metadata only) |
| **Gemini 2.5 Flash** | 1-5s | Sync (instant) | No file (metadata only) |
| **Gemini 2.5 Flash Lite** | 1-3s | Sync (instant) | No file (metadata only) |
| **Gemini 2.0 Flash** | 1-5s | Sync (instant) | No file (metadata only) |
| **Gemini 2.0 Flash Lite** | 1-3s | Sync (instant) | No file (metadata only) |

**Additional Notes:**
- **Cold start**: ~2-5 seconds (first function invocation)
- **Warm start**: <500ms
- **Polling overhead**: 1 second between checks (Veo only)
- **Audio output**: PCM/WAV format (TTS: 24kHz mono, Lyria: 48kHz stereo)

## Best Practices

1. **⚠️ Save media immediately**: Download media (videos/images) to your permanent storage as soon as `status: 'succeeded'` - they will be deleted after 24 hours
2. **Monitor status field only**: Subscribe to `firegen-jobs/{jobId}/status` instead of the entire job to avoid unnecessary re-renders from `_meta` polling updates (especially important for videos)
3. **Client-side validation**: Validate `request` fields before creating job (check `request.type` to ensure proper schema)
4. **User quotas**: Implement rate limiting to prevent abuse
5. **Cleanup**: Remove old succeeded/failed jobs to save database space (job metadata persists even after media files are deleted)
6. **Error retry**: For transient errors, create a new job rather than retrying failed ones
7. **Storage lifecycle**: FireGen automatically deletes media after 24 hours - no additional lifecycle rules needed
8. **Cost monitoring**: Track Vertex AI usage and implement budget alerts
   - Videos: Veo pricing varies by model
   - Images: ~$0.039 per image (Nano Banana), Imagen pricing varies
   - Audio: TTS ~$0.016 per 1M characters, Lyria pricing varies
9. **Use `url` field**: For browser playback, use `response.url` (signed URL valid for 25h, but file deleted after 24h)
10. **Choose the right model**:
    - **Videos**: Veo 3.0 (quality) vs Veo 3.0 Fast (speed)
    - **Images**: Imagen 4.0 (quality) vs Imagen 4.0 Fast (speed) vs Nano Banana (instant)
    - **Audio TTS**: Chirp 3 HD (248 voices, 31 languages) vs Gemini TTS (30 voices, 24 languages)
    - **Audio Music**: Lyria (instrumental music)
    - **Text**: Gemini 2.5 Pro (highest quality) vs Gemini 2.5 Flash (speed) vs Flash Lite (cost)
11. **TTS voice selection**: Test Gemini voices at [Google AI Studio](https://aistudio.google.com/generate-speech) before implementation
12. **Music reproducibility**: Use `seed` parameter in Lyria for consistent music generation
13. **Text responses**: Access generated text from `response.text` (not a file, stored in RTDB)
14. **Chirp STT**: Provide audio as GCS URI, get transcription from `response.text`
15. **Token tracking**: Monitor `response.metadata.totalTokens` for text generation to track costs

## Security Considerations

- Jobs are user-scoped via `uid` field
- Implement RTDB security rules to restrict job creation and access
- Signed URLs (`response.url`) work without authentication but expire after 25 hours
- GCS URIs (`response.uri`) require Firebase Admin/service account access for backend operations
- Videos are automatically deleted after 24 hours for security and cost management

### Example RTDB Security Rules

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

## Troubleshooting

### Job stuck in "running" status
- Check Cloud Functions logs for errors
- Verify Vertex AI quota and API status
- Ensure Task Queue is processing (check Firebase Console)

### Videos not appearing in Storage
- Verify `storageUri` configuration in function code
- Check Storage bucket permissions
- Ensure Vertex AI has write access to the bucket
- Remember videos are deleted after 24 hours - check if enough time has passed

### High latency
- Check Vertex AI region matches function region
- Monitor Task Queue backlog
- Consider scaling Task Queue concurrency limits

## Related Documentation

- [Vertex AI Veo Documentation](https://cloud.google.com/vertex-ai/generative-ai/docs/video/generate-videos)
- [Firebase Cloud Functions](https://firebase.google.com/docs/functions)
- [Firebase Realtime Database](https://firebase.google.com/docs/database)
- [@google/genai SDK](https://www.npmjs.com/package/@google/genai)

