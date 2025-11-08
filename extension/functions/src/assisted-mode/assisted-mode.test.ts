// functions/src/assisted-mode/prompts.test.ts
import { describe, test, expect } from "vitest";
import { assistedRequest } from "./index.js";

import { fixtures } from "./assisted-mode.fixtures.js"

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

describe("Assisted Mode", () => {
  test.concurrent.each(fixtures)(
    "$id: $prompt",
    async ({ id, prompt, expected }) => {
      const analyzed = await assistedRequest(prompt, `test-${id}`);

      console.log(analyzed.reasons)
      console.log("ACTUAL:", JSON.stringify(analyzed.request, null, 2));
      console.log("EXPECTED:", JSON.stringify(expected, null, 2));
      console.log(`\n` + `prompt> ` + prompt + `\n`);

      // Verify request structure matches expected
      expect(analyzed.request).toMatchObject(expected);

      // Verify reasons array exists and has content
      expect(analyzed.reasons).toBeInstanceOf(Array);
      expect(analyzed.reasons.length).toBeGreaterThan(0);
    },
    15_000  // 10s timeout for 2-step pipeline with Pro model + retry buffer
  );

});
