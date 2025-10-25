// functions/src/version.ts

/**
 * Version utility for FireGen extension.
 *
 * Single Source of Truth: extension/extension.yaml
 * Version is injected at build time (see scripts/inject-version.ts)
 * and embedded as a constant for zero runtime overhead.
 */

import {FIREGEN_VERSION} from "./generated/version.js";

/**
 * Get the FireGen extension version.
 * Version is read from extension.yaml at build time and embedded as a constant.
 *
 * @returns Version string (e.g., "0.1.0")
 */
export function getFireGenVersion(): string {
  return FIREGEN_VERSION;
}

