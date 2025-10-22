import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    testTimeout: 30000, // 30s timeout for 3-pass pipeline
    hookTimeout: 10000,
    teardownTimeout: 10000,
    maxConcurrency: 100, // Ultra-aggressive parallelization with Vertex AI DSQ (no quotas)
    exclude: ['**/node_modules/**', '**/lib/**', '**/dist/**'],
    env: {
      // Required for local test execution
      FIREGEN_REGION: 'us-central1',
      // FIREGEN_STORAGE_BUCKET is auto-resolved from gcloud CLI
    },
  },
  resolve: {
    alias: {
      // Support .js imports in TypeScript (NodeNext module resolution)
    },
  },
});
