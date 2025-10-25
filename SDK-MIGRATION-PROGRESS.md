# SDK Migration Progress

**Goal**: Remove `@google/genai` SDK completely, switch to pure REST API with pass-through Zod schemas.

## ✅ Completed Migrations (16/20 models, 80%)

### Phase 1: Veo Family ✅ (6 models)
**Pattern**: Async LRO with `predictLongRunning()` + polling

| Model | Endpoint | Schema Format |
|-------|----------|---------------|
| veo-3.1-generate-preview | `:predictLongRunning` | `{model, instances: [{prompt, image?, video?}], parameters: {aspectRatio, duration, ...}}` |
| veo-3.1-fast-generate-preview | `:predictLongRunning` | Same as veo-3.1 |
| veo-3.0-generate-001 | `:predictLongRunning` | Veo 3.0 parameters (resolution, no seed/enhancePrompt) |
| veo-3.0-fast-generate-001 | `:predictLongRunning` | Same as veo-3.0 |
| veo-2.0-generate-001 | `:predictLongRunning` | Veo 2.0 parameters (basic set) |

**Key Features**:
- Async long-running operations (LRO)
- Poll with `getOperation()` until `done: true`
- Extract GCS URI from operation response
- Support for image/video reference inputs

### Phase 2: Imagen Family ✅ (3 models)
**Pattern**: Synchronous with `predict()`

| Model | Endpoint | Schema Format |
|-------|----------|---------------|
| imagen-4.0-generate-001 | `:predict` | `{model, instances: [{prompt}], parameters: {aspectRatio, sampleCount, ...}}` |
| imagen-4.0-fast-generate-001 | `:predict` | Same as imagen-4.0 |
| imagen-4.0-ultra-generate-001 | `:predict` | Same as imagen-4.0 |

**Key Features**:
- Synchronous response (no LRO)
- Base64 image in `predictions[0].bytesBase64Encoded`
- Upload to GCS manually
- Optional enhanced prompt in response

**Parameters**: aspectRatio, sampleCount, enhancePrompt, personGeneration, language, safetySetting, seed, sampleImageSize, outputOptions

### Phase 3: Gemini Text Family ✅ (5 models)
**Pattern**: Synchronous with `generateContent()`

| Model | Endpoint | Schema Format |
|-------|----------|---------------|
| gemini-2.5-pro | `:generateContent` | `{contents: [{role, parts: [{text}]}], systemInstruction?, generationConfig?}` |
| gemini-2.5-flash | `:generateContent` | Same as gemini-2.5-pro |
| gemini-2.5-flash-lite | `:generateContent` | Same as gemini-2.5-pro |
| gemini-2.0-flash | `:generateContent` | Same as gemini-2.5-pro |
| gemini-2.0-flash-lite | `:generateContent` | Same as gemini-2.5-pro |

**Key Features**:
- Different endpoint (`:generateContent` not `:predict`)
- Contents array format for multi-turn conversations
- Text response in `candidates[0].content.parts[0].text`
- No GCS upload (text returned directly)
- Zod transform: simple string → contents array

**Parameters**: temperature, maxOutputTokens, topP, topK, stopSequences, candidateCount, responseMimeType, responseSchema, seed

### Phase 4: Gemini TTS Family ✅ (2 models)
**Pattern**: Synchronous with `generateContent()` + audio modality

| Model | Endpoint | Schema Format |
|-------|----------|---------------|
| gemini-2.5-flash-preview-tts | `:generateContent` | `{contents, generationConfig: {responseModalities: ["AUDIO"], speechConfig}}` |
| gemini-2.5-pro-preview-tts | `:generateContent` | Same as gemini-2.5-flash-tts |

**Key Features**:
- Same endpoint as Gemini text
- `responseModalities: ["AUDIO"]` triggers speech generation
- Base64 audio in `candidates[0].content.parts[0].inlineData.data`
- Voice config: `speechConfig.voiceConfig.prebuiltVoiceConfig.voiceName`
- Upload to GCS manually

## 🔄 Remaining Migrations (4 models)

### Chirp Models (2 models) - Audio STT/TTS
**Status**: Research needed - API endpoints unclear

| Model | Type | Current SDK Method | Notes |
|-------|------|-------------------|-------|
| chirp | STT (speech-to-text) | `ai.models.transcribeAudio()` | May use Cloud Speech-to-Text API, not Gen AI |
| chirp-3-hd | TTS (text-to-speech) | `ai.models.generateSpeech()` | May use Cloud Text-to-Speech API, not Gen AI |

**Issues**:
- Official Chirp API docs return 404
- Uncertain if these are Vertex AI Gen AI models or Cloud Speech API
- Need to determine correct REST endpoint

### Lyria (1 model) - Music Generation
**Status**: Research needed

| Model | Type | Current SDK Method | Notes |
|-------|------|-------------------|-------|
| lyria-002 | Music generation | `ai.models.generateMusic()` | Need official Lyria REST API docs |

### Nano-banana (1 model) - Image Model
**Status**: Research needed

| Model | Type | Current SDK Method | Notes |
|-------|------|-------------------|-------|
| nano-banana | Image model | `ai.models.generate()` | Need official REST API docs |

## Architecture Improvements ✅

### 1. Generic REST Client
```typescript
// vertex-ai-client.ts - Generic helper only
export async function callVertexAPI<T>(
  endpoint: string, 
  payload: Record<string, unknown>
): Promise<T>
```

### 2. Model-Specific Types in Model Files
- ✅ Moved `GeminiGenerateContentResponse` to `gemini-text/shared.ts`
- ✅ Moved `GeminiTTSResponse` to `gemini-tts/shared.ts`
- ✅ Each model family is self-contained
- ✅ Follows "Standalone over Inheritance" principle from AGENTS.md

### 3. Three REST API Patterns Established

**Pattern 1: Async LRO (Veo)**
```typescript
const op = await predictLongRunning(model, {instances, parameters});
// Poll until done
const result = await getOperation(op.name);
const uri = result.response.outputGcsUri;
```

**Pattern 2: Sync Predict (Imagen)**
```typescript
const response = await predict(model, {instances, parameters});
const base64 = response.predictions[0].bytesBase64Encoded;
// Upload to GCS
```

**Pattern 3: Sync GenerateContent (Gemini Text/TTS)**
```typescript
const response = await generateContent(model, {contents, generationConfig});
const text = response.candidates[0].content.parts[0].text;
// Or audio in inlineData for TTS
```

## Next Steps

1. **Research remaining models**:
   - Find official REST API docs for Chirp, Lyria, Nano-banana
   - Determine if Chirp uses Cloud Speech API or Gen AI API
   
2. **Complete migrations**:
   - Apply appropriate pattern to each remaining model
   - Create model-specific types in model files
   
3. **Update AI analyzer**:
   - Generate REST API format output (45 failing tests)
   - Use Zod schemas with zod-to-json-schema for LLM structured output
   
4. **Remove SDK completely**:
   - Delete `@google/genai` from package.json
   - Remove `ai-client.ts` file
   - Verify all tests pass

## Benefits Achieved

✅ **Single source of truth**: Official Vertex AI REST API format  
✅ **No SDK translation layer**: Direct API calls  
✅ **Pass-through schemas**: Zod schemas match API exactly  
✅ **Model independence**: Each family self-contained  
✅ **Easier debugging**: Raw REST requests visible in logs  
✅ **Better type safety**: Full control over TypeScript types  
✅ **Architecture compliance**: Follows AGENTS.md principles  

## Commits

1. `f3e8623` - refactor(veo): complete Veo family migration to REST API
2. `1944830` - refactor(imagen): migrate Imagen family to REST API
3. `256fb53` - refactor(gemini-text): migrate Gemini Text to REST API
4. `e4ec440` - refactor: move model-specific types to model files
5. `ae1347f` - refactor(gemini-tts): migrate Gemini TTS to REST API
