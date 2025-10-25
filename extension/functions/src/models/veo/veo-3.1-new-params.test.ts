// Test for Veo 3.1 new parameters support
import {describe, it, expect} from "vitest";
import {Veo31GeneratePreviewRequestSchema} from "./veo-3.1-generate-preview.js";
import {Veo31FastGeneratePreviewRequestSchema} from "./veo-3.1-fast-generate-preview.js";

describe("Veo 3.1 New Parameters", () => {
  describe("veo-3.1-generate-preview schema", () => {
    it("should accept all new parameters", () => {
      const request = {
        type: "video",
        model: "veo-3.1-generate-preview",
        prompt: "A cat driving a car",
        duration: 8,
        aspectRatio: "16:9",
        audio: true,
        // New parameters
        seed: 12345,
        enhancePrompt: true,
        personGeneration: "allow_adult",
        compressionQuality: "optimized",
        negativePrompt: "blurry, low quality",
      };

      const result = Veo31GeneratePreviewRequestSchema.safeParse(request);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.seed).toBe(12345);
        expect(result.data.enhancePrompt).toBe(true);
        expect(result.data.personGeneration).toBe("allow_adult");
        expect(result.data.compressionQuality).toBe("optimized");
        expect(result.data.negativePrompt).toBe("blurry, low quality");
      }
    });

    it("should accept compressionQuality: lossless", () => {
      const request = {
        type: "video",
        model: "veo-3.1-generate-preview",
        prompt: "High quality cinematic shot",
        compressionQuality: "lossless",
      };

      const result = Veo31GeneratePreviewRequestSchema.safeParse(request);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.compressionQuality).toBe("lossless");
      }
    });

    it("should accept personGeneration: dont_allow", () => {
      const request = {
        type: "video",
        model: "veo-3.1-generate-preview",
        prompt: "Abstract shapes",
        personGeneration: "dont_allow",
      };

      const result = Veo31GeneratePreviewRequestSchema.safeParse(request);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.personGeneration).toBe("dont_allow");
      }
    });

    it("should reject invalid compressionQuality values", () => {
      const request = {
        type: "video",
        model: "veo-3.1-generate-preview",
        prompt: "Test",
        compressionQuality: "ultra-high", // Invalid
      };

      const result = Veo31GeneratePreviewRequestSchema.safeParse(request);
      expect(result.success).toBe(false);
    });

    it("should reject invalid personGeneration values", () => {
      const request = {
        type: "video",
        model: "veo-3.1-generate-preview",
        prompt: "Test",
        personGeneration: "allow_all", // Invalid
      };

      const result = Veo31GeneratePreviewRequestSchema.safeParse(request);
      expect(result.success).toBe(false);
    });

    it("should accept seed as integer", () => {
      const request = {
        type: "video",
        model: "veo-3.1-generate-preview",
        prompt: "Reproducible video",
        seed: 999,
      };

      const result = Veo31GeneratePreviewRequestSchema.safeParse(request);
      expect(result.success).toBe(true);
    });

    it("should work without any new parameters (backward compatible)", () => {
      const request = {
        type: "video",
        model: "veo-3.1-generate-preview",
        prompt: "Simple video",
      };

      const result = Veo31GeneratePreviewRequestSchema.safeParse(request);
      expect(result.success).toBe(true);
    });
  });

  describe("veo-3.1-fast-generate-preview schema", () => {
    it("should accept all new parameters", () => {
      const request = {
        type: "video",
        model: "veo-3.1-fast-generate-preview",
        prompt: "A dog playing fetch",
        seed: 54321,
        enhancePrompt: false,
        personGeneration: "dont_allow",
        compressionQuality: "lossless",
      };

      const result = Veo31FastGeneratePreviewRequestSchema.safeParse(request);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.seed).toBe(54321);
        expect(result.data.enhancePrompt).toBe(false);
        expect(result.data.personGeneration).toBe("dont_allow");
        expect(result.data.compressionQuality).toBe("lossless");
      }
    });

    it("should combine new parameters with existing image/video features", () => {
      const request = {
        type: "video",
        model: "veo-3.1-fast-generate-preview",
        prompt: "Animate this image",
        imageGcsUri: "gs://bucket/image.jpg",
        referenceSubjectImages: ["gs://bucket/ref1.jpg"],
        negativePrompt: "blurry",
        seed: 123,
        enhancePrompt: true,
        compressionQuality: "optimized",
      };

      const result = Veo31FastGeneratePreviewRequestSchema.safeParse(request);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.imageGcsUri).toBe("gs://bucket/image.jpg");
        expect(result.data.referenceSubjectImages).toEqual(["gs://bucket/ref1.jpg"]);
        expect(result.data.negativePrompt).toBe("blurry");
        expect(result.data.seed).toBe(123);
        expect(result.data.enhancePrompt).toBe(true);
        expect(result.data.compressionQuality).toBe("optimized");
      }
    });
  });
});
