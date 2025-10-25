// Integration test to verify Veo 3.1 adapter uses REST API format correctly
import {describe, it, expect, vi, beforeEach, afterEach} from "vitest";
import {Veo31FastGeneratePreviewAdapter} from "./veo-3.1-fast-generate-preview.js";
import {Veo31GeneratePreviewAdapter} from "./veo-3.1-generate-preview.js";
import * as vertexAiClient from "../_shared/vertex-ai-client.js";

// Mock the Vertex AI REST API client
vi.mock("../_shared/vertex-ai-client.js", () => ({
  predictLongRunning: vi.fn(),
}));

describe("Veo 3.1 Adapter Integration (REST API)", () => {
  let fastAdapter: Veo31FastGeneratePreviewAdapter;
  let regularAdapter: Veo31GeneratePreviewAdapter;
  let mockPredictLongRunning: any;

  beforeEach(() => {
    fastAdapter = new Veo31FastGeneratePreviewAdapter();
    regularAdapter = new Veo31GeneratePreviewAdapter();
    mockPredictLongRunning = vi.mocked(vertexAiClient.predictLongRunning);
    mockPredictLongRunning.mockResolvedValue({
      name: "operations/test-123",
      done: false,
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("veo-3.1-fast-generate-preview adapter", () => {
    it("should call REST API with correct format", async () => {
      const request = {
        model: "veo-3.1-fast-generate-preview",
        instances: [{
          prompt: "A cat driving a car",
        }],
        parameters: {
          durationSeconds: 8,
          aspectRatio: "16:9" as const,
          generateAudio: true,
          seed: 12345,
          enhancePrompt: true,
          personGeneration: "allow_adult" as const,
          compressionQuality: "OPTIMIZED" as const,
          negativePrompt: "blurry, low quality",
        },
      };

      await fastAdapter.start(request, "test-job-id");

      expect(mockPredictLongRunning).toHaveBeenCalledOnce();
      const [modelId, payload] = mockPredictLongRunning.mock.calls[0];

      // Verify model ID
      expect(modelId).toBe("veo-3.1-fast-generate-preview");

      // Verify payload structure matches REST API format
      expect(payload.instances).toBeDefined();
      expect(payload.parameters).toBeDefined();
      expect(payload.instances[0].prompt).toBe("A cat driving a car");

      // Verify all parameters are passed through
      expect(payload.parameters.seed).toBe(12345);
      expect(payload.parameters.enhancePrompt).toBe(true);
      expect(payload.parameters.personGeneration).toBe("allow_adult");
      expect(payload.parameters.compressionQuality).toBe("OPTIMIZED");
      expect(payload.parameters.negativePrompt).toBe("blurry, low quality");
      expect(payload.parameters.storageUri).toContain("test-job-id");
    });

    it("should handle minimal request (backward compatible)", async () => {
      const request = {
        model: "veo-3.1-fast-generate-preview",
        instances: [{
          prompt: "Simple video",
        }],
      };

      await fastAdapter.start(request, "test-job-id");

      const [, payload] = mockPredictLongRunning.mock.calls[0];
      expect(payload.instances[0].prompt).toBe("Simple video");
      expect(payload.parameters.storageUri).toContain("test-job-id");
    });

    it("should handle seed=0 correctly (falsy but valid)", async () => {
      const request = {
        model: "veo-3.1-fast-generate-preview",
        instances: [{prompt: "Test"}],
        parameters: {
          seed: 0,
        },
      };

      await fastAdapter.start(request, "test-job-id");

      const [, payload] = mockPredictLongRunning.mock.calls[0];
      expect(payload.parameters.seed).toBe(0);
    });

    it("should handle enhancePrompt=false correctly", async () => {
      const request = {
        model: "veo-3.1-fast-generate-preview",
        instances: [{prompt: "Test"}],
        parameters: {
          enhancePrompt: false,
        },
      };

      await fastAdapter.start(request, "test-job-id");

      const [, payload] = mockPredictLongRunning.mock.calls[0];
      expect(payload.parameters.enhancePrompt).toBe(false);
    });

    it("should combine new parameters with media inputs", async () => {
      const request = {
        model: "veo-3.1-fast-generate-preview",
        instances: [{
          prompt: "Animate this",
          image: {gcsUri: "gs://bucket/image.jpg"},
          referenceImages: [
            {image: {gcsUri: "gs://bucket/ref1.jpg"}, referenceType: "ASSET" as const},
            {image: {gcsUri: "gs://bucket/ref2.jpg"}, referenceType: "STYLE" as const},
          ],
        }],
        parameters: {
          negativePrompt: "blurry",
          seed: 999,
          enhancePrompt: true,
          compressionQuality: "LOSSLESS" as const,
        },
      };

      await fastAdapter.start(request, "test-job-id");

      const [, payload] = mockPredictLongRunning.mock.calls[0];

      // Media inputs
      expect(payload.instances[0].image?.gcsUri).toBe("gs://bucket/image.jpg");
      expect(payload.instances[0].referenceImages).toHaveLength(2);
      expect(payload.instances[0].referenceImages[0].referenceType).toBe("ASSET");
      expect(payload.instances[0].referenceImages[1].referenceType).toBe("STYLE");

      // New parameters
      expect(payload.parameters.negativePrompt).toBe("blurry");
      expect(payload.parameters.seed).toBe(999);
      expect(payload.parameters.enhancePrompt).toBe(true);
      expect(payload.parameters.compressionQuality).toBe("LOSSLESS");
    });
  });

  describe("veo-3.1-generate-preview adapter (high quality variant)", () => {
    it("should call REST API with same format as fast variant", async () => {
      const request = {
        model: "veo-3.1-generate-preview",
        instances: [{
          prompt: "Cinematic shot",
        }],
        parameters: {
          durationSeconds: 8,
          compressionQuality: "LOSSLESS" as const,
          seed: 42,
        },
      };

      await regularAdapter.start(request, "test-job-id");

      expect(mockPredictLongRunning).toHaveBeenCalledOnce();
      const [modelId, payload] = mockPredictLongRunning.mock.calls[0];

      expect(modelId).toBe("veo-3.1-generate-preview");
      expect(payload.instances[0].prompt).toBe("Cinematic shot");
      expect(payload.parameters.compressionQuality).toBe("LOSSLESS");
      expect(payload.parameters.seed).toBe(42);
      expect(payload.parameters.storageUri).toContain("test-job-id");
    });
  });
});
