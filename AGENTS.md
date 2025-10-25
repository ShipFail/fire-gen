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
