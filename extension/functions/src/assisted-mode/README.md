# Assisted Mode

**AI-Powered Prompt Analysis with Reasoning Chain Architecture**

Converts natural language prompts into structured model requests with full transparency through a 3-step AI reasoning pipeline.

## What is Assisted Mode?

Assisted Mode is FireGen's AI-powered interface that allows users to create media using natural language instead of explicit API parameters. When a job includes an `assisted.prompt` field, this module:

1. Analyzes the user's natural language request
2. Selects the optimal AI model (Veo, Gemini Image, Gemini TTS)
3. Infers all necessary parameters
4. Generates a validated JSON request
5. Provides complete reasoning transparency via `assisted.reasons`

**Contrast with Explicit Mode:** Users can also make direct API requests with exact model and parameters (no AI analysis needed).

## Architecture Overview

```
Pre-process → Step 1 (AI) → Step 2 (AI) → Step 3 (AI) → Post-process
    ↓            ↓             ↓             ↓             ↓
  URLs       Model         Parameter      JSON        Validation
  to tags   Selection     Inference    Generation    + URL restore
```

## Pipeline Stages

### Pre-process: URL Extraction (Deterministic)

**File**: `preprocess-urls.ts`  
**Purpose**: Convert URLs to tags for AI processing  
**Input**: `"Create video with gs://bucket/image.jpg"`  
**Output**: 
- `taggedPrompt`: `"Create video with <IMAGE_URI_1/>"`
- `extractedUrls`: `{images: ["gs://bucket/image.jpg"], videos: [], audio: []}`

**Supported URL Formats**:
- Firebase Storage: `https://firebasestorage.googleapis.com/...`
- GCS URIs: `gs://bucket/path/file.ext`
- HTTPS: `https://example.com/file.jpg`

**Tag Types**:
- `<IMAGE_URI_1/>`, `<IMAGE_URI_2/>`, ...
- `<VIDEO_URI_1/>`, `<VIDEO_URI_2/>`, ...
- `<AUDIO_URI_1/>`, `<AUDIO_URI_2/>`, ...

### Step 1: Model Selection (AI - JSON Mode)

**File**: `step1-model-selection.ts`  
**Model**: `gemini-2.5-flash-lite`  
**Purpose**: Select the best model for user's request  
**System Instruction**: `STEP1_SYSTEM` (prompts.ts)

**Output Schema** (Zod):
```typescript
{
  model: "veo-3.1-fast-generate-preview" | "gemini-2.5-flash-image" | "gemini-2.5-flash-preview-tts",
  reasoning: string[]
}
```

**Example Output**:
```json
{
  "model": "veo-3.1-fast-generate-preview",
  "reasoning": [
    "Selected model: veo-3.1-fast-generate-preview → User requested video generation",
    "Duration: 6 seconds → User specified duration"
  ]
}
```

### Step 2: Parameter Inference (AI - Reasoning)

**File**: `step2-parameter-inference.ts`  
**Model**: `gemini-2.5-flash-lite`  
**Purpose**: Generate reasoning for model parameters  
**System Instruction**: `buildStep2System(model, hints)` (prompts.ts)

**Input**: 
- `taggedPrompt`
- `selectedModel` (from Step 1)
- `step1Reasons` (from Step 1)
- `modelHints` (model-specific AI hints)

**Output**: `string[]` (reasoning lines)

**Format**: `"<parameter>: <value> → <reason>"`

**Example Output**:
```
[
  "durationSeconds: 6 → User specified 6-second video",
  "aspectRatio: 9:16 → Default vertical format",
  "image: <IMAGE_URI_1/> → Reference image from prompt"
]
```

### Step 3: JSON Generation (AI - JSON Schema Mode)

**File**: `step3-json-generation.ts`  
**Model**: `gemini-2.5-flash-lite`  
**Purpose**: Generate final JSON request  
**System Instruction**: `STEP3_SYSTEM` (prompts.ts)

**Input**:
- `taggedPrompt`
- `allReasons` (Step 1 + Step 2 reasoning combined)
- `modelSchema` (Zod schema for selected model only)

**Output**: `Record<string, unknown>` (validated JSON with tags)

**JSON Mode**: Uses Gemini's `responseMimeType: "application/json"` and `responseSchema` for type-safe generation

**Example Output**:
```json
{
  "prompt": {
    "text": "Create video of a cat playing"
  },
  "videoGenerationConfig": {
    "durationSeconds": 6,
    "aspectRatio": "9:16",
    "image": {
      "gcsUri": "<IMAGE_URI_1/>"
    }
  }
}
```

### Post-process: Validation + URL Restoration

**Files**: `validate-json.ts`, `restore-urls.ts`  
**Purpose**: Validate JSON and restore real URLs

**Validation** (validate-json.ts):
- Uses model's Zod schema for type checking
- Throws on validation errors

**URL Restoration** (restore-urls.ts):
- Replaces tags with actual URIs:
  - `<IMAGE_URI_1/>` → `gs://bucket/image.jpg`
  - `<VIDEO_URI_1/>` → `gs://bucket/video.mp4`
  - `<AUDIO_URI_1/>` → `gs://bucket/audio.mp3`

**Final Output**:
```json
{
  "prompt": {
    "text": "Create video of a cat playing"
  },
  "videoGenerationConfig": {
    "durationSeconds": 6,
    "aspectRatio": "9:16",
    "image": {
      "gcsUri": "gs://bucket/cat-reference.jpg"
    }
  }
}
```

## Orchestrator

**File**: `orchestrator.ts`  
**Export**: `analyzePrompt(prompt: string, jobId: string): Promise<AnalyzeResult>`

**Result Type**:
```typescript
interface AnalyzeResult {
  request: Record<string, unknown>;  // Final request with real URLs
  reasons: string[];                  // Complete reasoning chain (Step 1 + Step 2)
  model: string;                      // Selected model ID
}
```

**Flow**:
1. Pre-process URLs → tags
2. Step 1: AI selects model (JSON mode)
3. Get model hints for selected model
4. Step 2: AI infers parameters (reasoning)
5. Combine reasoning chains
6. Get model Zod schema
7. Step 3: AI generates JSON (JSON schema mode)
8. Validate with Zod
9. Restore URLs
10. Return result

## Configuration

**File**: `constants.ts`

**Supported Models** (Latest versions only):
- `veo-3.1-fast-generate-preview` - Video generation
- `gemini-2.5-flash-image` - Image generation
- `gemini-2.5-flash-preview-tts` - Text-to-speech

**Analyzer Model**: `gemini-2.5-flash-lite` (used for all 3 AI steps)

## Prompts

**File**: `prompts.ts`

**System Instructions**:
- `STEP1_SYSTEM` - Model selection (static)
- `buildStep2System(model, hints)` - Parameter inference (dynamic, includes model hints)
- `STEP3_SYSTEM` - JSON generation (static)

## Design Principles

1. **Reasoning Chain** - Each step outputs reasoning that feeds into next step
2. **URL Tagging** - Pre-process converts URLs to tags, restored after validation
3. **JSON Mode** - Use Gemini's responseSchema with zodToJsonSchema() for type-safe generation
4. **Single Schema Focus** - Step 3 uses only selected model's schema, not combined schemas
5. **Type Safety** - Zod validation ensures output matches model's expected format
6. **Transparency** - Full reasoning chain visible to users in assisted mode

## Usage

```typescript
import {analyzePrompt} from "./assisted-mode/index.js";

const result = await analyzePrompt(
  "Create a 6-second video of a sunset with gs://bucket/reference.jpg",
  "job-123"
);

console.log("Model:", result.model);
console.log("Reasoning:", result.reasons);
console.log("Request:", result.request);
```

## Testing

**Manual Test**: `__tests__/manual-test.ts`

Run with:
```bash
npx tsx src/assisted-mode/__tests__/manual-test.ts
```

Tests 3 scenarios:
1. Video with reference image (URL restoration)
2. Image generation (default parameters)
3. Text-to-speech (model selection)

## Migration from V1

**V1 Architecture** (2-step):
- Step 1: Pre-process (deterministic)
- Step 2: Analyze (AI - single step)

**V2 Architecture** (3-step AI):
- Pre-process (deterministic)
- Step 1: Model selection (AI - JSON mode)
- Step 2: Parameter inference (AI - reasoning)
- Step 3: JSON generation (AI - JSON schema mode)
- Post-process (validation + URL restore)

**Key Improvements**:
- ✅ Reasoning chain for transparency
- ✅ Type-safe JSON generation
- ✅ Separate model selection from parameter inference
- ✅ Explicit reasoning at each step
- ✅ URL tagging supports all model schemas
