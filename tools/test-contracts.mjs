import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const seed = JSON.parse(readFileSync(join(root, "apps/web/data/seed-data.json"), "utf8"));

const contractFiles = {
  tickets: "ticket.schema.json",
  knowledgeArticles: "article.schema.json",
  auditEvents: "audit-event.schema.json"
};

function validate(schema, value, path = "$") {
  const issues = [];

  if (schema.type === "object") {
    if (!value || typeof value !== "object" || Array.isArray(value)) {
      return [`${path} must be an object`];
    }
    for (const key of schema.required ?? []) {
      if (!(key in value)) {
        issues.push(`${path}.${key} is required`);
      }
    }
    if (schema.additionalProperties === false) {
      const allowed = new Set(Object.keys(schema.properties ?? {}));
      for (const key of Object.keys(value)) {
        if (!allowed.has(key)) {
          issues.push(`${path}.${key} is not allowed`);
        }
      }
    }
    for (const [key, childSchema] of Object.entries(schema.properties ?? {})) {
      if (key in value) {
        issues.push(...validate(childSchema, value[key], `${path}.${key}`));
      }
    }
  }

  if (schema.type === "array") {
    if (!Array.isArray(value)) {
      return [`${path} must be an array`];
    }
    if (schema.minItems && value.length < schema.minItems) {
      issues.push(`${path} must include at least ${schema.minItems} item(s)`);
    }
    value.forEach((item, index) => issues.push(...validate(schema.items, item, `${path}[${index}]`)));
  }

  if (schema.type === "string") {
    if (typeof value !== "string") {
      issues.push(`${path} must be a string`);
    } else {
      if (schema.minLength && value.length < schema.minLength) {
        issues.push(`${path} is too short`);
      }
      if (schema.enum && !schema.enum.includes(value)) {
        issues.push(`${path} must be one of ${schema.enum.join(", ")}`);
      }
      if (schema.pattern && !new RegExp(schema.pattern).test(value)) {
        issues.push(`${path} does not match ${schema.pattern}`);
      }
      if (schema.format === "date" && Number.isNaN(Date.parse(`${value}T00:00:00Z`))) {
        issues.push(`${path} must be a date`);
      }
      if (schema.format === "date-time" && Number.isNaN(Date.parse(value))) {
        issues.push(`${path} must be a date-time`);
      }
    }
  }

  if (schema.type === "number") {
    if (typeof value !== "number") {
      issues.push(`${path} must be a number`);
    }
    if (typeof schema.minimum === "number" && value < schema.minimum) {
      issues.push(`${path} must be >= ${schema.minimum}`);
    }
    if (typeof schema.maximum === "number" && value > schema.maximum) {
      issues.push(`${path} must be <= ${schema.maximum}`);
    }
  }

  if (schema.type === "boolean" && typeof value !== "boolean") {
    issues.push(`${path} must be a boolean`);
  }

  return issues;
}

const issues = [];
for (const [collection, file] of Object.entries(contractFiles)) {
  const schema = JSON.parse(readFileSync(join(root, "packages/shared/contracts", file), "utf8"));
  seed[collection].forEach((item, index) => {
    issues.push(...validate(schema, item, `${collection}[${index}]`));
  });
}

const ticketIds = new Set(seed.tickets.map((ticket) => ticket.id));
for (const event of seed.auditEvents) {
  if (!ticketIds.has(event.targetId)) {
    issues.push(`audit event ${event.id} references unknown target ${event.targetId}`);
  }
}

if (issues.length) {
  console.error(issues.join("\n"));
  process.exit(1);
}

console.log("Contract tests passed.");
