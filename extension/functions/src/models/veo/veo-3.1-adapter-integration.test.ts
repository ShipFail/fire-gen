// Integration test to verify Veo 3.1 adapter uses new parameters correctly
import {describe, it, expect, vi, beforeEach, afterEach} from "vitest";
import {Veo31FastGeneratePreviewAdapter} from "./veo-3.1-fast-generate-preview.js";
import {ai} from "../_shared/ai-client.js";

// Mock the AI client
vi.mock("../_shared/ai-client.js", () => ({
  ai: {
    models: {
      generateVideos: vi.fn(),
    },
  },
}));

describe("Veo 3.1 Adapter Integration", () => {
  let adapter: Veo31FastGeneratePreviewAdapter;
  let mockGenerateVideos: any;

  beforeEach(() => {
    adapter = new Veo31FastGeneratePreviewAdapter();
    mockGenerateVideos = vi.mocked(ai.models.generateVideos);
    mockGenerateVideos.mockResolvedValue({
      name: "operations/test-123",
      done: false,
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("should pass all new parameters to the SDK", async () => {
    const request = {
      type: "video" as const,
      model: "veo-3.1-fast-generate-preview" as const,
      prompt: "A cat driving a car",
      duration: 8,
      aspectRatio: "16:9" as const,
      audio: true,
      seed: 12345,
      enhancePrompt: true,
      personGeneration: "allow_adult" as const,
      compressionQuality: "optimized" as const,
      negativePrompt: "blurry, low quality",
    };

    await adapter.start(request, "test-job-id");

    expect(mockGenerateVideos).toHaveBeenCalledOnce();
    const callArgs = mockGenerateVideos.mock.calls[0][0];

    // Verify basic structure
    expect(callArgs.model).toBe("veo-3.1-fast-generate-preview");
    expect(callArgs.source.prompt).toBe("A cat driving a car");

    // Verify new parameters are passed in config
    expect(callArgs.config.seed).toBe(12345);
    expect(callArgs.config.enhancePrompt).toBe(true);
    expect(callArgs.config.personGeneration).toBe("allow_adult");
    expect(callArgs.config.compressionQuality).toBe("OPTIMIZED"); // Should be uppercase
    expect(callArgs.config.negativePrompt).toBe("blurry, low quality");
  });

  it("should convert compressionQuality to uppercase", async () => {
    const request = {
      type: "video" as const,
      model: "veo-3.1-fast-generate-preview" as const,
      prompt: "Test",
      compressionQuality: "lossless" as const,
    };

    await adapter.start(request, "test-job-id");

    const callArgs = mockGenerateVideos.mock.calls[0][0];
    expect(callArgs.config.compressionQuality).toBe("LOSSLESS");
  });

  it("should not include optional parameters when not provided", async () => {
    const request = {
      type: "video" as const,
      model: "veo-3.1-fast-generate-preview" as const,
      prompt: "Simple video",
    };

    await adapter.start(request, "test-job-id");

    const callArgs = mockGenerateVideos.mock.calls[0][0];
    expect(callArgs.config.seed).toBeUndefined();
    expect(callArgs.config.enhancePrompt).toBeUndefined();
    expect(callArgs.config.personGeneration).toBeUndefined();
    expect(callArgs.config.compressionQuality).toBeUndefined();
    expect(callArgs.config.negativePrompt).toBeUndefined();
  });

  it("should handle seed=0 correctly (falsy but valid)", async () => {
    const request = {
      type: "video" as const,
      model: "veo-3.1-fast-generate-preview" as const,
      prompt: "Test",
      seed: 0,
    };

    await adapter.start(request, "test-job-id");

    const callArgs = mockGenerateVideos.mock.calls[0][0];
    expect(callArgs.config.seed).toBe(0); // Should include even though falsy
  });

  it("should handle enhancePrompt=false correctly", async () => {
    const request = {
      type: "video" as const,
      model: "veo-3.1-fast-generate-preview" as const,
      prompt: "Test",
      enhancePrompt: false,
    };

    await adapter.start(request, "test-job-id");

    const callArgs = mockGenerateVideos.mock.calls[0][0];
    expect(callArgs.config.enhancePrompt).toBe(false); // Should include even though falsy
  });

  it("should combine new parameters with existing features", async () => {
    const request = {
      type: "video" as const,
      model: "veo-3.1-fast-generate-preview" as const,
      prompt: "Animate this",
      imageGcsUri: "gs://bucket/image.jpg",
      referenceSubjectImages: ["gs://bucket/ref1.jpg", "gs://bucket/ref2.jpg"],
      negativePrompt: "blurry",
      seed: 999,
      enhancePrompt: true,
      compressionQuality: "lossless" as const,
    };

    await adapter.start(request, "test-job-id");

    const callArgs = mockGenerateVideos.mock.calls[0][0];

    // Existing features
    expect(callArgs.config.image).toBe("gs://bucket/image.jpg");
    expect(callArgs.config.referenceImages.subject).toEqual([
      "gs://bucket/ref1.jpg",
      "gs://bucket/ref2.jpg",
    ]);

    // New parameters
    expect(callArgs.config.negativePrompt).toBe("blurry");
    expect(callArgs.config.seed).toBe(999);
    expect(callArgs.config.enhancePrompt).toBe(true);
    expect(callArgs.config.compressionQuality).toBe("LOSSLESS");
  });
});
