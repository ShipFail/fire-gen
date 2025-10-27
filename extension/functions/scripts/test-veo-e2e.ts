#!/usr/bin/env npx tsx
/**
 * End-to-end test for Veo video generation
 *
 * This script:
 * 1. Initiates a Veo video generation job
 * 2. Polls the operation status using fetchPredictOperation
 * 3. Downloads the generated video to local filesystem
 * 4. Verifies the fix for publisher model operation polling
 */

import * as fs from "fs";
import * as path from "path";
import {predictLongRunning, getOperation} from "../src/lib/vertex-ai-client.js";

const OUTPUT_DIR = "/tmp/firegen-test";

// gRPC error codes: https://grpc.github.io/grpc/core/md_doc_statuscodes.html
const GRPC_ERROR_CODES: Record<number, string> = {
  0: "OK",
  1: "CANCELLED",
  2: "UNKNOWN",
  3: "INVALID_ARGUMENT",
  4: "DEADLINE_EXCEEDED",
  5: "NOT_FOUND",  // The blob has been deleted
  6: "ALREADY_EXISTS",
  7: "PERMISSION_DENIED",
  8: "RESOURCE_EXHAUSTED",
  9: "FAILED_PRECONDITION",
  10: "ABORTED",
  11: "OUT_OF_RANGE",
  12: "UNIMPLEMENTED",
  13: "INTERNAL",
  14: "UNAVAILABLE",
  15: "DATA_LOSS",
  16: "UNAUTHENTICATED",
};

function getErrorCodeName(code: number): string {
  return GRPC_ERROR_CODES[code] || `UNKNOWN_CODE_${code}`;
}

async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function downloadVideo(gcsUri: string, outputPath: string): Promise<void> {
  console.log(`📥 Downloading video from ${gcsUri}...`);

  // Extract bucket and path from gs:// URI
  const match = gcsUri.match(/^gs:\/\/([^/]+)\/(.+)$/);
  if (!match) {
    throw new Error(`Invalid GCS URI: ${gcsUri}`);
  }

  const [, bucket, filePath] = match;

  // Download using gcloud (requires authentication)
  const {execSync} = await import("child_process");
  execSync(`gsutil cp gs://${bucket}/${filePath} ${outputPath}`, {stdio: "inherit"});

  const stats = fs.statSync(outputPath);
  console.log(`✅ Downloaded ${stats.size} bytes to ${outputPath}`);
}

async function main() {
  console.log("🎬 Starting Veo E2E Test\n");

  // Ensure output directory exists
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, {recursive: true});
  }

  // Step 1: Start video generation job
  console.log("📤 Starting video generation job...");

  // Get project ID from environment or gcloud config
  const {execSync} = await import("child_process");
  let projectId: string;
  try {
    projectId = execSync("gcloud config get-value project", {encoding: "utf-8"}).trim();
    console.log(`Using project: ${projectId}`);
  } catch (error) {
    console.error("⚠️  Could not get project ID from gcloud config");
    projectId = "unknown";
  }

  // Use production Firebase Storage bucket to prevent auto-deletion
  const storageUri = `gs://${projectId}.firebasestorage.app`;
  console.log(`Output GCS URI: ${storageUri}`);
  console.log(`⚠️  Note: Make sure this bucket exists or videos will be stored in default location\n`);

  const operation = await predictLongRunning("veo-3.1-fast-generate-preview", {
    instances: [
      {
        prompt: "A simple animation of clouds moving across a blue sky",
      },
    ],
    parameters: {
      durationSeconds: 4,  // Minimum duration for fastest generation
      aspectRatio: "16:9",
      personGeneration: "dont_allow",
      sampleCount: 1,
      storageUri: storageUri,  // Specify output bucket to prevent auto-deletion
    },
  });

  console.log(`✅ Job started: ${operation.name}\n`);
  console.log(`Operation name: ${operation.name}`);
  console.log(`Done: ${operation.done}`);
  console.log(`Metadata:`, operation.metadata);
  console.log();

  // Step 2: Poll operation status
  console.log("⏳ Polling operation status...");
  let currentOperation = operation;
  let pollCount = 0;
  const maxPolls = 120; // 120 polls * 10s = 20 minutes max
  const pollInterval = 3000; // 10 seconds

  while (!currentOperation.done && pollCount < maxPolls) {
    pollCount++;
    console.log(`   Poll #${pollCount}/${maxPolls} - Waiting 10s...`);
    await sleep(pollInterval);

    try {
      currentOperation = await getOperation(operation.name);
      console.log(`   Status: done=${currentOperation.done}`);

      // Log the full operation object for debugging
      if (currentOperation.done) {
        console.log("\n📋 Full operation object:");
        console.log(JSON.stringify(currentOperation, null, 2));
      }

      if (currentOperation.error) {
        console.error("\n❌ Operation failed with error:");
        console.error(`Error code: ${currentOperation.error.code} (${getErrorCodeName(currentOperation.error.code)})`);
        console.error("Error message:", currentOperation.error.message);

        if (currentOperation.error.code === 5) {
          console.error("\n🔍 NOT_FOUND Error Analysis:");
          console.error("This typically means:");
          console.error("1. The video generation failed and no output was produced");
          console.error("2. Or the output was in a temporary location that was cleaned up");
          console.error("3. Or there was a permission issue accessing the output");
          console.error("\nSuggested fix: Specify a custom GCS bucket via storageUri parameter");
        }

        console.error("\nError details:", JSON.stringify(currentOperation.error.details, null, 2));
        console.error("\n📋 Full operation object:");
        console.error(JSON.stringify(currentOperation, null, 2));
        process.exit(1);
      }
    } catch (error) {
      console.error(`   ⚠️  Poll error:`, error);
      // Continue polling on transient errors
    }
  }

  if (!currentOperation.done) {
    console.error("❌ Timeout: Operation did not complete within 20 minutes");
    process.exit(1);
  }

  console.log("\n✅ Operation completed successfully!");
  console.log("\n📋 Full response object:");
  console.log(JSON.stringify(currentOperation.response, null, 2));

  // Step 3: Download generated video
  const response = currentOperation.response as any;

  console.log("\n📦 Parsing response structure...");
  console.log("Response keys:", Object.keys(response || {}));

  // Veo 3.1 uses response.videos[] instead of response.predictions[]
  const videos = response?.videos || [];
  console.log(`Found ${videos.length} video(s)`);

  if (videos.length === 0) {
    console.error("\n❌ No videos in response");
    console.error("Full response:", JSON.stringify(response, null, 2));
    process.exit(1);
  }

  const video = videos[0];
  console.log("\n📋 First video structure:");
  console.log("Video keys:", Object.keys(video || {}));
  console.log("Full video:", JSON.stringify(video, null, 2));

  const videoUri = video?.gcsUri;

  if (!videoUri) {
    console.error("\n❌ No video URI in video object");
    console.error("Looking for: videos[0].gcsUri");
    console.error("Video object:", video);
    process.exit(1);
  }

  console.log(`\n📍 Video URI: ${videoUri}`);
  const outputPath = path.join(OUTPUT_DIR, `veo-test-${Date.now()}.mp4`);

  try {
    await downloadVideo(videoUri, outputPath);
  } catch (downloadError) {
    console.error("\n❌ Download failed:", downloadError);
    console.error("\nThis might be a GCS access issue. Checking:");
    console.error("1. Does your account have access to the bucket?");
    console.error("2. Has the video been cleaned up already?");
    console.error("3. Is gsutil configured correctly?");
    throw downloadError;
  }

  // Step 4: Verify file
  const stats = fs.statSync(outputPath);
  console.log("\n🎉 Test completed successfully!");
  console.log(`   Video file: ${outputPath}`);
  console.log(`   File size: ${(stats.size / 1024 / 1024).toFixed(2)} MB`);
  console.log(`   Total polls: ${pollCount}`);
  console.log(`   Total time: ${((pollCount * pollInterval) / 1000 / 60).toFixed(1)} minutes`);
}

main().catch((error) => {
  console.error("\n❌ Test failed:", error);
  process.exit(1);
});
