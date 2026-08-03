import fs from "node:fs";
import path from "node:path";
import ts from "typescript";

const root = process.cwd();
const srcRoot = path.join(root, "src");
const sourceFiles = [];
const ignored = new Set(["node_modules", ".next", "out"]);
const candidates = ["", ".ts", ".tsx", ".js", ".mjs", ".json"];

function visit(directory) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    if (ignored.has(entry.name)) continue;
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) visit(fullPath);
    else if ([".ts", ".tsx"].includes(path.extname(entry.name))) sourceFiles.push(fullPath);
  }
}

function existsAsModule(basePath) {
  for (const suffix of candidates) {
    if (fs.existsSync(`${basePath}${suffix}`) && fs.statSync(`${basePath}${suffix}`).isFile()) {
      return true;
    }
  }
  for (const name of ["index.ts", "index.tsx", "index.js", "index.mjs"]) {
    const candidate = path.join(basePath, name);
    if (fs.existsSync(candidate)) return true;
  }
  return false;
}

visit(srcRoot);
let errorCount = 0;

for (const file of sourceFiles) {
  const sourceText = fs.readFileSync(file, "utf8");
  const source = ts.createSourceFile(
    file,
    sourceText,
    ts.ScriptTarget.Latest,
    true,
    file.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
  );

  for (const statement of source.statements) {
    if (!ts.isImportDeclaration(statement) || !ts.isStringLiteral(statement.moduleSpecifier)) {
      continue;
    }
    const specifier = statement.moduleSpecifier.text;
    let target = null;
    if (specifier.startsWith("@/")) target = path.join(srcRoot, specifier.slice(2));
    else if (specifier.startsWith(".")) target = path.resolve(path.dirname(file), specifier);
    if (!target || existsAsModule(target)) continue;

    errorCount += 1;
    const position = source.getLineAndCharacterOfPosition(statement.moduleSpecifier.getStart(source));
    console.error(
      `${path.relative(root, file)}:${position.line + 1}:${position.character + 1} missing local import ${specifier}`,
    );
  }
}

if (errorCount > 0) {
  console.error(`\nLocal import check failed with ${errorCount} error(s).`);
  process.exit(1);
}

console.log(`Local import check passed: ${sourceFiles.length} source files.`);
