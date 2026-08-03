import fs from "node:fs";
import path from "node:path";
import ts from "typescript";

const root = process.cwd();
const extensions = new Set([".ts", ".tsx"]);
const ignored = new Set(["node_modules", ".next", "out"]);
const files = [];

function visit(directory) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    if (ignored.has(entry.name)) continue;
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) visit(fullPath);
    else if (extensions.has(path.extname(entry.name))) files.push(fullPath);
  }
}

visit(path.join(root, "src"));
visit(path.join(root, "scripts"));

let errorCount = 0;
for (const file of files) {
  const source = fs.readFileSync(file, "utf8");
  const kind = file.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS;
  const parsed = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true, kind);
  for (const diagnostic of parsed.parseDiagnostics) {
    errorCount += 1;
    const position = diagnostic.start
      ? parsed.getLineAndCharacterOfPosition(diagnostic.start)
      : { line: 0, character: 0 };
    const message = ts.flattenDiagnosticMessageText(diagnostic.messageText, "\n");
    console.error(
      `${path.relative(root, file)}:${position.line + 1}:${position.character + 1} ${message}`,
    );
  }
}

if (errorCount > 0) {
  console.error(`\nSyntax check failed with ${errorCount} error(s).`);
  process.exit(1);
}

console.log(`Syntax check passed: ${files.length} TypeScript/TSX files.`);
