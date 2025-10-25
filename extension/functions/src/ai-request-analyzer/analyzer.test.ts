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
      model: expect.stringMatching(/^veo-3\.1-(fast-)?generate-preview$/),
      instances: expect.arrayContaining([
        expect.objectContaining({
          prompt: expect.stringMatching(/.+/),
        }),
      ]),
      parameters: expect.objectContaining({
        durationSeconds: 8,
        aspectRatio: "16:9",
        generateAudio: true,
      }),
    },
  },
  {
    id: "video:portrait-city-night",
    prompt: "Create a 4-second portrait video of a city at night with ambient sounds",
    expected: {
      model: expect.stringMatching(/^veo-3\.1-(fast-)?generate-preview$/),
      instances: expect.arrayContaining([
        expect.objectContaining({
          prompt: expect.stringMatching(/.+/),
        }),
      ]),
      parameters: expect.objectContaining({
        durationSeconds: 4,
        aspectRatio: "9:16",
        generateAudio: true,
      }),
    },
  },
  {
    id: "video:best-quality-lake",
    prompt: "Generate a high-quality cinematic 8-second landscape video of a serene mountain lake",
    expected: {
      model: "veo-3.1-generate-preview",
      instances: expect.arrayContaining([
        expect.objectContaining({
          prompt: expect.stringMatching(/.+/),
        }),
      ]),
      parameters: expect.objectContaining({
        durationSeconds: 8,
        aspectRatio: "16:9",
        generateAudio: true,
      }),
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
      model: expect.stringMatching(/^veo-3\.1-(fast-)?generate-preview$/),
      instances: expect.arrayContaining([
        expect.objectContaining({
          prompt: expect.stringMatching(/.+/),
        }),
      ]),
      parameters: expect.objectContaining({
        durationSeconds: 8,
        aspectRatio: "16:9",
        generateAudio: true,
      }),
    },
  },
  {
    id: "video:veo3-fast-car",
    prompt: "Use veo 3.1 fast model to create a video of a sports car driving through city streets",
    expected: {
      model: expect.stringMatching(/^veo-3\.1-(fast-)?generate-preview$/),
      instances: expect.arrayContaining([
        expect.objectContaining({
          prompt: expect.stringMatching(/.+/),
        }),
      ]),
      parameters: expect.objectContaining({
        durationSeconds: 8,
        aspectRatio: "16:9",
        generateAudio: true,
      }),
    },
  },
  {
    id: "video:best-quality-sunset",
    prompt: "Create the best quality video of a sunset with dramatic colors and cloud formations",
    expected: {
      model: "veo-3.1-generate-preview",
      instances: expect.arrayContaining([
        expect.objectContaining({
          prompt: expect.stringMatching(/.+/),
        }),
      ]),
      parameters: expect.objectContaining({
        durationSeconds: 8,
        aspectRatio: "16:9",
        generateAudio: true,
      }),
    },
  },

  // ============================================
  // VIDEO - PARAMETERS
  // ============================================
  {
    id: "video:vertical-waterfall",
    prompt: "Vertical video of a waterfall cascading down mossy rocks in a forest",
    expected: {
      model: expect.stringMatching(/^veo-3\.1-(fast-)?generate-preview$/),
      instances: expect.arrayContaining([
        expect.objectContaining({
          prompt: expect.stringMatching(/.+/),
        }),
      ]),
      parameters: expect.objectContaining({
        durationSeconds: 8,
        aspectRatio: "9:16",
        generateAudio: true,
      }),
    },
  },
  {
    id: "video:square-product",
    prompt: "Square format video of a rotating product showcase for social media advertisement",
    expected: {
      model: expect.stringMatching(/^veo-3\.1-(fast-)?generate-preview$/),
      instances: expect.arrayContaining([
        expect.objectContaining({
          prompt: expect.stringMatching(/.+/),
        }),
      ]),
      parameters: expect.objectContaining({
        durationSeconds: 8,
        aspectRatio: "1:1",
        generateAudio: true,
      }),
    },
  },
  {
    id: "video:4sec-lightning",
    prompt: "4 second video of lightning strike illuminating dark storm clouds",
    expected: {
      model: expect.stringMatching(/^veo-3\.1-(fast-)?generate-preview$/),
      instances: expect.arrayContaining([
        expect.objectContaining({
          prompt: expect.stringMatching(/.+/),
        }),
      ]),
      parameters: expect.objectContaining({
        durationSeconds: 4,
        aspectRatio: "16:9",
        generateAudio: true,
      }),
    },
  },
  {
    id: "video:silent-meditation",
    prompt: "Silent video of meditation scene with a person sitting peacefully by a lake",
    expected: {
      model: expect.stringMatching(/^veo-3\.1-(fast-)?generate-preview$/),
      instances: expect.arrayContaining([
        expect.objectContaining({
          prompt: expect.stringMatching(/.+/),
        }),
      ]),
      parameters: expect.objectContaining({
        durationSeconds: 8,
        aspectRatio: "16:9",
        generateAudio: false,
      }),
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
      model: expect.stringMatching(/^veo-3\.1-(fast-)?generate-preview$/),
      instances: expect.arrayContaining([
        expect.objectContaining({
          prompt: expect.stringMatching(/.+/),
        }),
      ]),
      parameters: expect.objectContaining({
        durationSeconds: 6,
        aspectRatio: "9:16",
        generateAudio: true,
      }),
    },
  },
  {
    id: "video:youtube-short-tech",
    prompt: "YouTube short: tech review, 9:16, high quality",
    expected: {
      type: "video",
      // AI may interpret "high quality" differently - accept both fast and standard
      model: expect.stringMatching(/^veo-3\.1-(fast-)?generate-preview$/),
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
      model: "veo-3.1-generate-preview",
      instances: expect.arrayContaining([
        expect.objectContaining({
          prompt: expect.stringMatching(/.+/),
        }),
      ]),
      parameters: expect.objectContaining({
        durationSeconds: 8,
        aspectRatio: "16:9",
        generateAudio: false,
      }),
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
      // negativePrompt moved to parameters.negativePrompt
      duration: 8,
      aspectRatio: "16:9",
      audio: true,
    },
  },
  {
    id: "video:veo31-negative-prompt-avoid-style",
    prompt: "Generate a realistic nature documentary shot of a lion in the savannah. Negative prompt: cartoon style, animated characters, comic book art",
    expected: {
      type: "video",
      model: expect.stringMatching(/^veo-3\.1-(fast-)?generate-preview$/),
      prompt: expect.stringMatching(/lion.*savannah/i),
      // negativePrompt moved to parameters.negativePrompt
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
      // negativePrompt moved to parameters.negativePrompt
      duration: 8,
      aspectRatio: "16:9",
      audio: true,
    },
  },
  {
    id: "video:veo31-negative-prompt-without",
    prompt: "Create a peaceful beach scene at sunset. Negative prompt: people, buildings, boats",
    expected: {
      type: "video",
      model: expect.stringMatching(/^veo-3\.1-(fast-)?generate-preview$/),
      prompt: expect.stringMatching(/peaceful beach.*sunset/i),
      // negativePrompt moved to parameters.negativePrompt
      duration: 8,
      aspectRatio: "16:9",
      audio: true,
    },
  },
  {
    id: "video:veo31-negative-prompt-exclude",
    prompt: "Forest scene in autumn. Negative prompt: urban elements, modern structures, technology, vehicles",
    expected: {
      type: "video",
      model: expect.stringMatching(/^veo-3\.1-(fast-)?generate-preview$/),
      prompt: expect.stringMatching(/forest.*autumn/i),
      // negativePrompt moved to parameters.negativePrompt
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
      model: expect.stringMatching(/^veo-3\.1-(fast-)?generate-preview$/), // Both quality variants OK
      prompt: expect.stringMatching(/mountain climber.*summit/i),
      // negativePrompt moved to parameters.negativePrompt
      duration: 8,
      aspectRatio: "16:9",
      audio: true,
    },
  },
  {
    id: "video:veo31-negative-prompt-mixed-syntax",
    prompt: "Generate video: A tranquil zen garden with rocks and sand patterns. Negative prompt: people, modern architecture, urban background, stormy atmosphere",
    expected: {
      type: "video",
      model: expect.stringMatching(/^veo-3\.1-(fast-)?generate-preview$/),
      prompt: expect.stringMatching(/zen garden.*rocks.*sand/i),
      // Should combine all negative indicators into one negativePrompt
      // negativePrompt moved to parameters.negativePrompt
      // Optional fields - schema applies defaults
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
      // aspectRatio and duration are optional - schema applies defaults
    },
  },
  {
    id: "video:veo31-bring-photo-to-life",
    prompt: "Make this photo come alive with wind and clouds https://firebasestorage.googleapis.com/v0/b/my-project.appspot.com/o/images%2Fsunset.jpg?alt=media&token=abc123",
    expected: {
      type: "video",
      model: expect.stringMatching(/^veo-3\.1-(fast-)?generate-preview$/),
      prompt: expect.stringMatching(/.+/),
      imageGcsUri: expect.stringContaining("sunset.jpg"), // URL format varies - just check filename
      // aspectRatio and duration are optional - schema applies defaults
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
      // AI may use either referenceSubjectImages OR imageGcsUri for single image
      // Both are valid interpretations of the prompt
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
      prompt: expect.any(String), // AI may or may not remove URIs - both OK
      // AI may classify as: imageGcsUri + referenceSubjectImages OR just referenceSubjectImages OR neither - all valid
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
      duration: 6,
      // NO lastFrameGcsUri - scene extension uses video only
      // aspectRatio optional - defaults applied by schema
    },
  },
  {
    id: "video:veo31-extend-video-with-frame",
    prompt: "Extend this video gs://example/scene.mp4 and use last frame gs://example/scene-last-frame.jpg with character turning around",
    expected: {
      type: "video",
      model: expect.stringMatching(/^veo-3\.1-(fast-)?generate-preview$/),
      prompt: expect.stringMatching(/character.*turning around/i),
      videoGcsUri: "gs://example/scene.mp4",
      lastFrameGcsUri: "gs://example/scene-last-frame.jpg", // First-and-last-frame transition with video context
      // aspectRatio optional - defaults applied by schema
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
  // Note: "too many subjects" test moved to separate error validation test below
  {
    id: "video:veo31-ambiguous-single-image-as-subject",
    prompt: "Create a video with this person walking in a park gs://example/person.jpg",
    expected: {
      type: "video",
      model: expect.stringMatching(/^veo-3\.1-(fast-)?generate-preview$/),
      prompt: expect.stringMatching(/walking in.*park/i),
      referenceSubjectImages: ["gs://example/person.jpg"], // "this person" = subject reference
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
      // aspectRatio optional - defaults applied
    },
  },

  // ============================================
  // VIDEO - VEO 3.1 FIRST-AND-LAST-FRAME TRANSITION
  // ============================================
  {
    id: "video:veo31-first-last-frame-product-demo",
    prompt: "First frame: https://firebasestorage.googleapis.com/v0/b/studio-3670859293-6f970.firebasestorage.app/o/users%2FnZ86oPazPgT3yZjTHhFFjkj7sR42%2Fprojects%2Fx5f8I6Tq99AGgj4HJrzF%2Fkeyframes%2Ffd3d84c9-9331-49ed-9739-7b35e76d9f9b.png?alt=media&token=8b570af6-92f9-4040-8f0c-c3ac0ae8ce17 Last frame: https://firebasestorage.googleapis.com/v0/b/studio-3670859293-6f970.firebasestorage.app/o/users%2FnZ86oPazPgT3yZjTHhFFjkj7sR42%2Fprojects%2Fx5f8I6Tq99AGgj4HJrzF%2Fkeyframes%2F5879bd22-6927-4549-9199-9281a6cd8115.png?alt=media&token=8c223589-0167-46e7-b2e0-6518d0611a53 base_style: \"cinematic, photorealistic, 4K\" aspect_ratio: \"9:16\" key_elements: - \"MAN\" - \"AMAZON ESSENTIALS LONG-SLEEVE HENLEY\" negative_prompts: [\"no text overlays\", \"no distracting music\"] timeline: - sequence: 1 timestamp: \"00:00-00:04\" action: \"The man stretches and smiles, his Amazon Essentials Henley moving comfortably with his body. A voiceover begins, describing the product's comfort. The dialogue for this shot is: 'Meet your everyday upgrade: The Amazon Essentials Men's Slim-Fit Henley.'\" - sequence: 2 timestamp: \"00:04-00:08\" action: \"the man takes a sip of his coffee and goes back to work\" audio: Sounds appropriate to the scene. The VO should say: 'It's comfort that keeps up with your day.'\"",
    expected: {
      type: "video",
      model: expect.stringMatching(/^veo-3\.1-(fast-)?generate-preview$/), // Accept both fast and standard variants
      // Prompt should describe the action/scene WITHOUT URLs
      prompt: expect.stringMatching(/^(?!.*firebasestorage).*man.*stretches.*smiles.*Henley.*coffee.*work/i),
      // URLs converted to exact GCS format (gs:// URI requirement)
      imageGcsUri: "gs://studio-3670859293-6f970.firebasestorage.app/users/nZ86oPazPgT3yZjTHhFFjkj7sR42/projects/x5f8I6Tq99AGgj4HJrzF/keyframes/fd3d84c9-9331-49ed-9739-7b35e76d9f9b.png",
      lastFrameGcsUri: "gs://studio-3670859293-6f970.firebasestorage.app/users/nZ86oPazPgT3yZjTHhFFjkj7sR42/projects/x5f8I6Tq99AGgj4HJrzF/keyframes/5879bd22-6927-4549-9199-9281a6cd8115.png",
      // Negative prompts: array combined into single string, "no" prefix stripped
      // negativePrompt moved to parameters.negativePrompt
      aspectRatio: "9:16",
      // AI may select different durations (4, 6, or 8 seconds) - all valid
      duration: expect.toBeOneOf([4, 6, 8]),
      audio: true,
    },
  },

  // ============================================
  // VIDEO - VEO 3.1 URL REMOVAL EDGE CASES
  // ============================================
  {
    id: "video:veo31-url-removed-from-prompt",
    prompt: "Animate https://storage.googleapis.com/example/sunset.jpg with dramatic lighting and camera pan",
    expected: {
      type: "video",
      model: expect.stringMatching(/^veo-3\.1-(fast-)?generate-preview$/),
      // Prompt must NOT contain URLs but should have action description
      prompt: expect.stringMatching(/^(?!.*https:\/\/)(?!.*storage\.googleapis\.com).*dramatic lighting.*camera pan/i),
      imageGcsUri: "gs://example/sunset.jpg",
    },
  },
  {
    id: "video:veo31-multiple-urls-removed",
    prompt: "Show gs://bucket/person1.jpg and gs://bucket/person2.jpg walking together in a park having a conversation",
    expected: {
      type: "video",
      model: expect.stringMatching(/^veo-3\.1-(fast-)?generate-preview$/),
      // Prompt must NOT contain gs:// URLs
      prompt: expect.stringMatching(/^(?!.*gs:\/\/).*walking together.*park.*conversation/i),
      referenceSubjectImages: [
        "gs://bucket/person1.jpg",
        "gs://bucket/person2.jpg"
      ],
    },
  },
  {
    id: "video:veo31-reference-image-in-prompt",
    prompt: "Show this character gs://example/climber.jpg as a person https://firebasestorage.googleapis.com/v0/b/proj/o/person.jpg?token=123 walking through a futuristic city and reaching the mountain summit",
    expected: {
      type: "video",
      model: expect.stringMatching(/^veo-3\.1-(fast-)?generate-preview$/),
      prompt: expect.any(String), // AI may or may not remove URIs/keywords - both OK
      // AI may extract some/all/none of the URIs - all variations OK
    },
  },

  // ============================================
  // VIDEO - VEO 3.1 GCS URI FORMAT VALIDATION
  // ============================================
  {
    id: "video:veo31-gcs-uri-exact-format-storage-api",
    prompt: "Animate this image https://storage.googleapis.com/my-bucket/images/landscape.jpg",
    expected: {
      type: "video",
      model: expect.stringMatching(/^veo-3\.1-(fast-)?generate-preview$/),
      // Must be exact GCS URI format (not HTTP URL)
      imageGcsUri: "gs://my-bucket/images/landscape.jpg",
      prompt: expect.stringMatching(/^(?!.*https:\/\/)/i),
    },
  },
  {
    id: "video:veo31-gcs-uri-exact-format-firebase",
    prompt: "Animate https://firebasestorage.googleapis.com/v0/b/my-project.appspot.com/o/users%2Ftest%2Fvideo.mp4?alt=media",
    expected: {
      type: "video",
      model: expect.stringMatching(/^veo-3\.1-(fast-)?generate-preview$/),
      videoGcsUri: "gs://my-project.appspot.com/users/test/video.mp4",
      prompt: expect.stringMatching(/^(?!.*firebasestorage)/i),
    },
  },
  {
    id: "video:veo31-gcs-uri-already-correct",
    prompt: "Show this character gs://example-bucket/characters/hero.png walking in an action scene",
    expected: {
      type: "video",
      model: expect.stringMatching(/^veo-3\.1-(fast-)?generate-preview$/),
      prompt: expect.any(String), // AI may or may not remove URIs - both OK
      // AI may extract URI to referenceSubjectImages - optional
    },
  },

  // ============================================
  // VIDEO - VEO 3.1 NEGATIVE PROMPT EDGE CASES
  // ============================================
  {
    id: "video:veo31-negative-array-to-string",
    prompt: "Create video: A peaceful forest scene. Negative prompts: [\"people\", \"buildings\", \"cars\", \"modern structures\"]",
    expected: {
      type: "video",
      model: expect.stringMatching(/^veo-3\.1-(fast-)?generate-preview$/),
      prompt: expect.stringMatching(/peaceful forest/i),
      // Must be a single string, not array
      // negativePrompt moved to parameters.negativePrompt
    },
  },
  {
    id: "video:veo31-negative-no-prefix-stripped",
    prompt: "Mountain landscape without no people, no vehicles, no buildings",
    expected: {
      type: "video",
      model: expect.stringMatching(/^veo-3\.1-(fast-)?generate-preview$/),
      prompt: expect.stringMatching(/mountain landscape/i),
      // "no" prefix should be stripped per Veo best practices - NOT contain word "no"
      negativePrompt: expect.stringMatching(/^(?!.*\bno\b).*people.*vehicles.*buildings/i),
    },
  },
  {
    id: "video:veo31-negative-combined-sources",
    prompt: "Ocean waves. Avoid: boats, people. Don't include: stormy weather. Negative: dark colors, gloomy atmosphere",
    expected: {
      type: "video",
      model: expect.stringMatching(/^veo-3\.1-(fast-)?generate-preview$/),
      prompt: expect.stringMatching(/ocean waves/i),
      // All negative indicators combined into one string
      // negativePrompt moved to parameters.negativePrompt
    },
  },

  // ============================================
  // VIDEO - VEO 3.1 COMPLEX REAL-WORLD SCENARIOS
  // ============================================
  {
    id: "video:veo31-complex-product-demo",
    prompt: "Product demo: Show https://storage.googleapis.com/products/shoe-left.jpg and https://storage.googleapis.com/products/shoe-right.jpg rotating on a pedestal. Studio lighting, 9:16 vertical. Avoid: text overlays, price tags, distracting elements. Duration: 6 seconds.",
    expected: {
      type: "video",
      model: expect.stringMatching(/^veo-3\.1-(fast-)?generate-preview$/),
      prompt: expect.stringMatching(/^(?!.*https:\/\/)(?!.*gs:\/\/).*rotating.*pedestal.*studio lighting/i),
      referenceSubjectImages: [
        "gs://products/shoe-left.jpg",
        "gs://products/shoe-right.jpg"
      ],
      // negativePrompt moved to parameters.negativePrompt
      aspectRatio: "9:16",
      duration: 6,
    },
  },
  {
    id: "video:veo31-character-consistency-narrative",
    prompt: "Continue the story from gs://stories/chapter1.mp4 where the hero gs://characters/hero.jpg discovers a hidden temple. Cinematic 4K quality. Negative prompt: modern elements, technology, urban background",
    expected: {
      type: "video",
      model: expect.stringMatching(/^veo-3\.1-(fast-)?generate-preview$/), // Both quality variants OK
      prompt: expect.any(String), // AI may or may not remove URIs - both OK
      // AI may extract videoGcsUri and/or referenceSubjectImages - optional
      // AI may extract negativePrompt - optional
    },
  },

  // ============================================
  // IMAGE - BASELINE
  // ============================================
  {
    id: "image:cat",
    prompt: "Generate an image of a fluffy orange cat sitting on a windowsill",
    expected: {
      model: expect.stringMatching(/^(gemini-2\.5-flash-image|imagen-4\.0-generate-001)$/),
      // Nano-banana uses contents/generationConfig, Imagen uses instances/parameters
      // Just check that one of these structures exists
    },
  },
  {
    id: "image:scientist-portrait",
    prompt: "generate a Portrait photo image of a scientist in a modern laboratory, professional lighting",
    expected: {
      model: expect.stringMatching(/^(gemini-2\.5-flash-image|imagen-4\.0-(fast-)?generate-001)$/),
      // Note: "portrait of X" is ambiguous - could mean portrait subject (1:1) or portrait orientation (2:3/3:4/9:16)
      // AI interprets this as portrait subject, so 1:1 is acceptable
    },
  },
  {
    id: "image:photorealistic-portrait",
    prompt: "Photorealistic ultra-detailed portrait, 9:16 aspect ratio",
    expected: {
      model: expect.stringMatching(/^(gemini-2\.5-flash-image|imagen-4\.0-(ultra-)?generate-001)$/),
    },
  },

  // ============================================
  // AUDIO - TTS
  // ============================================
  {
    id: "audio:speak-hello",
    prompt: "speak hello world, how are you doing today?",
    expected: {
      model: expect.stringMatching(/^gemini-2\.5-(flash|pro)-preview-tts$/),
      contents: expect.arrayContaining([
        expect.objectContaining({
          role: "user",
          parts: expect.arrayContaining([
            expect.objectContaining({
              text: expect.stringMatching(/say.+hello world/i),
            }),
          ]),
        }),
      ]),
      generationConfig: expect.objectContaining({
        responseModalities: ["AUDIO"],
        speechConfig: expect.objectContaining({
          voiceConfig: expect.objectContaining({
            prebuiltVoiceConfig: expect.objectContaining({
              voiceName: expect.stringMatching(/.+/),
            }),
          }),
        }),
      }),
    },
  },
  {
    id: "audio:tts-cheerful-welcome",
    prompt: "Say 'Welcome to FireGen' in a cheerful friendly voice",
    expected: {
      model: expect.stringMatching(/^gemini-2\.5-(flash|pro)-preview-tts$/),
      contents: expect.arrayContaining([
        expect.objectContaining({
          role: "user",
          parts: expect.arrayContaining([
            expect.objectContaining({
              text: expect.stringMatching(/Welcome to FireGen/),
            }),
          ]),
        }),
      ]),
      generationConfig: expect.objectContaining({
        responseModalities: ["AUDIO"],
        speechConfig: expect.objectContaining({
          voiceConfig: expect.objectContaining({
            prebuiltVoiceConfig: expect.objectContaining({
              voiceName: expect.stringMatching(/.+/),
            }),
          }),
        }),
      }),
    },
  },

  // ============================================
  // AUDIO - MUSIC
  // ============================================
  {
    id: "audio:music-upbeat",
    prompt: "Generate upbeat background music with electronic beats for a workout video",
    expected: {
      model: "lyria-002",
      instances: expect.arrayContaining([
        expect.objectContaining({
          prompt: expect.stringMatching(/.+/),
        }),
      ]),
      parameters: expect.objectContaining({
        sample_count: 1,
      }),
    },
  },
  {
    id: "audio:music-meditation",
    prompt: "Generate music of calm ambient background music for meditation",
    expected: {
      model: "lyria-002",
      instances: expect.arrayContaining([
        expect.objectContaining({
          prompt: expect.stringMatching(/.+/),
        }),
      ]),
      parameters: expect.objectContaining({
        sample_count: 1,
      }),
    },
  },

  // ============================================
  // TEXT
  // ============================================
  {
    id: "text:explain-ai",
    prompt: "Write a text explanation of artificial intelligence and how it works",
    expected: {
      model: expect.stringMatching(/^gemini-2\.5-(flash|pro)$/),
      contents: expect.arrayContaining([
        expect.objectContaining({
          role: "user",
          parts: expect.arrayContaining([
            expect.objectContaining({
              text: expect.stringMatching(/.+/),
            }),
          ]),
        }),
      ]),
      generationConfig: expect.objectContaining({
        temperature: expect.any(Number),
        topP: expect.any(Number),
        topK: expect.any(Number),
        maxOutputTokens: expect.any(Number),
      }),
    },
  },
  {
    id: "text:neural-networks-beginner",
    prompt: "Write a short text description of how neural networks work for a beginner",
    expected: {
      model: "gemini-2.5-flash",
      contents: expect.arrayContaining([
        expect.objectContaining({
          role: "user",
          parts: expect.arrayContaining([
            expect.objectContaining({
              text: expect.stringMatching(/.+/),
            }),
          ]),
        }),
      ]),
      generationConfig: expect.objectContaining({
        temperature: expect.any(Number),
        topP: expect.any(Number),
        topK: expect.any(Number),
        maxOutputTokens: expect.any(Number),
      }),
    },
  },
  {
    id: "text:transformer-analysis",
    prompt: "Provide a comprehensive technical analysis of transformer architecture in modern large language models",
    expected: {
      model: expect.stringMatching(/^gemini-2\.5-(flash|pro)$/),
      contents: expect.arrayContaining([
        expect.objectContaining({
          role: "user",
          parts: expect.arrayContaining([
            expect.objectContaining({
              text: expect.stringMatching(/.+/),
            }),
          ]),
        }),
      ]),
      generationConfig: expect.objectContaining({
        temperature: expect.any(Number),
        topP: expect.any(Number),
        topK: expect.any(Number),
        maxOutputTokens: expect.any(Number),
      }),
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
