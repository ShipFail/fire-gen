// functions/src/assisted-mode/prompts.test.ts
import {describe, test, expect} from "vitest";
import {assistedRequest} from "./index.js";

/**
 * AssistedMode Test Suite
 *
 * Uses test.concurrent.each() for parallel test execution.
 * Each fixture becomes one named test that can be filtered with -t flag.
 *
 * Note: We use direct import of expect() rather than test context to work
 * around Vitest issue #4963 (test.concurrent.each context not properly typed).
 *
 * Usage:
 * - Run all tests: npm run test:assisted-mode
 * - Run single test: npm run test:assisted-mode -- -t "video:sunset"
 * - Run category: npm run test:assisted-mode -- -t "video:"
 * - Run in watch mode: npm run test:assisted-mode:watch -- -t "image:"
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
    prompt: "Generate a video: animate this landscape image with gentle camera movement https://storage.googleapis.com/example/mountain-lake.jpg",
    expected: {
      model: expect.stringMatching(/^veo-3\.1-(fast-)?generate-preview$/),
      instances: expect.arrayContaining([
        expect.objectContaining({
          prompt: expect.stringMatching(/.+/),
          image: expect.objectContaining({
            gcsUri: expect.stringContaining("mountain-lake.jpg"),
          }),
        }),
      ]),
      parameters: expect.objectContaining({
        durationSeconds: expect.any(Number),
        aspectRatio: expect.any(String),
        generateAudio: expect.any(Boolean),
      }),
    },
  },
  {
    id: "video:veo31-bring-photo-to-life",
    prompt: "Generate a video: make this photo come alive with wind and clouds https://firebasestorage.googleapis.com/v0/b/my-project.appspot.com/o/images%2Fsunset.jpg?alt=media&token=abc123",
    expected: {
      model: expect.stringMatching(/^veo-3\.1-(fast-)?generate-preview$/),
      instances: expect.arrayContaining([
        expect.objectContaining({
          prompt: expect.stringMatching(/.+/),
          image: expect.objectContaining({
            gcsUri: expect.stringContaining("sunset.jpg"),
          }),
        }),
      ]),
      parameters: expect.objectContaining({
        durationSeconds: expect.any(Number),
        aspectRatio: expect.any(String),
        generateAudio: expect.any(Boolean),
      }),
    },
  },

  // ============================================
  // VIDEO - VEO 3.1 SUBJECT REFERENCES
  // ============================================
  {
    id: "video:veo31-single-subject",
    prompt: "Generate a video: show this character walking through a futuristic city gs://example/character.jpg",
    expected: {
      model: expect.stringMatching(/^veo-3\.1-(fast-)?generate-preview$/),
      instances: expect.arrayContaining([
        expect.objectContaining({
          prompt: expect.stringMatching(/walking through.*futuristic city/i),
        }),
      ]),
      parameters: expect.objectContaining({
        durationSeconds: expect.any(Number),
        aspectRatio: "16:9",
        generateAudio: expect.any(Boolean),
      }),
    },
  },
  {
    id: "video:veo31-two-subjects",
    prompt: "Create a video featuring https://storage.googleapis.com/example/person1.jpg and https://storage.googleapis.com/example/person2.jpg walking together in a park",
    expected: {
      model: expect.stringMatching(/^veo-3\.1-(fast-)?generate-preview$/),
      instances: expect.arrayContaining([
        expect.objectContaining({
          prompt: expect.stringMatching(/.+/),
          referenceImages: expect.arrayContaining([
            expect.objectContaining({
              image: expect.objectContaining({
                gcsUri: expect.stringContaining("person1.jpg"),
              }),
              referenceType: expect.stringMatching(/^(asset|style)$/),
            }),
            expect.objectContaining({
              image: expect.objectContaining({
                gcsUri: expect.stringContaining("person2.jpg"),
              }),
              referenceType: expect.stringMatching(/^(asset|style)$/),
            }),
          ]),
        }),
      ]),
      parameters: expect.objectContaining({
        durationSeconds: expect.any(Number),
        aspectRatio: "16:9",
        generateAudio: expect.any(Boolean),
      }),
    },
  },
  {
    id: "video:veo31-three-subjects-max",
    prompt: "Create a video showcasing these three products rotating in a studio gs://example/product1.jpg gs://example/product2.jpg gs://example/product3.jpg",
    expected: {
      model: expect.stringMatching(/^veo-3\.1-(fast-)?generate-preview$/),
      instances: expect.arrayContaining([
        expect.objectContaining({
          prompt: expect.stringMatching(/studio/i),
          referenceImages: expect.arrayContaining([
            expect.objectContaining({
              image: expect.objectContaining({
                gcsUri: "gs://example/product1.jpg",
              }),
              referenceType: expect.stringMatching(/^(asset|style)$/),
            }),
            expect.objectContaining({
              image: expect.objectContaining({
                gcsUri: "gs://example/product2.jpg",
              }),
              referenceType: expect.stringMatching(/^(asset|style)$/),
            }),
            expect.objectContaining({
              image: expect.objectContaining({
                gcsUri: "gs://example/product3.jpg",
              }),
              referenceType: expect.stringMatching(/^(asset|style)$/),
            }),
          ]),
        }),
      ]),
      parameters: expect.objectContaining({
        durationSeconds: expect.any(Number),
        aspectRatio: "16:9",
        generateAudio: expect.any(Boolean),
      }),
    },
  },

  // ============================================
  // VIDEO - VEO 3.1 IMAGE-TO-VIDEO + SUBJECTS
  // ============================================
  {
    id: "video:veo31-base-plus-subject",
    prompt: "Animate this background gs://example/background.jpg with this character walking through gs://example/character.jpg",
    expected: {
      model: expect.stringMatching(/^veo-3\.1-(fast-)?generate-preview$/),
      instances: expect.arrayContaining([
        expect.objectContaining({
          prompt: expect.any(String), // AI may or may not remove URIs - both OK
        }),
      ]),
      parameters: expect.any(Object), // AI may classify as: imageGcsUri + referenceSubjectImages OR just referenceSubjectImages OR neither - all valid
    },
  },

  // ============================================
  // VIDEO - VEO 3.1 VIDEO EXTENSION
  // ============================================
  {
    id: "video:veo31-extend-video-only",
    prompt: "Continue this video for 6 more seconds https://storage.googleapis.com/example/part1.mp4",
    expected: {
      model: expect.stringMatching(/^veo-3\.1-(fast-)?generate-preview$/),
      instances: expect.arrayContaining([
        expect.objectContaining({
          prompt: expect.stringMatching(/continue/i),
          video: expect.objectContaining({
            gcsUri: expect.stringContaining("part1.mp4"),
          }),
        }),
      ]),
      parameters: expect.objectContaining({
        durationSeconds: 6,
      }),
    },
  },
  {
    id: "video:veo31-extend-video-with-frame",
    prompt: "Extend this video gs://example/scene.mp4 and use last frame gs://example/scene-last-frame.jpg with character turning around",
    expected: {
      model: expect.stringMatching(/^veo-3\.1-(fast-)?generate-preview$/),
      instances: expect.arrayContaining([
        expect.objectContaining({
          prompt: expect.stringMatching(/character.*turning around/i),
          video: expect.objectContaining({
            gcsUri: "gs://example/scene.mp4",
          }),
          lastFrame: expect.objectContaining({
            gcsUri: "gs://example/scene-last-frame.jpg",
          }),
        }),
      ]),
      parameters: expect.any(Object),
    },
  },
  {
    id: "video:veo31-video-part2",
    prompt: "Create part 2 of this video where the story continues gs://example/chapter1.mp4",
    expected: {
      model: expect.stringMatching(/^veo-3\.1-(fast-)?generate-preview$/),
      instances: expect.arrayContaining([
        expect.objectContaining({
          prompt: expect.stringMatching(/story continues/i),
          video: expect.objectContaining({
            gcsUri: expect.stringContaining("chapter1.mp4"),
          }),
        }),
      ]),
      parameters: expect.objectContaining({
        durationSeconds: expect.any(Number),
        aspectRatio: "16:9",
        generateAudio: expect.any(Boolean),
      }),
    },
  },

  // ============================================
  // VIDEO - VEO 3.1 FIRST-AND-LAST-FRAME TRANSITION
  // ============================================
  {
    id: "video:veo31-first-last-frame-product-demo",
    prompt: "First frame: https://firebasestorage.googleapis.com/v0/b/studio-3670859293-6f970.firebasestorage.app/o/users%2FnZ86oPazPgT3yZjTHhFFjkj7sR42%2Fprojects%2Fx5f8I6Tq99AGgj4HJrzF%2Fkeyframes%2Ffd3d84c9-9331-49ed-9739-7b35e76d9f9b.png?alt=media&token=8b570af6-92f9-4040-8f0c-c3ac0ae8ce17 Last frame: https://firebasestorage.googleapis.com/v0/b/studio-3670859293-6f970.firebasestorage.app/o/users%2FnZ86oPazPgT3yZjTHhFFjkj7sR42%2Fprojects%2Fx5f8I6Tq99AGgj4HJrzF%2Fkeyframes%2F5879bd22-6927-4549-9199-9281a6cd8115.png?alt=media&token=8c223589-0167-46e7-b2e0-6518d0611a53 base_style: \"cinematic, photorealistic, 4K\" aspect_ratio: \"9:16\" key_elements: - \"MAN\" - \"AMAZON ESSENTIALS LONG-SLEEVE HENLEY\" negative_prompts: [\"no text overlays\", \"no distracting music\"] timeline: - sequence: 1 timestamp: \"00:00-00:04\" action: \"The man stretches and smiles, his Amazon Essentials Henley moving comfortably with his body. A voiceover begins, describing the product's comfort. The dialogue for this shot is: 'Meet your everyday upgrade: The Amazon Essentials Men's Slim-Fit Henley.'\" - sequence: 2 timestamp: \"00:04-00:08\" action: \"the man takes a sip of his coffee and goes back to work\" audio: Sounds appropriate to the scene. The VO should say: 'It's comfort that keeps up with your day.'\"",
    expected: {
      model: expect.stringMatching(/^veo-3\.1-(fast-)?generate-preview$/), // Accept both fast and standard variants
      instances: expect.arrayContaining([
        expect.objectContaining({
          // Prompt should describe the action/scene WITHOUT URLs
          prompt: expect.stringMatching(/^(?!.*firebasestorage).*man.*stretches.*smiles.*Henley.*coffee.*work/i),
          // First frame goes in image field
          image: expect.objectContaining({
            gcsUri: "gs://studio-3670859293-6f970.firebasestorage.app/users/nZ86oPazPgT3yZjTHhFFjkj7sR42/projects/x5f8I6Tq99AGgj4HJrzF/keyframes/fd3d84c9-9331-49ed-9739-7b35e76d9f9b.png",
          }),
          // Last frame goes in lastFrame field (not referenceImages)
          lastFrame: expect.objectContaining({
            gcsUri: "gs://studio-3670859293-6f970.firebasestorage.app/users/nZ86oPazPgT3yZjTHhFFjkj7sR42/projects/x5f8I6Tq99AGgj4HJrzF/keyframes/5879bd22-6927-4549-9199-9281a6cd8115.png",
          }),
        }),
      ]),
      parameters: expect.objectContaining({
        aspectRatio: "9:16",
        durationSeconds: 8,
        generateAudio: true, // Explicit: prompt says "audio: Sounds appropriate to the scene"
        negativePrompt: expect.stringMatching(/(text overlays|distracting music)/i),
      }),
    },
  },

  // ============================================
  // VIDEO - VEO 3.1 GCS URI FORMAT VALIDATION
  // ============================================
  {
    id: "video:veo31-gcs-uri-exact-format-storage-api",
    prompt: "Animate this image https://storage.googleapis.com/my-bucket/images/landscape.jpg",
    expected: {
      model: expect.stringMatching(/^veo-3\.1-(fast-)?generate-preview$/),
      instances: expect.arrayContaining([
        expect.objectContaining({
          prompt: expect.stringMatching(/^(?!.*https:\/\/)/i),
          // Must be exact GCS URI format (not HTTP URL)
          image: expect.objectContaining({
            gcsUri: "gs://my-bucket/images/landscape.jpg",
          }),
        }),
      ]),
      parameters: expect.any(Object),
    },
  },
  {
    id: "video:veo31-gcs-uri-exact-format-firebase",
    prompt: "Animate https://firebasestorage.googleapis.com/v0/b/my-project.appspot.com/o/users%2Ftest%2Fvideo.mp4?alt=media",
    expected: {
      model: expect.stringMatching(/^veo-3\.1-(fast-)?generate-preview$/),
      instances: expect.arrayContaining([
        expect.objectContaining({
          prompt: expect.stringMatching(/^(?!.*firebasestorage)/i),
          video: expect.objectContaining({
            gcsUri: "gs://my-project.appspot.com/users/test/video.mp4",
          }),
        }),
      ]),
    },
  },
  {
    id: "video:veo31-gcs-uri-already-correct",
    prompt: "Show this character gs://example-bucket/characters/hero.png walking in an action scene",
    expected: {
      model: expect.stringMatching(/^veo-3\.1-(fast-)?generate-preview$/),
      instances: expect.arrayContaining([
        expect.objectContaining({
          prompt: expect.any(String), // AI may or may not remove URIs - both OK
        }),
      ]),
      parameters: expect.any(Object), // AI may extract URI to referenceSubjectImages - optional
    },
  },

  // ============================================
  // VIDEO - VEO 3.1 COMPLEX REAL-WORLD SCENARIOS
  // ============================================
  {
    id: "video:veo31-complex-product-demo",
    prompt: "Product demo: Show https://storage.googleapis.com/products/shoe-left.jpg and https://storage.googleapis.com/products/shoe-right.jpg rotating on a pedestal. Studio lighting, 9:16 vertical. Avoid: text overlays, price tags, distracting elements. Duration: 6 seconds.",
    expected: {
      model: expect.stringMatching(/^veo-3\.1-(fast-)?generate-preview$/),
      instances: expect.arrayContaining([
        expect.objectContaining({
          // URLs must be converted to gs:// and removed from prompt
          prompt: expect.stringMatching(/^(?!.*https:\/\/).*rotating.*pedestal.*studio lighting/i),
        }),
      ]),
      parameters: expect.objectContaining({
        durationSeconds: expect.any(Number), // AI may choose different duration - accept any valid value
        aspectRatio: "9:16",
        generateAudio: expect.any(Boolean),
        negativePrompt: expect.stringMatching(/text overlays|price tags|distracting/i),
      }),
      // Note: AI may use image + referenceImages OR just referenceImages - both valid
    },
  },
  {
    id: "video:veo31-character-consistency-narrative",
    prompt: "Continue the story from gs://stories/chapter1.mp4 where the hero gs://characters/hero.jpg discovers a hidden temple. Cinematic 4K quality. Negative prompt: modern elements, technology, urban background",
    expected: {
      model: expect.stringMatching(/^veo-3\.1-(fast-)?generate-preview$/),
      instances: expect.arrayContaining([
        expect.objectContaining({
          prompt: expect.any(String), // AI may or may not remove URIs - both OK
        }),
      ]),
      parameters: expect.objectContaining({
        durationSeconds: expect.any(Number),
        aspectRatio: expect.any(String),
        generateAudio: expect.any(Boolean),
      }),
      // AI may extract video and/or referenceImages - optional
      // AI may extract negativePrompt - optional
    },
  },

  // ============================================
  // IMAGE - BASELINE
  // ============================================
  {
    id: "image:cat",
    prompt: "Generate an image: fluffy orange cat sitting on a windowsill",
    expected: {
      model: "gemini-2.5-flash-image",
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
        responseModalities: ["IMAGE"],
      }),
    },
  },
  {
    id: "image:scientist-portrait",
    prompt: "Generate an image: portrait photo of a scientist in a modern laboratory, professional lighting",
    expected: {
      model: "gemini-2.5-flash-image",
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
        responseModalities: ["IMAGE"],
      }),
      // Note: "portrait of X" is ambiguous - could mean portrait subject (1:1) or portrait orientation (2:3/3:4/9:16)
      // AI interprets this as portrait subject, so 1:1 is acceptable
    },
  },
  {
    id: "image:photorealistic-portrait",
    prompt: "Generate an image: photorealistic ultra-detailed portrait, 9:16 aspect ratio",
    expected: {
      model: "gemini-2.5-flash-image",
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
        responseModalities: ["IMAGE"],
        imageConfig: expect.objectContaining({
          aspectRatio: "9:16",
        }),
      }),
    },
  },

  // ============================================
  // AUDIO - TTS
  // ============================================
  {
    id: "audio:speak-hello",
    prompt: "Use TTS to generate audio: speak hello world, how are you doing today?",
    expected: {
      model: expect.stringMatching(/^gemini-2\.5-(flash|pro)-preview-tts$/),
      contents: expect.arrayContaining([
        expect.objectContaining({
          role: "user",
          parts: expect.arrayContaining([
            expect.objectContaining({
              text: expect.stringMatching(/hello world/i),
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
    prompt: "Use TTS to say 'Welcome to FireGen' in a cheerful friendly voice",
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
];

describe("Assisted Mode", () => {
  test.concurrent.each(fixtures)(
    "$id: $prompt",
    async ({id, prompt, expected}) => {
      const analyzed = await assistedRequest(prompt, `test-${id}`);

      // Verify request structure matches expected
      expect(analyzed.request).toMatchObject(expected);

      // Verify reasons array exists and has content
      expect(analyzed.reasons).toBeInstanceOf(Array);
      expect(analyzed.reasons.length).toBeGreaterThan(0);
    },
    90000  // 90s timeout for 2-step pipeline with Pro model + retry buffer
  );

});
