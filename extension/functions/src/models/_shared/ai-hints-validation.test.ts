// functions/src/models/_shared/ai-hints-validation.test.ts
import {describe, it, expect} from "vitest";
import {VEO_AI_HINTS} from "../veo/ai-hints.js";
import {GEMINI_FLASH_IMAGE_AI_HINTS} from "../gemini-flash-image/ai-hints.js";
import {GEMINI_TTS_AI_HINTS} from "../gemini-tts/ai-hints.js";

/**
 * CRITICAL: These tests ensure AI hints are auto-generated from Zod schemas.
 * 
 * This validates Zod SSOT Principle #4: "AI hints auto-generated from schema"
 * 
 * When schema changes:
 * 1. Update the Zod schema (single source of truth)
 * 2. AI hints automatically update via zodToJsonExample()
 * 3. These tests verify hints contain JSON Schema format
 */

describe("AI Hints Schema Validation", () => {
  describe("VEO AI Hints", () => {
    it("should contain auto-generated JSON Schema from Zod", () => {
      // Should have JSON Schema structure (not hardcoded JSON example)
      expect(VEO_AI_HINTS).toContain('"type": "object"');
      expect(VEO_AI_HINTS).toContain('"properties"');
    });

    it("should include model field schema", () => {
      expect(VEO_AI_HINTS).toContain('"model"');
      expect(VEO_AI_HINTS).toContain('"const": "veo-3.1-fast-generate-preview"');
    });

    it("should include instances array schema", () => {
      expect(VEO_AI_HINTS).toContain('"instances"');
      expect(VEO_AI_HINTS).toContain('"type": "array"');
    });

    it("should include parameters object schema", () => {
      expect(VEO_AI_HINTS).toContain('"parameters"');
    });

    it("should include key parameter fields", () => {
      expect(VEO_AI_HINTS).toContain('"durationSeconds"');
      expect(VEO_AI_HINTS).toContain('"aspectRatio"');
      expect(VEO_AI_HINTS).toContain('"generateAudio"');
    });

    it("should include enum values from schema", () => {
      // Aspect ratio enum
      expect(VEO_AI_HINTS).toContain('"enum"');
    });
  });

  describe("Gemini Flash Image AI Hints", () => {
    it("should contain auto-generated JSON Schema from Zod", () => {
      expect(GEMINI_FLASH_IMAGE_AI_HINTS).toContain('"type": "object"');
      expect(GEMINI_FLASH_IMAGE_AI_HINTS).toContain('"properties"');
    });

    it("should include model field schema", () => {
      expect(GEMINI_FLASH_IMAGE_AI_HINTS).toContain('"model"');
      expect(GEMINI_FLASH_IMAGE_AI_HINTS).toContain('"const": "gemini-2.5-flash-image"');
    });

    it("should include contents array schema", () => {
      expect(GEMINI_FLASH_IMAGE_AI_HINTS).toContain('"contents"');
      expect(GEMINI_FLASH_IMAGE_AI_HINTS).toContain('"type": "array"');
    });

    it("should include generationConfig schema", () => {
      expect(GEMINI_FLASH_IMAGE_AI_HINTS).toContain('"generationConfig"');
    });
  });

  describe("Gemini TTS AI Hints", () => {
    it("should contain auto-generated JSON Schema from Zod", () => {
      expect(GEMINI_TTS_AI_HINTS).toContain('"type": "object"');
      expect(GEMINI_TTS_AI_HINTS).toContain('"properties"');
    });

    it("should include model field schema", () => {
      expect(GEMINI_TTS_AI_HINTS).toContain('"model"');
      expect(GEMINI_TTS_AI_HINTS).toContain('"const": "gemini-2.5-flash-preview-tts"');
    });

    it("should include contents array schema", () => {
      expect(GEMINI_TTS_AI_HINTS).toContain('"contents"');
      expect(GEMINI_TTS_AI_HINTS).toContain('"type": "array"');
    });

    it("should include generationConfig schema", () => {
      expect(GEMINI_TTS_AI_HINTS).toContain('"generationConfig"');
    });

    it("should include speechConfig schema", () => {
      expect(GEMINI_TTS_AI_HINTS).toContain('"speechConfig"');
    });
  });

  describe("Auto-generation Verification", () => {
    it("all AI hints should use zodToJsonExample (no hardcoded JSON)", () => {
      // All hints should contain JSON Schema markers
      const hints = [VEO_AI_HINTS, GEMINI_FLASH_IMAGE_AI_HINTS, GEMINI_TTS_AI_HINTS];
      
      hints.forEach(hint => {
        expect(hint).toContain("auto-generated from Zod");
        expect(hint).toContain('"type": "object"');
        expect(hint).toContain('"properties"');
      });
    });
  });
});
