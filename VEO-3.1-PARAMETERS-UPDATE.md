# Veo 3.1 API Parameter Updates

**Date:** October 25, 2025  
**Status:** ✅ Completed and Tested

## Summary

Updated Veo 3.1 implementation to match official Vertex AI documentation, adding 5 new parameters that were previously missing from our schema.

## Findings

### 1. SDK Verification (`@google/genai` v1.27.0)

Confirmed the SDK correctly translates our requests to the official Vertex AI API format:

```typescript
// Our SDK call format:
ai.models.generateVideos({
  model: "veo-3.1-generate-preview",
  source: { prompt: "..." },
  config: { ... }
})

// Translates to official API format:
{
  "instances": [{ "prompt": "...", ... }],
  "parameters": { ... }
}
```

**Key Translations:**
- `numberOfVideos` → `sampleCount`
- `outputGcsUri` → `storageUri`
- `compressionQuality` → Uppercase enum values (`OPTIMIZED`, `LOSSLESS`)

### 2. New Parameters Added

| Parameter | Type | Values | Purpose |
|-----------|------|--------|---------|
| `seed` | `number` (int) | Any integer | Reproducible generation with same inputs |
| `enhancePrompt` | `boolean` | `true`, `false` | AI-powered prompt improvement |
| `personGeneration` | `string` | `"allow_adult"`, `"dont_allow"` | Safety controls for human generation |
| `compressionQuality` | `string` | `"optimized"`, `"lossless"` | Video file size vs quality trade-off |
| `referenceType` | `string` | `"asset"`, `"style"` | How reference images are applied |

## Implementation Changes

### Files Modified

1. **`shared-schemas.ts`** - Added Veo 3.1 specific type schemas
2. **`veo-3.1-generate-preview.ts`** - Updated schema and adapter
3. **`veo-3.1-fast-generate-preview.ts`** - Updated schema and adapter

### Schema Extensions

```typescript
// Added to shared-schemas.ts
export const VEO_COMPRESSION_QUALITY_SCHEMA = z.enum(["optimized", "lossless"]);
export const VEO_PERSON_GENERATION_SCHEMA = z.enum(["dont_allow", "allow_adult"]);
export const VEO_REFERENCE_TYPE_SCHEMA = z.enum(["asset", "style"]);

// Extended Veo 3.1 schemas
export const Veo31GeneratePreviewRequestSchema = VEO_COMMON_FIELDS_SCHEMA.extend({
  model: z.literal("veo-3.1-generate-preview"),
  // Image/Video inputs (existing)
  imageGcsUri: UrlOrGcsUriSchema.optional(),
  referenceSubjectImages: z.array(UrlOrGcsUriSchema).max(3).optional(),
  videoGcsUri: UrlOrGcsUriSchema.optional(),
  lastFrameGcsUri: UrlOrGcsUriSchema.optional(),
  // Generation controls (NEW)
  negativePrompt: z.string().optional(),
  seed: z.number().int().optional(),
  enhancePrompt: z.boolean().optional(),
  personGeneration: VEO_PERSON_GENERATION_SCHEMA.optional(),
  compressionQuality: VEO_COMPRESSION_QUALITY_SCHEMA.optional(),
  referenceType: VEO_REFERENCE_TYPE_SCHEMA.optional(),
});
```

### Adapter Updates

Both adapters now properly handle the new parameters:

```typescript
// Veo 3.1 specific features - Generation controls
if (validated.negativePrompt) {
  config.negativePrompt = validated.negativePrompt;
}
if (validated.seed !== undefined) {  // Handle seed=0 correctly
  config.seed = validated.seed;
}
if (validated.enhancePrompt !== undefined) {  // Handle false correctly
  config.enhancePrompt = validated.enhancePrompt;
}
if (validated.personGeneration) {
  config.personGeneration = validated.personGeneration;
}
if (validated.compressionQuality) {
  config.compressionQuality = validated.compressionQuality.toUpperCase();
}
```

### AI Hints Updated

Updated `veo-3.1-fast-generate-preview.ts` AI hints to include usage guidance for new parameters:

```typescript
6. enhancePrompt: boolean - AI-powered prompt improvement
   - Use when prompt is short/simple or user requests "enhance" or "improve prompt"

7. personGeneration: "allow_adult" | "dont_allow"
   - Default: allow_adult
   - Use "dont_allow" if user explicitly requests no people/humans

8. compressionQuality: "optimized" | "lossless"
   - Default: optimized (smaller file size)
   - Use "lossless" when user mentions "high quality", "uncompressed", "best quality"

9. seed: number - for reproducible generation
   - Extract if user provides a number for "seed" or "reproducible"
```

## Testing

### Test Coverage

Created comprehensive test suites:

1. **`veo-3.1-new-params.test.ts`** (9 tests)
   - Schema validation for all new parameters
   - Invalid value rejection
   - Backward compatibility
   - Parameter combination tests

2. **`veo-3.1-adapter-integration.test.ts`** (6 tests)
   - SDK parameter passing verification
   - Case conversion (lowercase → UPPERCASE)
   - Falsy value handling (`seed=0`, `enhancePrompt=false`)
   - Optional parameter exclusion
   - Feature combination tests

### Test Results

```
✓ veo-3.1-new-params.test.ts (9 tests)
✓ veo-3.1-adapter-integration.test.ts (6 tests)
✓ All Veo tests: 15/15 passed
```

## Backward Compatibility

✅ **Fully backward compatible** - All new parameters are optional. Existing code continues to work without modification.

```typescript
// Old code still works
{
  type: "video",
  model: "veo-3.1-fast-generate-preview",
  prompt: "A cat driving a car"
}

// New code can use additional parameters
{
  type: "video",
  model: "veo-3.1-fast-generate-preview",
  prompt: "A cat driving a car",
  seed: 12345,
  enhancePrompt: true,
  compressionQuality: "lossless"
}
```

## References

- **Vertex AI Veo Model Reference**: [Google Cloud Docs](https://cloud.google.com/vertex-ai/generative-ai/docs/model-reference/veo)
- **Gemini API Veo 3.1 Guide**: [Gemini API Docs](https://ai.google.dev/gemini-api/docs/veo)
- **SDK Type Definitions**: `@google/genai` v1.27.0 - `/dist/genai.d.ts`

## Usage Examples

### Reproducible Generation
```typescript
{
  model: "veo-3.1-fast-generate-preview",
  prompt: "A sunset over mountains",
  seed: 42  // Same seed = same output
}
```

### High Quality + No Compression
```typescript
{
  model: "veo-3.1-generate-preview",
  prompt: "Cinematic shot of a city",
  compressionQuality: "lossless",
  enhancePrompt: true
}
```

### No People/Humans
```typescript
{
  model: "veo-3.1-fast-generate-preview",
  prompt: "Abstract geometric shapes",
  personGeneration: "dont_allow"
}
```

### Negative Prompt + Quality Controls
```typescript
{
  model: "veo-3.1-generate-preview",
  prompt: "A professional product shot",
  negativePrompt: "blurry, low quality, distorted",
  compressionQuality: "lossless",
  seed: 123
}
```

## Next Steps

- [ ] Update LLMS.md documentation with new parameters
- [ ] Add examples to README showing new capabilities
- [ ] Monitor usage patterns for default value optimization
- [ ] Consider exposing `referenceType` in AI hints for advanced use cases
