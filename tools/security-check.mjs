import { readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, extname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const skipDirs = new Set([".git", "node_modules", ".next", "__pycache__", ".pytest_cache", "coverage", "dist", "build"]);
const scanExtensions = new Set([".ts", ".tsx", ".js", ".mjs", ".json", ".md", ".py", ".yml", ".yaml", ".example", ""]);
const patterns = [
  { name: "OpenAI key", regex: /sk-[A-Za-z0-9_-]{20,}/ },
  { name: "GitHub token", regex: /gh[pousr]_[A-Za-z0-9_]{20,}/ },
  { name: "AWS access key", regex: /AKIA[0-9A-Z]{16}/ },
  { name: "Private key", regex: /-----BEGIN (RSA |EC |OPENSSH |)PRIVATE KEY-----/ },
  { name: "Password assignment", regex: /\b(password|passwd|pwd)\s*[:=]\s*["'][^"']{8,}["']/i },
  { name: "Secret assignment", regex: /\b(secret|api[_-]?key|token)\s*[:=]\s*["'][^"']{12,}["']/i },
  { name: "Local personal path", regex: /C:\\Users\\Daniel\\Desktop/i }
];

function walk(dir, files = []) {
  for (const name of readdirSync(dir)) {
    if (skipDirs.has(name)) {
      continue;
    }
    const path = join(dir, name);
    const stat = statSync(path);
    if (stat.isDirectory()) {
      walk(path, files);
    } else {
      files.push(path);
    }
  }
  return files;
}

const findings = [];
for (const file of walk(root)) {
  const rel = relative(root, file);
  const ext = extname(file);
  if (!scanExtensions.has(ext) && !rel.endsWith(".env.example")) {
    continue;
  }
  const text = readFileSync(file, "utf8");
  patterns.forEach((pattern) => {
    if (pattern.regex.test(text)) {
      findings.push(`${rel}: ${pattern.name}`);
    }
  });
}

if (findings.length) {
  console.error(`Potential publish blockers found:\n${findings.map((item) => `- ${item}`).join("\n")}`);
  process.exit(1);
}

console.log("Security check passed: no secret-like values or local personal paths found.");
