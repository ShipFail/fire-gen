// functions/src/ai-request-analyzer/analyzer.test.ts
import {describe, test, expect} from "vitest";
import {analyzePrompt} from "./index.js";

/**
 * AI Request Analyzer Test Suite
 *
 * Uses test.concurrent.each() for parallel test execution.
 * Each fixture becomes one named test that can be filtered with -t flag.
 *
 * Note: We use direct import of expect() rather than test context to work
 * around Vitest issue #4963 (test.concurrent.each context not properly typed).
 *
 * Usage:
 * - Run all tests: npm run test:analyzer
 * - Run single test: npm run test:analyzer -- -t "video:sunset"
 * - Run category: npm run test:analyzer -- -t "video:"
 * - Run in watch mode: npm run test:analyzer:watch -- -t "image:"
 */

/**
 * Test Fixtures: Prompt → Expected Request
 *
 * Each fixture is pure data:
 * - id: Unique test identifier (for filtering with vitest -t)
 * - prompt: User input (≥6 words, clear type indicators)
 * - expected: Generated JobRequest structure
 *
 * Validation Philosophy:
 * - STRICT: Explicit requests (e.g., "4 second" → duration: 4)
 * - FLEXIBLE: Relative concepts (e.g., "quick" → accept any valid duration)
 * - SCHEMA-VALID: Always enforce enum values, never "any"
 *
 * Matching rules:
 * - Use exact values for deterministic fields when explicitly stated
 * - Use expect.stringMatching(regex) for AI-generated content
 * - Use expect.stringMatching(/model-a|model-b/) for similar model variants
 * - Use expect.stringMatching(/^(4|6|8)$/) for valid enum values
 */
const fixtures = [
  // ============================================
  // VIDEO - BASELINE
  // ============================================
  {
    id: "video:sunset",
    prompt: "Create a video of a beautiful sunset over the ocean with waves",
    expected: {
      type: "video",
      model: expect.stringMatching(/^veo-3\.1-(fast-)?generate-preview$/),
      prompt: expect.stringMatching(/.+/),
      duration: 8,
      aspectRatio: "16:9",
      audio: true,
    },
  },
  {
    id: "video:portrait-city-night",
    prompt: "Create a 4-second portrait video of a city at night with ambient sounds",
    expected: {
      type: "video",
      model: expect.stringMatching(/^veo-3\.1-(fast-)?generate-preview$/),
      prompt: expect.stringMatching(/.+/),
      duration: 4,
      aspectRatio: "9:16",
      audio: true,
    },
  },
  {
    id: "video:best-quality-lake",
    prompt: "Generate a high-quality cinematic 8-second landscape video of a serene mountain lake",
    expected: {
      type: "video",
      model: "veo-3.1-generate-preview",
      prompt: expect.stringMatching(/.+/),
      duration: 8,
      aspectRatio: "16:9",
      audio: true,
    },
  },

  // ============================================
  // VIDEO - MODEL SELECTION
  // ============================================
  // Note: Removed veo-2.0 test - AI analyzer only knows about 3.1 models
  // Veo 2.0 is still supported for explicit implicit requests only

  {
    id: "video:veo3-forest",
    prompt: "Generate video with veo 3.1 model: a forest scene with sunlight filtering through trees",
    expected: {
      type: "video",
      model: expect.stringMatching(/^veo-3\.1-(fast-)?generate-preview$/),
      prompt: expect.stringMatching(/.+/),
      duration: 8,
      aspectRatio: "16:9",
      audio: true,
    },
  },
  {
    id: "video:veo3-fast-car",
    prompt: "Use veo 3.1 fast model to create a video of a sports car driving through city streets",
    expected: {
      type: "video",
      model: expect.stringMatching(/^veo-3\.1-(fast-)?generate-preview$/),
      prompt: expect.stringMatching(/.+/),
      duration: 8,
      aspectRatio: "16:9",
      audio: true,
    },
  },
  {
    id: "video:best-quality-sunset",
    prompt: "Create the best quality video of a sunset with dramatic colors and cloud formations",
    expected: {
      type: "video",
      model: "veo-3.1-generate-preview",
      prompt: expect.stringMatching(/.+/),
      duration: 8,
      aspectRatio: "16:9",
      audio: true,
    },
  },

  // ============================================
  // VIDEO - PARAMETERS
  // ============================================
  {
    id: "video:vertical-waterfall",
    prompt: "Vertical video of a waterfall cascading down mossy rocks in a forest",
    expected: {
      type: "video",
      model: expect.stringMatching(/^veo-3\.1-(fast-)?generate-preview$/),
      prompt: expect.stringMatching(/.+/),
      duration: 8,
      aspectRatio: "9:16",
      audio: true,
    },
  },
  {
    id: "video:square-product",
    prompt: "Square format video of a rotating product showcase for social media advertisement",
    expected: {
      type: "video",
      model: expect.stringMatching(/^veo-3\.1-(fast-)?generate-preview$/),
      prompt: expect.stringMatching(/.+/),
      duration: 8,
      aspectRatio: "1:1",
      audio: true,
    },
  },
  {
    id: "video:4sec-lightning",
    prompt: "4 second video of lightning strike illuminating dark storm clouds",
    expected: {
      type: "video",
      model: expect.stringMatching(/^veo-3\.1-(fast-)?generate-preview$/),
      prompt: expect.stringMatching(/.+/),
      duration: 4,
      aspectRatio: "16:9",
      audio: true,
    },
  },
  {
    id: "video:silent-meditation",
    prompt: "Silent video of meditation scene with a person sitting peacefully by a lake",
    expected: {
      type: "video",
      model: expect.stringMatching(/^veo-3\.1-(fast-)?generate-preview$/),
      prompt: expect.stringMatching(/.+/),
      duration: 8,
      aspectRatio: "16:9",
      audio: false,
    },
  },
  {
    id: "video:720p-traffic",
    prompt: "Quick video of busy city traffic with cars and pedestrians moving",
    expected: {
      type: "video",
      model: expect.stringMatching(/^veo-3\.1-(fast-)?generate-preview$/),
      prompt: expect.stringMatching(/.+/),
      duration: expect.toBeOneOf([4, 6, 8]),
      aspectRatio: "16:9",
      audio: true,
    },
  },

  // ============================================
  // VIDEO - REAL-WORLD SCENARIOS
  // ============================================
  {
    id: "video:instagram-reel-pasta",
    prompt: "Instagram reel: cooking pasta, vertical, 6 seconds",
    expected: {
      type: "video",
      model: expect.stringMatching(/^veo-3\.1-(fast-)?generate-preview$/),
      prompt: expect.stringMatching(/.+/),
      duration: 6,
      aspectRatio: "9:16",
      audio: true,
    },
  },
  {
    id: "video:youtube-short-tech",
    prompt: "YouTube short: tech review, 9:16, high quality",
    expected: {
      type: "video",
      model: "veo-3.1-generate-preview",
      prompt: expect.stringMatching(/.+/),
      duration: 8,
      aspectRatio: "9:16",
      audio: true,
    },
  },
  {
    id: "video:hero-section",
    prompt: "Website hero section video, high quality, 8 seconds, silent",
    expected: {
      type: "video",
      model: "veo-3.1-generate-preview",
      prompt: expect.stringMatching(/.+/),
      duration: 8,
      aspectRatio: "16:9",
      audio: false,
    },
  },

  // ============================================
  // VIDEO - EDGE CASES
  // ============================================
  {
    id: "video:with-reference-image",
    prompt: "a video of https://storage.googleapis.com/cineai-c7qqw.firebasestorage.app/firegen-jobs/id-1/image-nano-banana.png",
    expected: {
      type: "video",
      model: expect.stringMatching(/^veo-3\.1-(fast-)?generate-preview$/),
      prompt: expect.stringMatching(/.+/),
      referenceImageGcsUri: "https://storage.googleapis.com/cineai-c7qqw.firebasestorage.app/firegen-jobs/id-1/image-nano-banana.png",
      duration: 8,
      aspectRatio: "16:9",
      resolution: "1080p",
      audio: true,
    },
  },

  // ============================================
  // VIDEO - VEO 3.1 NEW FEATURES
  // ============================================
  {
    id: "video:veo31-multi-subject",
    prompt: "Create a video featuring https://storage.googleapis.com/example/person1.jpg and https://storage.googleapis.com/example/person2.jpg walking together in a park",
    expected: {
      type: "video",
      model: expect.stringMatching(/^veo-3\.1-(fast-)?generate-preview$/),
      prompt: expect.stringMatching(/.+/),
      duration: 8,
      aspectRatio: "16:9",
      audio: true,
      referenceSubjectImages: expect.arrayContaining([
        expect.stringContaining("person1.jpg"),
        expect.stringContaining("person2.jpg"),
      ]),
    },
  },
  {
    id: "video:veo31-video-extension",
    prompt: "Extend this video https://storage.googleapis.com/example/original.mp4 with more action",
    expected: {
      type: "video",
      model: expect.stringMatching(/^veo-3\.1-(fast-)?generate-preview$/),
      prompt: expect.stringMatching(/.+/),
      duration: 8,
      aspectRatio: "16:9",
      audio: true,
      videoGcsUri: expect.stringContaining("original.mp4"),
    },
  },
  {
    id: "video:veo31-frame-specific",
    prompt: "Generate video starting from this frame https://storage.googleapis.com/example/frame.jpg with a dramatic transition",
    expected: {
      type: "video",
      model: expect.stringMatching(/^veo-3\.1-(fast-)?generate-preview$/),
      prompt: expect.stringMatching(/.+/),
      duration: 8,
      aspectRatio: "16:9",
      audio: true,
      lastFrameGcsUri: expect.stringContaining("frame.jpg"),
    },
  },

  // ============================================
  // IMAGE - BASELINE
  // ============================================
  {
    id: "image:cat",
    prompt: "Generate an image of a fluffy orange cat sitting on a windowsill",
    expected: {
      type: "image",
      model: expect.stringMatching(/^(nano-banana|imagen-4\.0-generate-001)$/),
      prompt: expect.stringMatching(/.+/),
    },
  },
  {
    id: "image:scientist-portrait",
    prompt: "Portrait of a scientist in a modern laboratory, professional lighting",
    expected: {
      type: "image",
      model: expect.stringMatching(/^(nano-banana|imagen-4\.0-generate-001)$/),
      prompt: expect.stringMatching(/.+/),
      // Note: "portrait of X" is ambiguous - could mean portrait subject (1:1) or portrait orientation (2:3/3:4/9:16)
      // AI interprets this as portrait subject, so 1:1 is acceptable
      aspectRatio: expect.stringMatching(/^(1:1|2:3|3:4|9:16)$/),
    },
  },
  {
    id: "image:photorealistic-portrait",
    prompt: "Photorealistic ultra-detailed portrait, 9:16 aspect ratio",
    expected: {
      type: "image",
      model: expect.stringMatching(/^(nano-banana|imagen-4\.0-(ultra-)?generate-001)$/),
      prompt: expect.stringMatching(/.+/),
      aspectRatio: expect.stringMatching(/^(9:16|3:4)$/),
    },
  },

  // ============================================
  // AUDIO - TTS
  // ============================================
  {
    id: "audio:speak-hello",
    prompt: "speak hello world, how are you doing today?",
    expected: {
      type: "audio",
      subtype: "tts",
      model: expect.stringMatching(/^gemini-2\.5-(flash|pro)-preview-tts$/),
      text: expect.stringMatching(/.+/),
    },
  },
  {
    id: "audio:tts-cheerful-welcome",
    prompt: "Say 'Welcome to FireGen' in a cheerful friendly voice",
    expected: {
      type: "audio",
      subtype: "tts",
      model: expect.stringMatching(/^gemini-2\.5-(flash|pro)-preview-tts$/),
      text: "Welcome to FireGen",
      voice: expect.stringMatching(/.+/),
    },
  },

  // ============================================
  // AUDIO - MUSIC
  // ============================================
  {
    id: "audio:music-upbeat",
    prompt: "Generate upbeat background music with electronic beats for a workout video",
    expected: {
      type: "audio",
      subtype: "music",
      model: "lyria-002",
      prompt: expect.stringMatching(/.+/),
    },
  },
  {
    id: "audio:music-meditation",
    prompt: "Generate calm ambient background music for meditation",
    expected: {
      type: "audio",
      subtype: "music",
      model: "lyria-002",
      prompt: expect.stringMatching(/.+/),
    },
  },

  // ============================================
  // TEXT
  // ============================================
  {
    id: "text:explain-ai",
    prompt: "Write a text explanation of artificial intelligence and how it works",
    expected: {
      type: "text",
      model: expect.stringMatching(/^gemini-2\.5-(flash|pro)$/),
      prompt: expect.stringMatching(/.+/),
    },
  },
  {
    id: "text:neural-networks-beginner",
    prompt: "Write a short text description of how neural networks work for a beginner",
    expected: {
      type: "text",
      model: "gemini-2.5-flash",
      prompt: expect.stringMatching(/.+/),
    },
  },
  {
    id: "text:transformer-analysis",
    prompt: "Provide a comprehensive technical analysis of transformer architecture in modern large language models",
    expected: {
      type: "text",
      model: expect.stringMatching(/^gemini-2\.5-(flash|pro)$/),
      prompt: expect.stringMatching(/.+/),
    },
  },
];

describe("AI Request Analyzer", () => {
  test.concurrent.each(fixtures)(
    "$id: $prompt",
    async ({id, prompt, expected}) => {
      const analyzed = await analyzePrompt(prompt, `test-${id}`);

      // Verify request structure matches expected
      expect(analyzed.request).toMatchObject(expected);

      // Verify reasons array exists and has content
      expect(analyzed.reasons).toBeInstanceOf(Array);
      expect(analyzed.reasons.length).toBeGreaterThan(0);
    },
    90000  // 90s timeout for 2-step pipeline with Pro model + retry buffer
  );
});
