import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const result = spawnSync("docker", ["compose", "config"], {
  cwd: root,
  stdio: "inherit"
});

if (result.status !== 0) {
  console.error("Docker Compose config validation failed.");
  process.exit(result.status ?? 1);
}

console.log("Docker Compose config is valid.");
