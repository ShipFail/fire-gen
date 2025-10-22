# FireGen Integration Workarounds

> **For AI Agents:** Current workarounds for Vertex AI SDK limitations, type assertions, integration issues, and action items for future improvements. Load this context when modifying model adapters or debugging integration issues.

## Purpose

This document tracks workarounds required for integrating with Google Vertex AI through the `@google/genai` SDK. When modifying model adapters or debugging integration issues, review this file to understand:

- Why certain type assertions (`as any`) are necessary
- Which API methods may not exist in the SDK runtime
- How to handle SDK type mismatches
- Short/medium/long-term migration paths

**Last Updated:** 2025-10-07
**SDK Version:** `@google/genai@1.22.0`

### Key Updates
- Enhanced error handling for Chirp TTS/STT
- Updated alternative approaches for unverified SDK methods
- More comprehensive testing strategy for model adapters

---

## Status Overview

| Component | Status | Workaround Type | Notes |
|-----------|--------|-----------------|-------|
| Veo (Video) | ✅ Working | None | Fully typed SDK support |
| Imagen (Image) | ⚠️ Type cast | `as any` on method | `generateImages()` not in types |
| Nano Banana | ⚠️ Type cast | `as any` on config | `imageConfig` not typed |
| Gemini TTS | ⚠️ Type cast | `as any` on config | Audio config incomplete |
| Chirp TTS | 🔴 Unverified | `as any` on method | May not exist in SDK |
| Chirp STT | 🔴 Unverified | `as any` on method | May not exist in SDK |
| Lyria (Music) | ⚠️ Type cast | `as any` on method | `generateMusic()` not typed |
| Gemini Text | ✅ Working | Minor config cast | Mostly functional |

**Legend:**
- ✅ Working - Confirmed functional
- ⚠️ Type cast - Works but requires type assertions
- 🔴 Unverified - Implementation may not work in runtime

---

## Architectural Improvements (2025-10)

### MODEL_REGISTRY and Zod Validation

The codebase has been refactored to use a centralized MODEL_REGISTRY with Zod schema validation:

**Benefits:**
- ✅ Type-safe validation at runtime
- ✅ Centralized model configuration
- ✅ Easier to add new models (just register in one place)
- ✅ AI request analyzer uses Zod schemas for validation with retry

**Implementation:**
```typescript
// src/models/index.ts
export const MODEL_REGISTRY = {
  "veo-3.0-generate-001": {
    adapter: Veo3Adapter,
    config: {schema: VeoRequestSchema}  // Zod schema
  },
  // ... all models
} as const;
```

**Impact on Workarounds:**
- Type assertions still required for SDK methods
- But request validation is now type-safe via Zod
- AI analyzer validates with Zod and retries on errors

---

## Background

The FireGen extension uses the `@google/genai` SDK to interact with Google Vertex AI services. However, the published TypeScript types for this SDK are incomplete and don't reflect all capabilities available through the underlying Vertex AI REST API.

This creates a situation where:
1. ✅ The underlying Vertex AI API supports the feature
2. ⚠️ The SDK may or may not expose the method
3. 🔴 TypeScript types definitely don't include it
4. 💡 We use `as any` to bypass type checking

---

## Affected Models and Workarounds

### 1. Chirp TTS (Text-to-Speech)

**File:** `src/models/chirp-tts.ts`

**Issue:** SDK doesn't expose `synthesizeSpeech()` method in TypeScript types.

**Current Workaround:**
```typescript
const response = (await (ai.models as any).synthesizeSpeech({
  model: "chirp-3-hd",
  text: "...",
  voice: "...",
  language: "...",
  sampleRate: 24000
})) as any;
```

**Status:** 🔴 Type assertion required - method may not exist in runtime

**Error Handling:**
```typescript
try {
  response = await (ai.models as any).synthesizeSpeech({ ... });
} catch (err) {
  logger.error("Chirp TTS API call failed", {jobId, error: err});
  throw new Error(`Chirp TTS generation failed: ${err.message}`);
}

if (!response?.candidates?.[0]?.content?.parts) {
  logger.error("Invalid Chirp TTS response structure", {jobId, response});
  throw new Error("No audio data in Chirp TTS response - API may not be available");
}
```

**Alternative Approach:**
Use Google Cloud Text-to-Speech client library directly:
```bash
npm install @google-cloud/text-to-speech
```

Then:
```typescript
import {TextToSpeechClient} from '@google-cloud/text-to-speech';
const client = new TextToSpeechClient();

const [response] = await client.synthesizeSpeech({
  input: {text: request.text},
  voice: {languageCode: 'en-US', name: request.voice},
  audioConfig: {audioEncoding: 'LINEAR16', sampleRateHertz: 24000}
});
```

**Action Items:**
- [ ] **High Priority:** Integration test to verify API availability in production
- [ ] **Medium Priority:** Submit type definitions to @google/genai repository
- [ ] **Long Term:** Migrate to Cloud TTS client if SDK doesn't add support

---

### 2. Chirp STT (Speech-to-Text)

**File:** `src/models/chirp-stt.ts`

**Issue:** SDK doesn't expose `transcribeAudio()` method in TypeScript types.

**Current Workaround:**
```typescript
const response = (await (ai.models as any).transcribeAudio({
  model: "chirp",
  audioUri: "gs://...",
  language: "en-US",
  encoding: "LINEAR16",
  sampleRate: 16000
})) as any;
```

**Response Handling:**
Multiple possible response formats - check all fields:
```typescript
const text = response?.text ||
             response?.transcript ||
             response?.results?.[0]?.alternatives?.[0]?.transcript;

if (!text || (typeof text === "string" && text.trim().length === 0)) {
  logger.error("Invalid Chirp STT response structure", {jobId, response});
  throw new Error("No transcription text in Chirp STT response");
}
```

**Status:** 🔴 Unverified - may not be available through @google/genai SDK at all

**Alternative Approach:**
Use Google Cloud Speech-to-Text V2 client library with Chirp model:
```bash
npm install @google-cloud/speech
```

Then:
```typescript
import {SpeechClient} from '@google-cloud/speech';
const client = new SpeechClient();

const [response] = await client.recognize({
  recognizer: 'projects/{project}/locations/global/recognizers/chirp',
  config: {
    autoDecodingConfig: {},
    model: 'chirp',
    languageCodes: ['en-US']
  },
  uri: request.audioUri
});
```

**Action Items:**
- [ ] **High Priority:** Integration test to confirm API exists
- [ ] **Medium Priority:** Evaluate Cloud Speech V2 client as replacement
- [ ] **Long Term:** Remove type assertions when SDK adds official support

---

### 3. Imagen (Image Generation)

**File:** `src/models/imagen.ts`

**Issue:** SDK doesn't expose `generateImages()` method in TypeScript types.

**Current Workaround:**
```typescript
const response = (await (ai.models as any).generateImages({
  model: "imagen-4.0-generate-001",
  prompt: "...",
  aspectRatio: "16:9",
  enhancePrompt: true,
  sampleCount: 1
})) as any;
```

**Status:** ⚠️ Type assertion required - Imagen available through Vertex AI but not typed

**Error Handling:**
```typescript
try {
  response = await (ai.models as any).generateImages({ ... });
} catch (err) {
  logger.error("Imagen API call failed", {jobId, error: err});
  throw new Error(`Imagen generation failed: ${err.message}`);
}

const imagePart = response.candidates?.[0]?.content?.parts?.find(
  (part: any) => part.inlineData?.mimeType?.startsWith("image/")
);

if (!imagePart?.inlineData?.data) {
  throw new Error("No image data in Imagen response");
}
```

**Action Items:**
- [ ] **Short-term:** Continue with current workaround (seems stable)
- [ ] **Medium-term:** Create custom type definitions file
- [ ] **Long-term:** Wait for SDK updates or use Vertex AI REST API directly

---

### 4. Lyria (Music Generation)

**File:** `src/models/lyria.ts`

**Issue:** SDK doesn't expose `generateMusic()` method in TypeScript types.

**Current Workaround:**
```typescript
const response = (await (ai.models as any).generateMusic({
  model: "lyria-002",
  prompt: "...",
  negativePrompt: "...",
  seed: 42
})) as any;
```

**Status:** ⚠️ Type assertion required - Lyria available but not typed

**Error Handling:**
```typescript
try {
  response = await (ai.models as any).generateMusic({ ... });
} catch (err) {
  logger.error("Lyria API call failed", {jobId, error: err});
  throw new Error(`Lyria music generation failed: ${err.message}`);
}

const audioPart = response.candidates?.[0]?.content?.parts?.find(
  (part: any) => part.inlineData?.mimeType === "audio/wav"
);

if (!audioPart?.inlineData?.data) {
  throw new Error("No audio data in Lyria response");
}
```

**Action Items:**
- [ ] **Short-term:** Monitor for SDK updates
- [ ] **Medium-term:** Document actual API response structure
- [ ] **Long-term:** Remove assertions when officially supported

---

### 5. Nano Banana (Gemini 2.5 Flash Image)

**File:** `src/models/nano-banana.ts`

**Issue:** SDK types don't include image-specific configuration options.

**Current Workaround:**
```typescript
const response = await ai.models.generateContent({
  model: "gemini-2.5-flash-image",
  contents: "...",
  config: {
    responseModalities: ["IMAGE"],
    imageConfig: { aspectRatio: "16:9" }
  }
} as any);
```

**Status:** ⚠️ Partial typing - method exists but parameters not fully typed

**Action Items:**
- [ ] **Short-term:** Keep current assertion (low risk)
- [ ] **Medium-term:** Create type-safe wrapper interface
- [ ] **Long-term:** SDK type updates

---

### 6. Gemini Text

**File:** `src/models/gemini-text.ts`

**Issue:** Some advanced generation config parameters may not be fully typed.

**Current Workaround:**
```typescript
const response = await ai.models.generateContent({
  model: "gemini-2.5-flash",
  contents: "...",
  config: { temperature, maxOutputTokens, topP, topK, stopSequences },
  systemInstruction: "..."
} as any);
```

**Status:** ✅ Minor assertion - mostly functional, just config compatibility

**Action Items:**
- [ ] **Short-term:** No action needed (working well)
- [ ] **Long-term:** Remove assertion when SDK fully typed

---

## Error Handling Strategy

All adapters include comprehensive error handling:

```typescript
let response: any;
try {
  response = await (ai.models as any).someMethod({ ... });
} catch (err) {
  logger.error("API call failed", {jobId, error: err});
  throw new Error(`Operation failed: ${err instanceof Error ? err.message : "Unknown error"}`);
}

if (!response?.expectedField) {
  logger.error("Invalid response structure", {jobId, response});
  throw new Error("Expected data not found - API may not be available");
}
```

**Key Points:**
1. ✅ Try-catch wraps all API calls
2. ✅ Detailed logging with job context
3. ✅ Informative error messages indicating potential unavailability
4. ✅ Response validation before use

---

## Testing Status

| Model | Integration Tested | Production Verified | Notes |
|-------|-------------------|-------------------|-------|
| Veo | ✅ | ✅ | Fully working |
| Imagen | ⚠️ | ❌ | Needs prod testing |
| Nano Banana | ⚠️ | ❌ | Needs prod testing |
| Gemini TTS | ⚠️ | ❌ | Needs prod testing |
| **Chirp TTS** | ❌ | ❌ | **NEEDS INTEGRATION TEST** |
| **Chirp STT** | ❌ | ❌ | **NEEDS INTEGRATION TEST** |
| Lyria | ⚠️ | ❌ | Needs prod testing |
| Gemini Text | ✅ | ❌ | Needs prod testing |

**Critical:** Chirp TTS/STT have never been tested - may fail in runtime!

---

## Action Items Summary

### 🔴 High Priority (Short-term)

- [ ] **Integration test Chirp TTS/STT** to confirm API availability
- [ ] **Production test all sync models** (Imagen, TTS, Lyria, Text)
- [ ] **Monitor production logs** for API errors
- [ ] **Document actual API response structures** observed in runtime

### 🟡 Medium Priority (Medium-term)

- [ ] **Create custom TypeScript type definition files** for known APIs
- [ ] **Submit type definition PRs** to @google/genai repository
- [ ] **Consider migrating Chirp** to dedicated Cloud Speech/TTS clients
- [ ] **Build integration test suite** for all adapters

### 🟢 Low Priority (Long-term)

- [ ] **Wait for official SDK updates**
- [ ] **Remove type assertions** once SDK properly typed
- [ ] **Migrate to official typed APIs** when available
- [ ] **Document migration path** for future maintainers

---

## SDK Version History

| Date | SDK Version | Changes | Impact |
|------|-------------|---------|--------|
| 2025-01-XX | 1.22.0 | Initial implementation | All workarounds added |

**Note:** Check `package.json` for current SDK version. Update this log when upgrading.

---

## Related Documentation

- **[ARCHITECTURE.md](./ARCHITECTURE.md)** - System design and adapter pattern
- **[README.md](./README.md)** - Setup and deployment guide
- **[LLMS.md](./LLMS.md)** - API reference for integration

---

## Related Resources

- [Google Cloud Text-to-Speech Documentation](https://cloud.google.com/text-to-speech)
- [Google Cloud Speech-to-Text V2 (Chirp)](https://cloud.google.com/speech-to-text/v2/docs/chirp-model)
- [Vertex AI Imagen Documentation](https://cloud.google.com/vertex-ai/docs/generative-ai/image/overview)
- [@google/genai SDK GitHub](https://github.com/google/generative-ai-js)
