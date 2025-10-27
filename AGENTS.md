---
rule_format: "Make each rule a high-level, concise, short, and clear one-liner."
---

# AGENTS.md

## Files Usage

- **README.md** - For humans developing the FireGen Extension (setup, quick start, deployment)
- **ARCHITECTURE.md** - For AI agents developing the FireGen Extension (system design, patterns, technical deep-dive)
- **LLMS.md** - For AI agents consuming/integrating FireGen Extension into their applications (API reference, job schemas)
- **AGENTS.md** (this file) - Working directory rules for AI agents (Claude Code, Gemini CLI, etc.)
- **TEST.md** - Test data examples

## Documentation Positioning

1. **LLMS.md is for external consumers** - AI agents integrating FireGen use LLMS.md for API schemas, job structure, and integration examples (consumer perspective: "how to USE")
2. **README.md is for internal developers** - Human developers building/deploying FireGen use README.md for setup, installation, and development workflow (builder perspective: "how to BUILD")

## RTDB Schema (Critical User Interface)

**This is the most important interface to end-users. All changes must maintain this structure.**

```typescript
firegen-jobs/{jobId}/
  // Core job data
  uid: string                               // User ID
  model: string                             // Model identifier (e.g., "veo-3.1-fast-generate-preview")
  status: "requested" | "starting" | "running" | "succeeded" | "failed" | "expired" | "canceled"
  
  // Model communication (raw data)
  request: Record<string, unknown>          // Raw request sent to model API
  response?: Record<string, unknown>        // Raw response from model API (includes tokens, safety, etc.)
  
  // Generated files (user access)
  files?: [
    {
      name: string                          // Filename (e.g., "file0.mp4", "file1.png")
      gs: string                            // GCS URI (gs://bucket/path/file0.mp4)
      https: string                         // Signed URL (expires in 25h)
      mimeType?: string                     // e.g., "video/mp4", "image/png"
      size?: number                         // File size in bytes
    }
  ]
  
  // Errors
  error?: {
    code: string                            // Error code (e.g., "VALIDATION_ERROR")
    message: string                         // Human-readable error message
    details?: Record<string, unknown>       // Additional error context
  }

  // AI Assisted Mode only
  assisted?: {
    prompt: string                          // Original user prompt (AI-assisted mode only)
    reasons: string[]                       // AI reasoning chain (AI-assisted mode only)
  }

  // Metadata
  metadata: {
    version: string                         // FireGen version
    createdAt: number                       // Job creation timestamp (ms)
    updatedAt: number                       // Last update timestamp (ms)
    // Polling metadata (async operations only)
    operation?: string                      // Vertex AI operation name
    attempt?: number                        // Poll attempts
    nextPoll?: number                       // Next poll timestamp (ms)
    ttl?: number                            // Job expiration timestamp (ms)
    lastError?: number                      // Last error timestamp (ms)
  }
```

**Key Design Principles:**

1. **`request` and `response` are raw** - Exact model API format, no transformation
2. **`files` is user-facing** - Clean access URLs with sequential naming (file0, file1, file2...)
3. **`error` is system errors** - Model errors stay in `response.error`
4. **`metadata` contains timestamps** - All temporal and diagnostic data in one namespace
5. **`model` at root level** - Enables efficient querying by model type
6. **`assisted` optional** - Only present for AI-assisted jobs

## Rules

- Use TypeScript as possible as you can, because TypeScript is preferred as primary language.
- Use `npx tsx` to run TypeScript code.
- Use `pnpm` instead of `npm` to manage dependencies.
- package.json dependencies should be installed using `pnpm add` with `@latest` version
- never use keyword/pattern match to solve problems, always use AI semantic understanding
- when trying to solve a problem, always follow 1st principles thinking, break down the problem into smaller parts, and solve each part step-by-step. always search online for similar problems and solutions.
- Always use semantic understanding and AI-native techniques for prompt tagging and classification.
- use `zod` for schema definition and validation
- Never use hard-coded keyword/substring rule engines for prompt tagging or classification.
- create temp files in `/tmp` directory. i.e. log files, debug code files.
- Avoid git operations (clone, commit, push, pull, etc.) unless user approved.
- use `gcloud auth application-default login` to authenticate gcloud API requests in development environment
- Always read file content before editing, especially for front matter or top-of-file modifications to avoid duplication.
- **Error Logging**: Always serialize Error objects before logging - use `serializeError(err)` from `lib/error-utils` instead of raw `err` because Error objects have non-enumerable properties and serialize to `{}` in JSON/Firebase Functions logger.

## Module Export Rules

1. **Explicit Exports Only** - Never use `export * from`; always use explicit `export { X, Y, Z } from` syntax for clarity and intentionality
2. **Minimal Public Interface** - Treat each folder as a module; only export what external modules actually use; keep everything private by default; analyze actual usage before exporting

## Supported Models

- **Latest versions only**: FireGen always uses the newest model versions (Veo, Gemini, etc.)
- **When new versions release**: Old versions are removed from AI analyzer but kept for backward compatibility
- **Example**: When Veo 3.1 releases, Veo 3.0 is hidden from AI but still works for direct API calls

## Model Version Migration Rules

### Two-Tier Architecture
1. **AI Analyzer Tier**: Only exposes the latest model versions
2. **Implicit Request Tier**: Supports all model versions (new and old)

### Rules When Adding New Model Versions

1. **AI Analyzer**: Remove all old versions from AI hints - only latest versions visible
2. **Codebase**: Keep old model adapters and schemas - don't delete them
3. **Tests**: Update to expect new versions - remove tests for old versions
4. **Documentation**: Mark old versions as "implicit requests only"
5. **Dependencies**: Always use `@latest` SDK version


## Code Architecture

1. **Standalone over Inheritance** - Use separate classes per model to enable parallel AI modifications without conflicts
2. **One Model = One Complete File** - Each model adapter is self-contained with all necessary code
3. **No Version Flags** - Create separate files for new versions instead of if-else branches (e.g., `veo-3.1.ts`, not `isVeo31` flag)
4. **Single Responsibility** - Each class handles one concern only
5. **Open/Closed** - New model versions = new files, not modifications to existing base classes
6. **Duplication over Coupling** - Each schema file is self-contained; duplicating code is better than sharing schemas across models

## Model Naming Rules

- Use actual REST API model names everywhere
- AI Hints: Primary reference must be actual model name (can mention nickname in parentheses for context only)
- use `zod` for schema definition and validation

## Zod Schema as Single Source of Truth

- Each `.schema.ts` file must be completely self-contained - NEVER import schemas from other models; duplicate code instead to enable independent evolution.
- Schema structure must match official Vertex AI REST API exactly - no transformations or additions.
- **Schemas use semantically correct types** - e.g., `durationSeconds: z.union([z.literal(4), z.literal(6), z.literal(8)])` uses integers because the API accepts integers, not strings.
- Both Request AND Response schemas must be defined in same `.schema.ts` file.
- Types are inferred from schemas using `z.infer<typeof Schema>` - never manually duplicate type definitions.
- Use `schema.parse(request)` for validation in all model adapters.
- AI hints auto-generated from schema using `zodToJsonSchema()` - never hardcode JSON examples.
- Tests must expect REST API format - use `expect.any()` for AI-chosen values only.
- Export schemas publicly from `.schema.ts` and re-export from main model file for easy imports.

## Schema Description Layer Separation

1. **Schema Layer** - `.schema.ts` describes WHAT fields do functionally (capabilities, valid values, constraints, relationships)
2. **AI Hints Layer** - `ai-hints.ts` describes HOW users express intent (language patterns, decision rules, prompt examples)
3. **Golden Rule** - Schema descriptions are functional documentation; user language patterns belong exclusively in AI hints
4. **Never mix layers** - NEVER include "user says..." patterns or keyword matching guidance in schema descriptions

## AI Hints Generation Rules

**AI hints must be auto-generated from Zod schemas to prevent drift:**

1. **Use `zodToJsonSchema()`** - Convert Zod schema to JSON Schema format for AI hints (one function call only)
2. **No hardcoded JSON examples** - Schema structure comes from Zod, not manual JSON strings
3. **Update schema → hints update automatically** - Changing Zod schema immediately updates AI guidance

## Model Naming Rules

## AI Hints & Documentation

1. **Concise over Verbose** - Shortest possible prompts that remain logical and complete
2. **No Common Sense** - Don't state obvious information LLMs already know
3. **No Keyword Matching** - Use semantic understanding, not hard-coded keyword rules
4. **Action-Oriented** - Write direct actions ("Extract gs:// URIs" not "You should extract...")
5. **Comprehensive in Primary** - Full documentation in main model variant, minimal hints in secondary variants
6. **Critical Rules First** - Most important detection rules at the top
7. **One AI Hints Prompt** - In the file `models/{modelId}/ai-hints.ts` only export one string constant named `{MODEL}_AI_HINTS` to be used by AI agents.

## Testing & Validation

1. **Incremental Fixes** - Address test failures one category at a time
2. **Always Validate** - Run full test suite after structural changes
3. **Balance Brevity** - Hints must be concise but effective enough to guide AI correctly

## AI Pipeline Architecture

1. **Multi-step AI pipelines return structured data + reasoning** - Each AI step returns both typed data and reasoning chain for transparency
2. **Use JSON mode with schema validation** - Always use AI's native JSON mode with schema definitions for type-safe outputs
3. **System instructions omit role field** - System instruction format is `{parts: [{text}]}`, not `{role: "user", parts: [{text}]}`
4. **Pre/post-process layers are deterministic** - Separate pure logic (URL extraction, validation) from AI calls
5. **Semantic tagging for AI context** - Convert complex data (URLs, references) to semantic tags before AI processing, restore after validation
6. **Single schema per AI generation step** - Never combine multiple schemas in one generation - focus AI on one schema at a time
7. **Explicit data flow between steps** - Return structured data explicitly instead of parsing AI text output with regex

## Reasoning Chain Pattern

8. **Reasoning chains are flat string arrays** - Each reasoning line is a separate array item, not nested objects or concatenated strings
9. **One-liner reasoning format** - Each reason must be concise: `"<decision>: <value> → <reason>"`
10. **Reasoning feeds forward through pipeline** - Each step receives all previous reasoning as context
11. **No keyword extraction from reasoning** - Trust AI to infer semantically from reasoning text; avoid parsing with regex

## Schema & Validation

12. **Relaxed validation for intermediate representations** - Use lenient schema validation for tagged/intermediate formats, strict validation for final output
13. **Two-stage validation pattern** - Validate intermediate format during generation, validate final format after transformation
14. **Validate immediately after AI generation** - Use schema validation right after each AI step, don't defer

## Data Flow

15. **Explicit state tracking between steps** - Return critical state (like model selection) as structured data, not embedded in reasoning text
16. **Immutable prompts across steps** - Don't add metadata labels to prompts; concatenate raw content only
17. **Expert persona for schema-based generation** - Use domain expert system prompts for structured output generation tasks

## File Organization

18. **Step files are numbered and self-contained** - Name pipeline steps as `step1-*.ts`, `step2-*.ts` with clear single responsibility
19. **Orchestrator coordinates without logic** - Main orchestrator file coordinates pipeline flow but contains no business logic
20. **README in each major module** - Document architecture, data flow, and design principles in module-level README
