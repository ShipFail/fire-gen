#!/usr/bin/env node
import { execSync } from "node:child_process";
import { cpSync, rmSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const extensionDir = resolve(__dirname, "../extension");
const functionsDir = resolve(extensionDir, "functions");
const outputDir = process.argv[2] ? resolve(process.argv[2]) : null;

const run = (command, cwd) => {
  execSync(command, { cwd, stdio: "inherit" });
};

run("npm install", functionsDir);
run("npm run build", functionsDir);

if (outputDir) {
  rmSync(outputDir, { recursive: true, force: true });
  cpSync(extensionDir, outputDir, { recursive: true });
  console.log(`Extension synchronized to ${outputDir}`);
}
