# AGENTS.md

## Files Usage

- **README.md** - For humans developing the FireGen Extension (setup, quick start, deployment)
- **ARCHITECTURE.md** - For AI agents developing the FireGen Extension (system design, patterns, technical deep-dive)
- **WORKAROUNDS.md** - For AI agents to track SDK integration issues and technical debt of the FireGen Extension
- **LLMS.md** - For AI agents consuming/integrating FireGen Extension into their applications (API reference, job schemas)
- **AGENTS.md** (this file) - Working directory rules for AI agents (Claude Code, Gemini CLI, etc.)
- **TEST.md** - Test data examples

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
2. **Composition for Shared Code** - Extract only truly universal values/functions into shared utilities (e.g., `shared-schemas.ts` for ALL Veo versions)
3. **One Model = One Complete File** - Each model adapter is self-contained with all necessary code
4. **No Version Flags** - Create separate files for new versions instead of if-else branches (e.g., `veo-3.1.ts`, not `isVeo31` flag)
5. **Single Responsibility** - Each class handles one concern only
6. **Open/Closed** - New model versions = new files, not modifications to existing base classes

## Model Naming Rules

**CRITICAL: Use actual REST API model names everywhere - NO aliases, NO nicknames**

1. **Registry Keys**: Must match exact REST API model name (e.g., `"gemini-2.5-flash-image"`, NOT `"nano-banana"`)
2. **File Names**: Use actual model name (e.g., `gemini-2.5-flash-image.ts`, NOT `nano-banana.ts`)
3. **Directory Names**: Use descriptive but accurate names (e.g., `gemini-flash-image/`, NOT `nano-banana/`)
4. **Variable Names**: Use model-based names (e.g., `Gemini25FlashImageAdapter`, NOT `NanoBananaAdapter`)
5. **Constants**: Use model-based names (e.g., `GEMINI_25_FLASH_IMAGE_CONFIG`, NOT `NANO_BANANA_CONFIG`)
6. **AI Hints**: Primary reference must be actual model name (can mention nickname in parentheses for context only)

**Why**: 
- Prevents confusion between registry keys and actual model names
- Schema validation expects actual REST API model names
- AI analyzer outputs actual model names, not aliases
- Makes codebase searchable and maintainable

**Example**:
```typescript
// ✅ CORRECT
export const GEMINI_FLASH_IMAGE_MODELS = {
  "gemini-2.5-flash-image": {  // Actual REST API model name
    adapter: Gemini25FlashImageAdapter,
    config: GEMINI_25_FLASH_IMAGE_CONFIG,
  },
};

// ❌ WRONG
export const NANO_BANANA_MODELS = {
  "nano-banana": {  // Alias/nickname - causes validation failures
    adapter: NanoBananaAdapter,
    config: NANO_BANANA_CONFIG,
  },
};
```

## AI Hints & Documentation

1. **Concise over Verbose** - Shortest possible prompts that remain logical and complete
2. **No Common Sense** - Don't state obvious information LLMs already know
3. **No Keyword Matching** - Use semantic understanding, not hard-coded keyword rules
4. **Action-Oriented** - Write direct actions ("Extract gs:// URIs" not "You should extract...")
5. **Comprehensive in Primary** - Full documentation in main model variant, minimal hints in secondary variants
6. **Critical Rules First** - Most important detection rules at the top

## Testing & Validation

1. **Incremental Fixes** - Address test failures one category at a time
2. **Always Validate** - Run full test suite after structural changes
3. **Balance Brevity** - Hints must be concise but effective enough to guide AI correctly
