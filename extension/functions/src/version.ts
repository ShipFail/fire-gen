// functions/src/version.ts

/**
 * Version utility for FireGen extension.
 *
 * Single Source of Truth: extension/extension.yaml
 * This module reads the version from extension.yaml at runtime and caches it.
 * The version is included in job metadata for tracking and debugging.
 */

import {readFileSync} from "fs";
import {join} from "path";

let cachedVersion: string | null = null;

/**
 * Get the FireGen extension version from extension.yaml.
 * Version is cached after first read for performance.
 *
 * @returns Version string (e.g., "0.1.0") or "unknown" if unable to read
 */
export function getFireGenVersion(): string {
  if (cachedVersion) {
    return cachedVersion;
  }

  try {
    // Path from compiled JS location (lib/) to extension.yaml
    const yamlPath = join(__dirname, "../../extension.yaml");
    const content = readFileSync(yamlPath, "utf8");

    // Simple regex parsing to avoid yaml dependency
    // Matches: version: 0.1.0
    const versionMatch = content.match(/^version:\s*(.+)$/m);

    if (versionMatch && versionMatch[1]) {
      cachedVersion = versionMatch[1].trim();
    } else {
      console.warn("Could not parse version from extension.yaml");
      cachedVersion = "unknown";
    }
  } catch (error) {
    console.error("Failed to read FireGen version:", error);
    cachedVersion = "unknown";
  }

  return cachedVersion;
}
