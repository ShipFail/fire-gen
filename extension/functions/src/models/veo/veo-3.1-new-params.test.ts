// Test for Veo 3.1 new parameters support (REST API format)
import {describe, it, expect} from "vitest";
import {Veo31GeneratePreviewRequestSchema} from "./veo-3.1-generate-preview.js";
import {Veo31FastGeneratePreviewRequestSchema} from "./veo-3.1-fast-generate-preview.js";

describe("Veo 3.1 New Parameters (REST API Format)", () => {
  describe("veo-3.1-generate-preview schema", () => {
    it("should accept all new parameters in REST API format", () => {
      const request = {
        model: "veo-3.1-generate-preview",
        instances: [{
          prompt: "A cat driving a car",
        }],
        parameters: {
          durationSeconds: 8,
          aspectRatio: "16:9" as const,
          generateAudio: true,
          // New parameters
          seed: 12345,
          enhancePrompt: true,
          personGeneration: "allow_adult" as const,
          compressionQuality: "OPTIMIZED" as const,
          negativePrompt: "blurry, low quality",
          sampleCount: 1,
          storageUri: "gs://test-bucket/output/",
        },
      };

      const result = Veo31GeneratePreviewRequestSchema.safeParse(request);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.parameters?.seed).toBe(12345);
        expect(result.data.parameters?.enhancePrompt).toBe(true);
        expect(result.data.parameters?.personGeneration).toBe("allow_adult");
        expect(result.data.parameters?.compressionQuality).toBe("OPTIMIZED");
        expect(result.data.parameters?.negativePrompt).toBe("blurry, low quality");
      }
    });

    it("should accept compressionQuality: LOSSLESS", () => {
      const request = {
        model: "veo-3.1-generate-preview",
        instances: [{prompt: "High quality cinematic shot"}],
        parameters: {
          compressionQuality: "LOSSLESS" as const,
          storageUri: "gs://test/",
        },
      };

      const result = Veo31GeneratePreviewRequestSchema.safeParse(request);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.parameters?.compressionQuality).toBe("LOSSLESS");
      }
    });

    it("should accept personGeneration: dont_allow", () => {
      const request = {
        model: "veo-3.1-generate-preview",
        instances: [{prompt: "Abstract shapes"}],
        parameters: {
          personGeneration: "dont_allow" as const,
          storageUri: "gs://test/",
        },
      };

      const result = Veo31GeneratePreviewRequestSchema.safeParse(request);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.parameters?.personGeneration).toBe("dont_allow");
      }
    });

    it("should reject invalid compressionQuality values", () => {
      const request = {
        model: "veo-3.1-generate-preview",
        instances: [{prompt: "Test"}],
        parameters: {
          compressionQuality: "ultra-high", // Invalid
          storageUri: "gs://test/",
        },
      };

      const result = Veo31GeneratePreviewRequestSchema.safeParse(request);
      expect(result.success).toBe(false);
    });

    it("should reject invalid personGeneration values", () => {
      const request = {
        model: "veo-3.1-generate-preview",
        instances: [{prompt: "Test"}],
        parameters: {
          personGeneration: "allow_all", // Invalid
          storageUri: "gs://test/",
        },
      };

      const result = Veo31GeneratePreviewRequestSchema.safeParse(request);
      expect(result.success).toBe(false);
    });

    it("should accept seed as integer", () => {
      const request = {
        model: "veo-3.1-generate-preview",
        instances: [{prompt: "Reproducible video"}],
        parameters: {
          seed: 42,
          storageUri: "gs://test/",
        },
      };

      const result = Veo31GeneratePreviewRequestSchema.safeParse(request);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.parameters?.seed).toBe(42);
      }
    });

    it("should work without any new parameters (backward compatible)", () => {
      const request = {
        model: "veo-3.1-generate-preview",
        instances: [{prompt: "Simple video"}],
        parameters: {
          storageUri: "gs://test/",
        },
      };

      const result = Veo31GeneratePreviewRequestSchema.safeParse(request);
      expect(result.success).toBe(true);
    });

    it("should accept referenceImages with referenceType", () => {
      const request = {
        model: "veo-3.1-generate-preview",
        instances: [{
          prompt: "A character in different poses",
          referenceImages: [
            {
              image: {gcsUri: "gs://bucket/ref1.jpg"},
              referenceType: "ASSET" as const,
            },
          ],
        }],
        parameters: {
          storageUri: "gs://test/",
        },
      };

      const result = Veo31GeneratePreviewRequestSchema.safeParse(request);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.instances[0].referenceImages?.[0].referenceType).toBe("ASSET");
      }
    });
  });

  describe("veo-3.1-fast-generate-preview schema", () => {
    it("should accept all new parameters in REST API format", () => {
      const request = {
        model: "veo-3.1-fast-generate-preview",
        instances: [{
          prompt: "A dog playing fetch",
        }],
        parameters: {
          seed: 54321,
          enhancePrompt: false,
          personGeneration: "dont_allow" as const,
          compressionQuality: "LOSSLESS" as const,
          storageUri: "gs://test/",
        },
      };

      const result = Veo31FastGeneratePreviewRequestSchema.safeParse(request);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.parameters?.seed).toBe(54321);
        expect(result.data.parameters?.enhancePrompt).toBe(false);
        expect(result.data.parameters?.personGeneration).toBe("dont_allow");
        expect(result.data.parameters?.compressionQuality).toBe("LOSSLESS");
      }
    });

    it("should combine new parameters with existing image/video features", () => {
      const request = {
        model: "veo-3.1-fast-generate-preview",
        instances: [{
          prompt: "Animate this image",
          image: {gcsUri: "gs://bucket/image.jpg"},
          referenceImages: [
            {image: {gcsUri: "gs://bucket/ref1.jpg"}},
          ],
        }],
        parameters: {
          negativePrompt: "blurry",
          seed: 123,
          enhancePrompt: true,
          compressionQuality: "OPTIMIZED" as const,
          storageUri: "gs://test/",
        },
      };

      const result = Veo31FastGeneratePreviewRequestSchema.safeParse(request);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.instances[0].image?.gcsUri).toBe("gs://bucket/image.jpg");
        expect(result.data.instances[0].referenceImages?.[0].image.gcsUri).toBe("gs://bucket/ref1.jpg");
        expect(result.data.parameters?.negativePrompt).toBe("blurry");
        expect(result.data.parameters?.seed).toBe(123);
        expect(result.data.parameters?.enhancePrompt).toBe(true);
        expect(result.data.parameters?.compressionQuality).toBe("OPTIMIZED");
      }
    });
  });
});
