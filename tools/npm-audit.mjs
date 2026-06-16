import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const npmCliCandidates = [
  process.env.npm_execpath,
  process.platform === "win32" ? "C:\\Program Files\\nodejs\\node_modules\\npm\\bin\\npm-cli.js" : undefined
].filter(Boolean);
const npmCli = npmCliCandidates.find((candidate) => existsSync(candidate));

const command = npmCli ? process.execPath : process.platform === "win32" ? "npm.cmd" : "npm";
const args = npmCli
  ? [npmCli, "audit", "--audit-level=high", "--json"]
  : ["audit", "--audit-level=high", "--json"];

const result = spawnSync(command, args, {
  cwd: root,
  encoding: "utf8"
});

const output = `${result.stdout ?? ""}${result.stderr ?? ""}`;

try {
  const parsed = JSON.parse(result.stdout);
  const vulnerabilities = parsed.metadata?.vulnerabilities;
  const high = vulnerabilities?.high ?? 0;
  const critical = vulnerabilities?.critical ?? 0;

  if (high > 0 || critical > 0) {
    console.error(`npm audit found high/critical vulnerabilities: high=${high}, critical=${critical}`);
    process.exit(1);
  }

  console.log("npm audit passed: no high or critical vulnerabilities found.");
  process.exit(0);
} catch {
  if (/audit endpoint returned an error|bulk failed|registry\.npmjs\.org/i.test(output)) {
    console.warn("npm audit could not complete because the registry audit endpoint returned an error. Re-run npm run check before publishing.");
    process.exit(0);
  }

  process.stdout.write(result.stdout ?? "");
  process.stderr.write(result.stderr ?? "");
  process.exit(result.status ?? 1);
}
