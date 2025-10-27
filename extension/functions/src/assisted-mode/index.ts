// functions/src/assisted-mode/index.ts

/**
 * Assisted Mode - AI-Powered Prompt Analysis
 *
 * Converts natural language prompts into structured model requests with full reasoning transparency.
 *
 * Architecture:
 * Pre-process → Step 1 (Model Selection) → Step 2 (Parameter Inference) → Step 3 (JSON Generation) → Post-process
 *
 * - Pre-process: URL extraction (deterministic)
 * - Step 1: AI selects model → {model, reasons}
 * - Step 2: AI infers parameters → reasons[]
 * - Step 3: AI generates JSON with schema → JSON
 * - Post-process: Validation + URL restoration
 *
 * Used for RTDB jobs with `assisted.prompt` and `assisted.reasons` fields.
 */

export {analyzePrompt} from "./orchestrator.js";
export type {AnalyzeResult} from "./orchestrator.js";
