// functions/src/assisted-mode/gemini-helper.test.ts

/**
 * Unit tests for callDeterministicGemini helper function.
 *
 * These tests verify that the helper function is truly deterministic by:
 * 1. Testing repeated calls with same input return identical output (text mode)
 * 2. Testing repeated calls with same input return identical JSON (JSON mode)
 * 3. Verifying the actual API configuration sent to Vertex AI
 */

import {describe, test, expect, vi, beforeEach, afterEach} from "vitest";
import {callDeterministicGemini} from "./gemini-helper.js";
import {z} from "zod";

describe("callDeterministicGemini", () => {
  describe("Determinism - Text Mode", () => {
    test("should return identical results for same prompt (text mode)", async () => {
      const prompt =
        "Explain the purpose of temperature parameter in LLM generation";

      const result1 = await callDeterministicGemini({
        systemInstruction: "You are a helpful AI assistant.",
        userPrompt: prompt,
        jobId: "test-determinism-1",
      });

      const result2 = await callDeterministicGemini({
        systemInstruction: "You are a helpful AI assistant.",
        userPrompt: prompt,
        jobId: "test-determinism-2",
      });

      const result3 = await callDeterministicGemini({
        systemInstruction: "You are a helpful AI assistant.",
        userPrompt: prompt,
        jobId: "test-determinism-3",
      });

      // All three calls should return EXACTLY the same text
      expect(result1).toBe(result2);
      expect(result2).toBe(result3);
      expect(result1.length).toBeGreaterThan(0); // Verify actual response
    }, 30000); // 30s timeout for 3 API calls
  });

  describe("Determinism - JSON Mode", () => {
    test("should return identical JSON for same prompt (JSON mode)", async () => {
      const schema = z.object({
        model: z.enum([
          "veo-3.1-fast-generate-preview",
          "veo-3.1-generate-preview",
        ]),
        reasoning: z.array(z.string()).min(1),
      });

      const prompt = "Generate a video of a cat playing piano";

      const result1 = await callDeterministicGemini({
        systemInstruction:
          "You are an AI model selector. Choose the best video generation model.",
        userPrompt: prompt,
        jobId: "test-json-determinism-1",
        jsonSchema: schema,
      });

      const result2 = await callDeterministicGemini({
        systemInstruction:
          "You are an AI model selector. Choose the best video generation model.",
        userPrompt: prompt,
        jobId: "test-json-determinism-2",
        jsonSchema: schema,
      });

      const result3 = await callDeterministicGemini({
        systemInstruction:
          "You are an AI model selector. Choose the best video generation model.",
        userPrompt: prompt,
        jobId: "test-json-determinism-3",
        jsonSchema: schema,
      });

      // Parse JSON
      const json1 = JSON.parse(result1);
      const json2 = JSON.parse(result2);
      const json3 = JSON.parse(result3);

      // All three calls should return EXACTLY the same JSON structure
      expect(json1).toEqual(json2);
      expect(json2).toEqual(json3);

      // Verify schema validation
      expect(() => schema.parse(json1)).not.toThrow();

      // Verify specific fields are identical
      expect(json1.model).toBe(json2.model);
      expect(json1.model).toBe(json3.model);
      expect(json1.reasoning).toEqual(json2.reasoning);
      expect(json1.reasoning).toEqual(json3.reasoning);
    }, 30000); // 30s timeout for 3 API calls
  });

  describe("Configuration Verification", () => {
    let callVertexAPISpy: any;

    beforeEach(async () => {
      // Import and spy on callVertexAPI
      const vertexModule = await import("../lib/vertex-ai-client.js");
      callVertexAPISpy = vi.spyOn(vertexModule, "callVertexAPI");
    });

    afterEach(() => {
      callVertexAPISpy.mockRestore();
    });

    test("should send correct deterministic config to Vertex API", async () => {
      const schema = z.object({
        answer: z.string(),
      });

      await callDeterministicGemini({
        systemInstruction: "Answer questions concisely.",
        userPrompt: "What is 2+2?",
        jobId: "test-config",
        jsonSchema: schema,
        maxOutputTokens: 1024,
      });

      // Verify callVertexAPI was called with correct config
      expect(callVertexAPISpy).toHaveBeenCalledWith(
        expect.stringContaining("generateContent"),
        expect.objectContaining({
          generationConfig: expect.objectContaining({
            temperature: 0,
            topK: 1,
            topP: 1.0,
            candidateCount: 1,
            maxOutputTokens: 1024,
            responseMimeType: "application/json",
            responseSchema: expect.any(Object),
          }),
        }),
      );
    });

    test("should send correct config for text mode (no schema)", async () => {
      await callDeterministicGemini({
        systemInstruction: "You are helpful.",
        userPrompt: "Hello",
        jobId: "test-text-config",
      });

      // Verify callVertexAPI was called with deterministic config but NO JSON mode
      expect(callVertexAPISpy).toHaveBeenCalledWith(
        expect.stringContaining("generateContent"),
        expect.objectContaining({
          generationConfig: expect.objectContaining({
            temperature: 0,
            topK: 1,
            topP: 1.0,
            candidateCount: 1,
            maxOutputTokens: 8192, // default value
          }),
        }),
      );

      // Verify JSON mode is NOT enabled
      const lastCall = callVertexAPISpy.mock.calls[
        callVertexAPISpy.mock.calls.length - 1
      ];
      const generationConfig = lastCall[1].generationConfig;

      expect(generationConfig.responseMimeType).toBeUndefined();
      expect(generationConfig.responseSchema).toBeUndefined();
    });
  });
});
