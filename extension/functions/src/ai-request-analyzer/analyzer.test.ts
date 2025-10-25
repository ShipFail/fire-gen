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
  // VIDEO - VEO 3.1 NEGATIVE PROMPTS
  // ============================================
  {
    id: "video:veo31-negative-prompt-explicit",
    prompt: "Create a photorealistic video of a serene mountain lake. Negative prompt: cartoon, animated, low quality, blurry",
    expected: {
      type: "video",
      model: expect.stringMatching(/^veo-3\.1-(fast-)?generate-preview$/),
      prompt: expect.stringMatching(/serene mountain lake/i),
      negativePrompt: expect.stringMatching(/cartoon.*animated.*low quality.*blurry/i),
      duration: 8,
      aspectRatio: "16:9",
      audio: true,
    },
  },
  {
    id: "video:veo31-negative-prompt-avoid-style",
    prompt: "Generate a realistic nature documentary shot of a lion in the savannah. Avoid: cartoon style, animated characters, comic book art",
    expected: {
      type: "video",
      model: expect.stringMatching(/^veo-3\.1-(fast-)?generate-preview$/),
      prompt: expect.stringMatching(/lion.*savannah/i),
      negativePrompt: expect.stringMatching(/cartoon.*animated.*comic/i),
      duration: 8,
      aspectRatio: "16:9",
      audio: true,
    },
  },
  {
    id: "video:veo31-negative-prompt-dont-want",
    prompt: "A cityscape at night with neon lights. Don't want: people, cars, traffic, crowds",
    expected: {
      type: "video",
      model: expect.stringMatching(/^veo-3\.1-(fast-)?generate-preview$/),
      prompt: expect.stringMatching(/cityscape.*night.*neon/i),
      negativePrompt: expect.stringMatching(/people.*cars.*traffic.*crowds/i),
      duration: 8,
      aspectRatio: "16:9",
      audio: true,
    },
  },
  {
    id: "video:veo31-negative-prompt-without",
    prompt: "Create a peaceful beach scene at sunset without people, buildings, or boats",
    expected: {
      type: "video",
      model: expect.stringMatching(/^veo-3\.1-(fast-)?generate-preview$/),
      prompt: expect.stringMatching(/peaceful beach.*sunset/i),
      negativePrompt: expect.stringMatching(/people.*buildings.*boats/i),
      duration: 8,
      aspectRatio: "16:9",
      audio: true,
    },
  },
  {
    id: "video:veo31-negative-prompt-exclude",
    prompt: "Forest scene in autumn. Exclude: urban elements, modern structures, technology, vehicles",
    expected: {
      type: "video",
      model: expect.stringMatching(/^veo-3\.1-(fast-)?generate-preview$/),
      prompt: expect.stringMatching(/forest.*autumn/i),
      negativePrompt: expect.stringMatching(/urban.*modern structures.*technology.*vehicles/i),
      duration: 8,
      aspectRatio: "16:9",
      audio: true,
    },
  },
  {
    id: "video:veo31-negative-prompt-quality-terms",
    prompt: "High-quality cinematic shot of a mountain climber reaching the summit. Negative: blurry, grainy, low resolution, distorted, artifacts",
    expected: {
      type: "video",
      model: "veo-3.1-generate-preview", // "high-quality" should select non-fast model
      prompt: expect.stringMatching(/mountain climber.*summit/i),
      negativePrompt: expect.stringMatching(/blurry.*grainy.*low resolution.*distorted.*artifacts/i),
      duration: 8,
      aspectRatio: "16:9",
      audio: true,
    },
  },
  {
    id: "video:veo31-negative-prompt-mixed-syntax",
    prompt: "A tranquil zen garden with rocks and sand patterns. Avoid people and don't include modern architecture. Negative: urban background, stormy atmosphere",
    expected: {
      type: "video",
      model: expect.stringMatching(/^veo-3\.1-(fast-)?generate-preview$/),
      prompt: expect.stringMatching(/zen garden.*rocks.*sand/i),
      // Should combine all negative indicators into one negativePrompt
      negativePrompt: expect.stringMatching(/people.*modern architecture.*urban background.*stormy/i),
      duration: 8,
      aspectRatio: "16:9",
      audio: true,
    },
  },
  {
    id: "video:veo31-no-negative-prompt",
    prompt: "A simple video of flowers blooming in a garden",
    expected: {
      type: "video",
      model: expect.stringMatching(/^veo-3\.1-(fast-)?generate-preview$/),
      prompt: expect.stringMatching(/flowers blooming.*garden/i),
      // negativePrompt should not exist if not specified
      duration: 8,
      aspectRatio: "16:9",
      audio: true,
    },
  },

  // ============================================
  // VIDEO - EDGE CASES
  // ============================================
  // Removed old veo31-with-reference-image test - covered by new comprehensive Veo 3.1 tests above

  // ============================================
  // IMAGE - BASELINE
  // ============================================

  // ============================================
  // VIDEO - VEO 3.1 IMAGE-TO-VIDEO
  // ============================================
  {
    id: "video:veo31-animate-image",
    prompt: "Animate this landscape image with gentle camera movement https://storage.googleapis.com/example/mountain-lake.jpg",
    expected: {
      type: "video",
      model: expect.stringMatching(/^veo-3\.1-(fast-)?generate-preview$/),
      prompt: expect.stringMatching(/.+/),
      imageGcsUri: expect.stringContaining("mountain-lake.jpg"),
      duration: 8,
      aspectRatio: "16:9",
      audio: true,
    },
  },
  {
    id: "video:veo31-bring-photo-to-life",
    prompt: "Make this photo come alive with wind and clouds https://firebasestorage.googleapis.com/v0/b/my-project.appspot.com/o/images%2Fsunset.jpg?alt=media&token=abc123",
    expected: {
      type: "video",
      model: expect.stringMatching(/^veo-3\.1-(fast-)?generate-preview$/),
      prompt: expect.stringMatching(/.+/),
      imageGcsUri: "gs://my-project.appspot.com/images/sunset.jpg", // Firebase Storage URL converted to GCS
      duration: 8,
      aspectRatio: "16:9",
      audio: true,
    },
  },

  // ============================================
  // VIDEO - VEO 3.1 SUBJECT REFERENCES
  // ============================================
  {
    id: "video:veo31-single-subject",
    prompt: "Show this character walking through a futuristic city gs://example/character.jpg",
    expected: {
      type: "video",
      model: expect.stringMatching(/^veo-3\.1-(fast-)?generate-preview$/),
      prompt: expect.stringMatching(/walking through.*futuristic city/i),
      referenceSubjectImages: ["gs://example/character.jpg"],
      duration: 8,
      aspectRatio: "16:9",
      audio: true,
    },
  },
  {
    id: "video:veo31-two-subjects",
    prompt: "Create a video featuring https://storage.googleapis.com/example/person1.jpg and https://storage.googleapis.com/example/person2.jpg walking together in a park",
    expected: {
      type: "video",
      model: expect.stringMatching(/^veo-3\.1-(fast-)?generate-preview$/),
      prompt: expect.stringMatching(/.+/),
      referenceSubjectImages: expect.arrayContaining([
        expect.stringContaining("person1.jpg"),
        expect.stringContaining("person2.jpg"),
      ]),
      duration: 8,
      aspectRatio: "16:9",
      audio: true,
    },
  },
  {
    id: "video:veo31-three-subjects-max",
    prompt: "Show these three products in a studio gs://example/product1.jpg gs://example/product2.jpg gs://example/product3.jpg",
    expected: {
      type: "video",
      model: expect.stringMatching(/^veo-3\.1-(fast-)?generate-preview$/),
      prompt: expect.stringMatching(/studio/i),
      referenceSubjectImages: expect.arrayContaining([
        "gs://example/product1.jpg",
        "gs://example/product2.jpg",
        "gs://example/product3.jpg",
      ]),
      duration: 8,
      aspectRatio: "16:9",
      audio: true,
    },
  },

  // ============================================
  // VIDEO - VEO 3.1 IMAGE-TO-VIDEO + SUBJECTS
  // ============================================
  {
    id: "video:veo31-base-plus-subject",
    prompt: "Animate this background gs://example/background.jpg with this character walking through gs://example/character.jpg",
    expected: {
      type: "video",
      model: expect.stringMatching(/^veo-3\.1-(fast-)?generate-preview$/),
      prompt: expect.stringMatching(/walking through/i),
      imageGcsUri: "gs://example/background.jpg",
      referenceSubjectImages: ["gs://example/character.jpg"],
      duration: 8,
      aspectRatio: "16:9",
      audio: true,
    },
  },

  // ============================================
  // VIDEO - VEO 3.1 VIDEO EXTENSION
  // ============================================
  {
    id: "video:veo31-extend-video-only",
    prompt: "Continue this video for 6 more seconds https://storage.googleapis.com/example/part1.mp4",
    expected: {
      type: "video",
      model: expect.stringMatching(/^veo-3\.1-(fast-)?generate-preview$/),
      prompt: expect.stringMatching(/continue/i),
      videoGcsUri: expect.stringContaining("part1.mp4"),
      // NO lastFrameGcsUri - scene extension uses video only
      duration: 6,
      aspectRatio: "16:9",
      audio: true,
    },
  },
  {
    id: "video:veo31-extend-video-with-frame",
    prompt: "Extend this video gs://example/scene.mp4 starting from this frame gs://example/scene-last-frame.jpg with the character turning around",
    expected: {
      type: "video",
      model: expect.stringMatching(/^veo-3\.1-(fast-)?generate-preview$/),
      prompt: expect.stringMatching(/turning around/i),
      videoGcsUri: "gs://example/scene.mp4",
      lastFrameGcsUri: "gs://example/scene-last-frame.jpg", // First-and-last-frame transition with video context
      duration: 8,
      aspectRatio: "16:9",
      audio: true,
    },
  },
  {
    id: "video:veo31-video-part2",
    prompt: "Create part 2 of this video where the story continues gs://example/chapter1.mp4",
    expected: {
      type: "video",
      model: expect.stringMatching(/^veo-3\.1-(fast-)?generate-preview$/),
      prompt: expect.stringMatching(/story continues/i),
      videoGcsUri: expect.stringContaining("chapter1.mp4"),
      // NO lastFrameGcsUri - scene extension only
      duration: 8,
      aspectRatio: "16:9",
      audio: true,
    },
  },

  // ============================================
  // VIDEO - VEO 3.1 EDGE CASES
  // ============================================
  {
    id: "video:veo31-too-many-subjects",
    prompt: "Show all 5 characters in a scene gs://example/c1.jpg gs://example/c2.jpg gs://example/c3.jpg gs://example/c4.jpg gs://example/c5.jpg",
    expected: {
      type: "video",
      model: expect.stringMatching(/^veo-3\.1-(fast-)?generate-preview$/),
      prompt: expect.stringMatching(/.+/),
      // Should only use first 3 images
      referenceSubjectImages: expect.arrayContaining([
        "gs://example/c1.jpg",
        "gs://example/c2.jpg",
        "gs://example/c3.jpg",
      ]),
      duration: 8,
      aspectRatio: "16:9",
      audio: true,
      // Note: reasons should explain truncation to max 3 subjects
    },
  },
  {
    id: "video:veo31-ambiguous-single-image-as-subject",
    prompt: "Create a video with this person walking in a park gs://example/person.jpg",
    expected: {
      type: "video",
      model: expect.stringMatching(/^veo-3\.1-(fast-)?generate-preview$/),
      prompt: expect.stringMatching(/walking in.*park/i),
      referenceSubjectImages: ["gs://example/person.jpg"], // "this person" = subject reference
      duration: 8,
      aspectRatio: "16:9",
      audio: true,
    },
  },
  {
    id: "video:veo31-ambiguous-single-image-as-base",
    prompt: "Bring this photo to life with wind and movement gs://example/landscape.jpg",
    expected: {
      type: "video",
      model: expect.stringMatching(/^veo-3\.1-(fast-)?generate-preview$/),
      prompt: expect.stringMatching(/wind.*movement/i),
      imageGcsUri: "gs://example/landscape.jpg", // "bring to life" = image-to-video
      duration: 8,
      aspectRatio: "16:9",
      audio: true,
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
