import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const full = process.argv.includes("--full");
const nextBin = join(root, "node_modules", "next", "dist", "bin", "next");

const steps = [
  ["repo shape", ["node", ["tools/lint-repo.mjs"]]],
  ["contract tests", ["node", ["tools/test-contracts.mjs"]]],
  ["agent tests", ["node", ["tools/run-python-tests.mjs"]]],
  ["security scan", ["node", ["tools/security-check.mjs"]]],
  ["compose config", ["node", ["tools/compose-check.mjs"]]]
];

if (full || existsSync(join(root, "node_modules", "next"))) {
  steps.push(["Next build", [process.execPath, [nextBin, "build", "apps/web"]]]);
  steps.push(["npm audit", ["node", ["tools/npm-audit.mjs"]]]);
} else {
  console.log("Skipping Next build and npm audit because node_modules is not installed. Run npm install, then npm run check again for full verification.");
}

for (const [label, [command, args]] of steps) {
  console.log(`\n> ${label}`);
  const result = spawnSync(command, args, { cwd: root, stdio: "inherit" });
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

console.log("\nAll available checks passed.");
