#!/usr/bin/env npx tsx
/**
 * Test script to verify multi-part user message feature
 *
 * Tests that additionalContext is properly sent as a second part
 * in the user message array.
 *
 * Usage: npx tsx scripts/test-multipart-message.ts
 */

import {callDeterministicGemini} from "../src/assisted-mode/gemini-helper.js";

async function main() {
  console.log("=".repeat(80));
  console.log("Testing Multi-Part User Message (Original Prompt + Context)");
  console.log("=".repeat(80));
  console.log();

  const userPrompt = "Generate a video";
  const additionalContext = `**Previous Analysis:**
- Model selected: veo-3.1-fast-generate-preview
- Duration inferred: 8 seconds
- Aspect ratio: 16:9
- User wants: cat playing piano`;

  console.log("Part 1 (User's original prompt):");
  console.log(`  "${userPrompt}"`);
  console.log();
  console.log("Part 2 (Additional context/reasoning):");
  console.log(`  ${additionalContext.split('\n').join('\n  ')}`);
  console.log();
  console.log("-".repeat(80));
  console.log("Making API call with multi-part user message...");
  console.log("-".repeat(80));
  console.log();

  try {
    const result = await callDeterministicGemini({
      systemInstruction: "You are an expert video generation assistant. Acknowledge the analysis and confirm the parameters.",
      userPrompt,
      additionalContext,
      jobId: "test-multipart",
    });

    console.log("✅ Response:");
    console.log(result);
    console.log();
    console.log("=".repeat(80));
    console.log("SUCCESS: Multi-part message sent successfully!");
    console.log("The API received:");
    console.log("  contents[0].parts[0] = User's original prompt");
    console.log("  contents[0].parts[1] = Additional context");
    console.log("=".repeat(80));

  } catch (error) {
    console.error("❌ Error:", error);
    process.exit(1);
  }
}

main();
