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
  files?: {
    "file0.mp4": {                          // Sequential naming: file0, file1, file2...
      gs: string                            // GCS URI (gs://bucket/path/file0.mp4)
      https: string                         // Signed URL (expires in 25h)
      mimeType?: string                     // e.g., "video/mp4", "image/png"
      size?: number                         // File size in bytes
    }
  }
  
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
- Both Request AND Response schemas must be defined in same `.schema.ts` file.
- Types are inferred from schemas using `z.infer<typeof Schema>` - never manually duplicate type definitions.
- Use `schema.parse(request)` for validation in all model adapters.
- AI hints auto-generated from schema using `zodToJsonSchema()` - never hardcode JSON examples.
- Tests must expect REST API format - use `expect.any()` for AI-chosen values only.
- Export schemas publicly from `.schema.ts` and re-export from main model file for easy imports.

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
