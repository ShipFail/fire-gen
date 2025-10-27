#!/usr/bin/env npx tsx
/**
 * Test script to verify Gemini helper determinism
 *
 * Usage: npx tsx scripts/test-gemini-determinism.ts
 */

import {callDeterministicGemini} from "../src/assisted-mode/gemini-helper.js";

async function main() {
  const prompt = "who is Huan Li? He is author of Wechaty";
  // const prompt = "what is the meaning of life?";
  const systemInstruction = "" // You are a helpful AI assistant.";

  console.log(`Prompt: "${prompt}"`);
  console.log(`System: "${systemInstruction}"`);
  // Call 1
  console.log("📞 Call 1:");
  const result1 = await callDeterministicGemini({
    systemInstruction,
    userPrompt: prompt,
    jobId: "test-joke-1",
  });
  console.log(result1);
  console.log();
}

main();
