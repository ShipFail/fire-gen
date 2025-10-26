// functions/src/ai-request-analyzer-v2/index.ts

/**
 * AI Request Analyzer V2
 *
 * Architecture:
 * Pre-process → Step 1 (Model Selection) → Step 2 (Parameter Inference) → Step 3 (JSON Generation) → Post-process
 *
 * - Pre-process: URL extraction (deterministic)
 * - Step 1: AI selects model → {model, reasons}
 * - Step 2: AI infers parameters → reasons[]
 * - Step 3: AI generates JSON with schema → JSON
 * - Post-process: Validation + URL restoration
 */

export {analyzePrompt} from "./orchestrator.js";
export type {AnalyzeResult} from "./orchestrator.js";
