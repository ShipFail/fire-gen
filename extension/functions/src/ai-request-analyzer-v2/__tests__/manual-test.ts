// functions/src/ai-request-analyzer-v2/__tests__/manual-test.ts

/**
 * Manual test for AI Request Analyzer V2
 *
 * Run with: npx tsx src/ai-request-analyzer-v2/__tests__/manual-test.ts
 */

import {analyzePrompt} from "../orchestrator.js";

async function test() {
  console.log("🧪 Testing AI Request Analyzer V2\n");

  const testCases = [
    {
      name: "Video with reference image",
      prompt: "Create a 6-second video of a cat playing with a ball, use gs://my-bucket/cat-reference.jpg as style reference",
    },
    {
      name: "Image generation",
      prompt: "Create an image of a sunset over mountains in 16:9 aspect ratio",
    },
    {
      name: "Text-to-speech",
      prompt: "Say hello world in a friendly voice",
    },
  ];

  for (const testCase of testCases) {
    console.log(`\n📝 Test: ${testCase.name}`);
    console.log(`Prompt: "${testCase.prompt}"\n`);

    try {
      const result = await analyzePrompt(testCase.prompt, `test-${Date.now()}`);

      console.log("✅ Success!");
      console.log(`Model: ${result.model}`);
      console.log("\nReasoning Chain:");
      result.reasons.forEach((r, i) => console.log(`  ${i + 1}. ${r}`));
      console.log("\nGenerated Request:");
      console.log(JSON.stringify(result.request, null, 2));
    } catch (error) {
      console.error("❌ Error:", error);
    }

    console.log("\n" + "=".repeat(80));
  }
}

test().catch(console.error);
