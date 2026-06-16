import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

const requiredFiles = [
  "README.md",
  ".gitignore",
  ".env.example",
  "docker-compose.yml",
  "apps/web/app/page.tsx",
  "apps/web/components/Dashboard.tsx",
  "apps/web/data/seed-data.json",
  "services/agent/support_agent/drafting.py",
  "services/agent/tests/test_support_agent.py",
  "packages/shared/contracts/ticket.schema.json",
  "docs/SECURITY_REVIEW.md",
  "docs/ARCHITECTURE.md",
  "docs/RUNBOOK.md"
];

const generatedDirs = ["node_modules", ".npm-cache", ".next", "__pycache__", ".pytest_cache", "security-scans", "screenshots"];
const missing = requiredFiles.filter((file) => !existsSync(join(root, file)));

if (missing.length) {
  console.error(`Missing required files:\n${missing.map((file) => `- ${file}`).join("\n")}`);
  process.exit(1);
}

const gitignore = readFileSync(join(root, ".gitignore"), "utf8");
const missingIgnores = generatedDirs.filter((dir) => !gitignore.includes(`${dir}/`));

if (missingIgnores.length) {
  console.error(`Generated directories are not ignored:\n${missingIgnores.map((file) => `- ${file}/`).join("\n")}`);
  process.exit(1);
}

function walk(dir, issues = []) {
  for (const name of readdirSync(dir)) {
    if (name === ".git") {
      continue;
    }
    const path = join(dir, name);
    const rel = relative(root, path);
    const stat = statSync(path);
    if (stat.isDirectory()) {
      if (generatedDirs.includes(name)) {
        continue;
      }
      walk(path, issues);
    } else if (/\.(sqlite|db|tmp)$/i.test(name)) {
      issues.push(rel);
    }
  }
  return issues;
}

const forbidden = walk(root);
if (forbidden.length) {
  console.error(`Forbidden generated files found:\n${forbidden.map((file) => `- ${file}`).join("\n")}`);
  process.exit(1);
}

console.log("Repo shape is valid.");
