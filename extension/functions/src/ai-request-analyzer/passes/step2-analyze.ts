// functions/src/ai-request-analyzer/passes/step2-analyze.ts
import * as logger from "firebase-functions/logger";

import {callVertexAPI} from "../../models/_shared/vertex-ai-client.js";
import {PROJECT_ID} from "../../firebase-admin.js";
import {REGION} from "../../env.js";

// Gemini response type
interface GeminiResponse {
  candidates: Array<{
    content: {
      parts: Array<{
        text: string;
      }>;
    };
  }>;
}

/**
 * Step 2: AI-Powered Final Model Selection
 *
 * Responsibilities:
 * 1. Review top 3 candidates from Step 1
 * 2. Consider validation errors (if retry)
 * 3. Make final model selection
 * 4. Finalize all parameters
 * 5. Output JobRequest as JSON + reasoning (plain text)
 *
 * This step is DECISIVE - picks the best candidate and commits to final parameters.
 *
 * Input:
 *   contexts[0] = user prompt
 *   contexts[1] = Step 1 output (candidates)
 *   contexts[2+] = validation errors (if retry)
 *
 * Output: Plain text with JobRequest JSON + reasoning:
 *   Selected Model: veo-3.0-generate-001
 *
 *   Job Request:
 *   {"type":"video","model":"veo-3.0-generate-001","prompt":"waterfall","duration":8,"aspectRatio":"9:16"...}
 *
 *   Selection Reasoning:
 *   Chose veo-3.0-generate-001 over fast variant because...
 *
 *   Parameter Reasoning:
 *   - aspectRatio: "9:16" - Vertical means TALLER (height > width), so 9:16
 *   - duration: 8 - Default, no duration specified
 *   ...
 *
 * @param contexts - Array of context strings [prompt, step1Context, errors...]
 * @param jobId - Job ID for logging
 * @returns Plain text string with JobRequest JSON and reasoning
 */
export async function step2Analyze(
  contexts: string[],
  jobId: string
): Promise<string> {
  logger.info("Step 2: Making final selection", {jobId});

  // Parse contexts
  const userPrompt = contexts[0];
  const step1Candidates = contexts[1];
  const validationErrors = contexts.slice(2).filter((c) => c.includes("Validation Error"));

  if (validationErrors.length > 0) {
    logger.info("Step 2: Retry with validation errors", {
      jobId,
      errorCount: validationErrors.length,
    });
  }

  // Build AI prompt
  const aiPrompt = `User Prompt: ${userPrompt}

Candidates (Step 1):
${step1Candidates}

${
  validationErrors.length > 0
    ? `
Validation Errors:
${validationErrors.join("\n")}

FIX these errors in your response.
`
    : ""
}

---

Task: Select best model and build complete REST API JobRequest JSON.

CRITICAL: Each model family uses DIFFERENT REST API schema!

**Schema Formats by Model Family:**

1. **VEO (video)** - instances/parameters format:
{
  "model": "veo-3.1-fast-generate-preview",
  "instances": [{"prompt": "..."}],
  "parameters": {
    "durationSeconds": 8,
    "aspectRatio": "16:9",
    "generateAudio": true,
    "negativePrompt": "..." // optional
  }
}

2. **IMAGEN (image)** - instances/parameters format:
{
  "model": "imagen-4.0-fast-generate-001",
  "instances": [{"prompt": "..."}],
  "parameters": {
    "aspectRatio": "1:1",
    "sampleCount": 1,
    "negativePrompt": "..." // optional
  }
}

3. **GEMINI TEXT** - contents/generationConfig format:
{
  "model": "gemini-2.5-flash",
  "contents": [{"role": "user", "parts": [{"text": "..."}]}],
  "generationConfig": {
    "temperature": 1.0,
    "topP": 0.95,
    "topK": 40,
    "maxOutputTokens": 8192
  }
}

4. **GEMINI TTS** - contents/generationConfig with speechConfig:
{
  "model": "gemini-2.5-flash-preview-tts",
  "contents": [{"role": "user", "parts": [{"text": "Say: hello world"}]}],
  "generationConfig": {
    "responseModalities": ["AUDIO"],
    "speechConfig": {
      "voiceConfig": {
        "prebuiltVoiceConfig": {"voiceName": "Aoede"}
      }
    }
  }
}

5. **NANO-BANANA** - contents/generationConfig with IMAGE modality:
{
  "model": "gemini-2.5-flash-image",
  "contents": [{"role": "user", "parts": [{"text": "..."}]}],
  "generationConfig": {
    "responseModalities": ["IMAGE"],
    "imageConfig": {"aspectRatio": "1:1"}
  }
}

6. **LYRIA/CHIRP** - Check Step 1 candidates for format

Default Values:
- Veo: durationSeconds=8, aspectRatio="16:9", generateAudio=true
- Imagen: aspectRatio="1:1", sampleCount=1
- Nano-banana: aspectRatio="1:1"
- Gemini text: temperature=1.0, topP=0.95

URL Extraction Rules:

⚠️ CRITICAL: Every <VIDEO_URI_N/>, <IMAGE_URI_N/>, <AUDIO_URI_N/> tag MUST be extracted!
❌ NEVER leave URL tags in prompt only - MUST extract to request fields!

Tag Categories:
- <IMAGE_URI_N/> → Image files
- <VIDEO_URI_N/> → Video files
- <AUDIO_URI_N/> → Audio files

VEO Extraction Rules:

1. SINGLE VIDEO tag → instances[0].video = {"gcsUri": "<VIDEO_URI_N/>"}
   - If also has IMAGE tag → instances[0].lastFrame = {"gcsUri": "<IMAGE_URI_N/>"}

2. SINGLE IMAGE tag:
   - "animate", "bring to life" → instances[0].image = {"gcsUri": "<IMAGE_URI_N/>"}
   - ALL OTHER cases → instances[0].referenceImages = [{"image": {"gcsUri": "<tag>"}, "referenceType": "ASSET"}]

3. MULTIPLE IMAGE tags (2-3):
   - Extract ALL to referenceImages array (max 3)

EXAMPLES:

Prompt: "Animate <IMAGE_URI_1/>"
→ {"model": "veo-3.1-fast-generate-preview", "instances": [{"prompt": "Animate", "image": {"gcsUri": "<IMAGE_URI_1/>"}}], "parameters": {"durationSeconds": 8, "aspectRatio": "16:9", "generateAudio": true}}

Prompt: "Mountain climber reaching summit <IMAGE_URI_1/>"
→ {"model": "veo-3.1-fast-generate-preview", "instances": [{"prompt": "Mountain climber reaching summit", "referenceImages": [{"image": {"gcsUri": "<IMAGE_URI_1/>"}, "referenceType": "ASSET"}]}], "parameters": {"durationSeconds": 8, "aspectRatio": "16:9", "generateAudio": true}}

Prompt: "Continue <VIDEO_URI_1/>"
→ {"model": "veo-3.1-fast-generate-preview", "instances": [{"prompt": "Continue", "video": {"gcsUri": "<VIDEO_URI_1/>"}}], "parameters": {"durationSeconds": 8, "aspectRatio": "16:9", "generateAudio": true}}

Negative Prompts:
"avoid X", "without X", "no X" → Extract X to negativePrompt field

Format:

Selected Model: <model-id>

Job Request:
<complete JSON using correct schema format>

Parameter Reasoning:
- <field>: <value> → [why]

Example for Video:

Selected Model: veo-3.1-fast-generate-preview

Job Request:
{"model":"veo-3.1-fast-generate-preview","instances":[{"prompt":"Vertical waterfall cascading down"}],"parameters":{"durationSeconds":8,"aspectRatio":"9:16","generateAudio":true}}

Parameter Reasoning:
- instances[0].prompt: "Vertical waterfall cascading down" → VERBATIM
- parameters.durationSeconds: 8 → default
- parameters.aspectRatio: "9:16" → vertical = taller (9:16)
- parameters.generateAudio: true → default`;

  // Call AI with greedy decoding for deterministic decisions
  logger.info("Step 2: Calling AI for final selection", {jobId});
  
  const endpoint = `v1/projects/${PROJECT_ID}/locations/${REGION}/publishers/google/models/gemini-2.5-flash-lite:generateContent`;
  const response = await callVertexAPI<GeminiResponse>(endpoint, {
    contents: [{role: "user", parts: [{text: aiPrompt}]}],
    generationConfig: {
      temperature: 0,        // Greedy decoding - no randomness
      topK: 1,               // Only consider #1 most probable token
      topP: 1.0,             // No nucleus sampling
      candidateCount: 1,     // Single response
      maxOutputTokens: 8192, // Fixed token limit
    },
  });

  const responseText = response.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!responseText) {
    throw new Error("Empty response from Step 2 final selection");
  }

  logger.info("Step 2 complete", {
    jobId,
    responseLength: responseText.length,
  });

  return responseText;
}
