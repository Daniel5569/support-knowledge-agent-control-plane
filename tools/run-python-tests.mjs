import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const candidates = process.env.PYTHON ? [process.env.PYTHON] : ["python", "py"];

let lastError = null;
for (const python of candidates) {
  const args = python === "py"
    ? ["-3", "-m", "unittest", "discover", "-s", "services/agent/tests"]
    : ["-m", "unittest", "discover", "-s", "services/agent/tests"];
  const result = spawnSync(python, args, { cwd: root, stdio: "inherit" });
  if (result.status === 0) {
    console.log("Python agent tests passed.");
    process.exit(0);
  }
  lastError = result.error;
}

console.error(`Python tests failed${lastError ? `: ${lastError.message}` : "."}`);
process.exit(1);
