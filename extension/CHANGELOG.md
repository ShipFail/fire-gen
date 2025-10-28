# Changelog

All notable changes to the FireGen Extension will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.2.0] - 2025-10-27

### Added
- **MIME type support**: Added MIME type metadata to URL placeholder tags for Veo API compliance
- **Max poll attempts**: Added configurable limit to prevent infinite retry loops in async operations
- **Multi-part message support**: Gemini helper now supports multi-part user messages for better AI communication
- **Deterministic generation**: Added deterministic config to assisted-mode steps 2 & 3 for reproducible AI behavior
- **Response schemas**: All model adapters now include complete Response schemas in `.schema.ts` files
- **Semantic descriptions**: Added comprehensive descriptions to Zod schemas for self-documenting API

### Changed
- **Signed URL expiry**: Updated from 25 hours to 24 hours for consistency
- **RTDB schema refactoring**: Migrated to flat `files` array structure (replacing nested object format)
  - Files now use sequential naming: `file0.mp4`, `file1.png`, `file2.wav`
  - Each file includes: `name`, `gs`, `https`, `mimeType`, `size`
- **AI-assisted data separation**: Moved `prompt` and `reasons` to dedicated `assisted` field in RTDB schema
- **URL preprocessing**: Unified URL indexing and deduplication logic with FIREGEN_ prefix
- **Model output simplification**: Flattened ModelOutput to improve readability
- **Module exports**: Minimized exports to public interface only (no more `export *` patterns)

### Fixed
- **Veo polling**: Fixed 400 Bad Request errors for publisher model operations
  - Now correctly uses `POST {resourceName}:fetchPredictOperation` for publisher models
  - Normalizes operation names by detecting `/publishers/` pattern
- **Error logging**: Serialize Error objects before logging to prevent `{}` in Firebase logs
- **URL XML tag prompts**: Improved prompt clarity and validation
- **Enum string handling**: Workaround for tests to handle enum string values correctly

### Refactored
- **Assisted-mode architecture**: Renamed `ai-request-analyzer-v2` to `assisted-mode` for clarity
- **Reasoning chain**: Separated user prompts from AI reasoning using multi-part messages
- **Schema independence**: Each model's `.schema.ts` is now completely self-contained (no cross-imports)
- **Shared infrastructure**: Moved reusable code to `src/lib/` for better organization
- **Code duplication strategy**: Prefer duplication over coupling for independent model evolution

### Documentation
- **LLMS.md refactor**: Improved clarity for AI agent integration (consumer perspective)
- **README updates**: Added problem-solution-value framework targeting solo founders
- **Role clarification**: Documented `aiplatform.user` role requirement in extension setup

---

## [0.1.0] - 2025-10-15

### Added - Core Features
- **AI-Assisted Mode**: Natural language prompt → automatic model selection
  - Gemini 2.5 Flash analyzer picks optimal model and parameters
  - Reasoning chain stored in `assisted.reasons` for transparency
  - Semantic understanding (no keyword matching)
- **Explicit Mode**: Structured request with full parameter control
- **5 Model Support**: 
  - **Video**: Veo 3.1 Generate, Veo 3.1 Fast
  - **Image**: Gemini 2.5 Flash Image
  - **Audio**: Gemini 2.5 Flash TTS, Gemini 2.5 Pro TTS
- **Unified RTDB Interface**: Single schema for all models with `request`, `response`, `files`, `error`, `metadata`
- **Async/Sync Operations**: Task Queue for long-running ops (Veo), direct execution for fast ops (Gemini, TTS)

### Added - Veo 3.1 Capabilities
- **Extended parameters**: 
  - `seed` (reproducible generation)
  - `enhancePrompt` (AI-powered prompt improvement)
  - `personGeneration` (safety controls)
  - `compressionQuality` (optimized/lossless)
  - `referenceType` (asset/style)
- **Image-to-video**: Support for `imageGcsUri` and `negativePrompt`
- **Multi-subject generation**: Up to 3 subjects in single video
- **Scene extension**: Extend existing video clips
- **Frame-specific generation**: Control specific frames in video

### Added - Storage & URLs
- **URL tagging system**: MIME type detection for GCS URIs
- **Signed URL generation**: 24-hour expiry for secure file access
- **GCS integration**: Automatic file upload and cleanup
- **Sequential file naming**: `file0`, `file1`, `file2` pattern

### Added - AI Request Analyzer
- **3-step pipeline**:
  1. Model selection (semantic prompt analysis)
  2. Parameter inference (extract duration, aspect ratio, etc.)
  3. JSON generation (schema-validated output)
- **URL preprocessing**: Tag URLs with semantic placeholders before AI processing
- **Schema validation**: Zod schemas as single source of truth
- **Auto-generated AI hints**: `zodToJsonSchema()` for consistent guidance
- **Reasoning transparency**: Each step returns structured data + reasoning chain

### Added - Infrastructure
- **REST API architecture**: Pure REST API calls (no SDK dependencies)
- **Zod validation**: Type-safe schema validation for all models
- **Operation polling**: Exponential backoff with configurable TTL
- **Version tracking**: Build-time version injection in job metadata
- **Error handling**: Comprehensive error serialization and logging

### Added - Security & IAM
- **Service account permissions**: Pre-configured IAM roles
  - `cloudtasks.enqueuer` for task creation
  - `iam.serviceAccountTokenCreator` for signed URLs
  - `iam.serviceAccountUser` for Cloud Functions v2
  - `aiplatform.user` for Vertex AI access
- **User-scoped jobs**: `event.auth.uid` for security
- **App Check ready**: Firebase security best practices

### Added - Developer Experience
- **TypeScript-first**: Full type inference from Zod schemas
- **Comprehensive tests**: Unit tests for all adapters and AI analyzer
- **Extension metadata**: Versioned `extension.yaml` with Apache-2.0 license
- **PREINSTALL/POSTINSTALL**: Setup and configuration guides
- **Design documentation**: `AI_ASSIST_DESIGN_202509_V0.1.md` (historical reference)

### Technical Architecture
- **Firebase Cloud Functions v2**: Event-driven execution
- **Realtime Database triggers**: `onCreate` for job processing
- **Task Queue**: `firegen-tasks` queue for async polling
- **Vertex AI REST API**: Direct API integration (no SDK layer)
- **Standalone adapters**: One class per model (parallel AI modifications)
- **Open/Closed principle**: New versions = new files (not if-else branches)

### Migration Notes
- Complete SDK removal in favor of REST API architecture
- Migrated all 5 models from SDK to pure REST format
- Consolidated URI handling into single module
- Simplified URL tags from `GS_VIDEO_MP4_1` to `VIDEO_URI_1`
- Model naming consistency with actual REST API model names

---

## Version History Summary

- **v0.2.0** (2025-10-27): RTDB schema refinement, polling fixes, MIME support, error handling improvements
- **v0.1.0** (2025-10-15): Initial release with AI-assisted mode, 5 models, REST API architecture

---

## Links

- [GitHub Repository](https://github.com/shipfail/firegen)
- [Documentation](https://github.com/shipfail/firegen/blob/main/README.md)
- [Architecture Guide](https://github.com/shipfail/firegen/blob/main/ARCHITECTURE.md)
- [License](https://github.com/shipfail/firegen/blob/main/LICENSE)
