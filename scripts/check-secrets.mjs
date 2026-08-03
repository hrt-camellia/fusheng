import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const ignoredNames = new Set([
  ".git",
  ".next",
  "node_modules",
  "out",
  "package-lock.json",
]);
const textExtensions = new Set([
  ".ts",
  ".tsx",
  ".js",
  ".mjs",
  ".json",
  ".md",
  ".sql",
  ".yml",
  ".yaml",
  ".example",
  "",
]);
const patterns = [
  { name: "DeepSeek/OpenAI-style secret", regex: /\bsk-[A-Za-z0-9_-]{16,}\b/g },
  { name: "Supabase secret key", regex: /\bsb_(?:secret|service_role)_[A-Za-z0-9_-]{12,}\b/g },
  { name: "JWT-like service token", regex: /\beyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}\b/g },
  {
    name: "Assigned non-placeholder private environment variable",
    regex: /^(?:AMAP_WEB_SERVICE_KEY|DEEPSEEK_API_KEY|SUPABASE_SERVICE_ROLE_KEY)[ \t]*=[ \t]*(?!$|YOUR_|你的|<)[^\s#]+/gm,
  },
];
const findings = [];

function visit(directory) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    if (ignoredNames.has(entry.name)) continue;
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      visit(fullPath);
      continue;
    }

    const ext = path.extname(entry.name);
    if (!textExtensions.has(ext)) continue;
    const stat = fs.statSync(fullPath);
    if (stat.size > 2_000_000) continue;

    const content = fs.readFileSync(fullPath, "utf8");
    for (const pattern of patterns) {
      pattern.regex.lastIndex = 0;
      for (const match of content.matchAll(pattern.regex)) {
        const before = content.slice(0, match.index ?? 0);
        const line = before.split("\n").length;
        findings.push({ file: path.relative(root, fullPath), line, name: pattern.name });
      }
    }
  }
}

visit(root);

if (findings.length > 0) {
  console.error("Potential secrets detected:");
  for (const finding of findings) {
    console.error(`- ${finding.file}:${finding.line} (${finding.name})`);
  }
  process.exit(1);
}

console.log("Secret scan passed: no obvious private keys were found.");
