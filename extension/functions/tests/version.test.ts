// functions/tests/version.test.ts
import {describe, test, expect} from "vitest";
import {readFileSync} from "fs";
import {resolve} from "path";

describe("Version Consistency", () => {
  test("extension.yaml and package.json must have the same version", () => {
    // Read extension.yaml
    const extensionYamlPath = resolve(__dirname, "../../extension.yaml");
    const extensionYamlContent = readFileSync(extensionYamlPath, "utf-8");
    // Parse version from YAML (simple regex since we only need the version field)
    const versionMatch = extensionYamlContent.match(/^version:\s*(.+)$/m);
    if (!versionMatch) {
      throw new Error("Could not find version in extension.yaml");
    }
    const extensionVersion = versionMatch[1].trim();

    // Read package.json
    const packageJsonPath = resolve(__dirname, "../package.json");
    const packageJsonContent = readFileSync(packageJsonPath, "utf-8");
    const packageJson = JSON.parse(packageJsonContent);
    const packageVersion = packageJson.version;

    // Assert they match
    expect(extensionVersion).toBe(packageVersion);
    
    // Additional check: both should be valid semver format
    expect(extensionVersion).toMatch(/^\d+\.\d+\.\d+$/);
    expect(packageVersion).toMatch(/^\d+\.\d+\.\d+$/);
  });
});
