import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import ts from "typescript";

async function loadTypeScriptModule(relativePath, outputName) {
  const sourcePath = path.join(process.cwd(), relativePath);
  const source = fs.readFileSync(sourcePath, "utf8");
  const output = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.ES2022,
      target: ts.ScriptTarget.ES2022,
    },
  }).outputText;
  const outputPath = path.join(os.tmpdir(), outputName);
  fs.writeFileSync(outputPath, output);
  return import(`${pathToFileURL(outputPath).href}?v=${Date.now()}`);
}

const contextModule = await loadTypeScriptModule(
  "src/lib/chat-context.ts",
  "fusheng-chat-context-test.mjs",
);

const messages = [
  {
    id: "opening",
    role: "assistant",
    content: "你好，我是浮生",
    createdAt: "2026-08-03T00:00:00.000Z",
  },
];
for (let index = 1; index <= 9; index += 1) {
  messages.push({
    id: String(index),
    role: index % 2 === 1 ? "user" : "assistant",
    content: `消息${index}`,
    createdAt: "2026-08-03T00:00:00.000Z",
  });
}

const contextResult = contextModule.prepareThreadContext(
  {
    id: "thread-test",
    title: "测试会话",
    messages,
    createdAt: "2026-08-03T00:00:00.000Z",
    updatedAt: "2026-08-03T00:00:00.000Z",
    summary: "",
    summarizedMessageCount: 0,
  },
  8,
);

if (
  contextResult.contextMessageCount !== 9 ||
  contextResult.summarizedMessageCount !== 1 ||
  contextResult.recentHistory.length !== 8
) {
  throw new Error("上下文窗口测试失败：预期9条有效消息拆分为1条摘要和8条近期消息。 ");
}

const guardModule = await loadTypeScriptModule(
  "src/lib/server-guard.ts",
  "fusheng-server-guard-test.mjs",
);
const request = new Request("http://localhost/test", {
  headers: { "x-forwarded-for": "203.0.113.7" },
});

if (!guardModule.checkRateLimit(request, "test", { limit: 2, windowMs: 60_000 }).allowed) {
  throw new Error("限流测试失败：第一次请求被错误拦截。 ");
}
if (!guardModule.checkRateLimit(request, "test", { limit: 2, windowMs: 60_000 }).allowed) {
  throw new Error("限流测试失败：第二次请求被错误拦截。 ");
}
if (guardModule.checkRateLimit(request, "test", { limit: 2, windowMs: 60_000 }).allowed) {
  throw new Error("限流测试失败：超限请求未被拦截。 ");
}

guardModule.setCachedValue("test-cache", { ok: true }, 1_000);
if (guardModule.getCachedValue("test-cache")?.ok !== true) {
  throw new Error("缓存测试失败。 ");
}

console.log("Pure tests passed: context memory, rate limiting, and cache.");
