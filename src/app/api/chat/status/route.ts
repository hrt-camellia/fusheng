import { NextResponse } from "next/server";
import {
  inspectDeepSeek,
  inspectOllama,
  normalizeProvider,
} from "@/lib/ai-provider";
import { checkRateLimit } from "@/lib/server-guard";

export async function GET() {
  return NextResponse.json({
    configured: false,
    connected: false,
    message: "请通过 POST 提交当前 AI 设置进行连接检查",
  });
}

export async function POST(req: Request) {
  const rate = checkRateLimit(req, "chat-status", { limit: 8, windowMs: 60_000 });
  if (!rate.allowed) {
    return NextResponse.json(
      { connected: false, message: "连接测试过于频繁，请稍后再试。" },
      { status: 429, headers: { "Retry-After": String(rate.retryAfterSeconds) } },
    );
  }

  try {
    const body = (await req.json()) as Record<string, unknown>;
    const provider = normalizeProvider(body.provider);

    if (provider === "context_debug") {
      return NextResponse.json({
        connected: true,
        provider,
        model: "context-debug",
        availableModels: ["context-debug"],
        message: "上下文调试已就绪：不会调用模型，也不会产生 Token 费用",
      });
    }

    if (provider === "deepseek_byok") {
      const model = String(body.model || "deepseek-v4-flash").trim();
      const apiKey = req.headers.get("x-fusheng-deepseek-key") || "";
      const inspection = await inspectDeepSeek(apiKey, model);

      return NextResponse.json({
        connected: inspection.modelExists,
        provider,
        model,
        availableModels: inspection.models,
        message: inspection.modelExists
          ? "你的 DeepSeek API Key 已通过验证"
          : `API Key 有效，但当前账号未返回模型 ${model}`,
      });
    }

    const model = String(body.model || "qwen3:8b").trim();
    const baseUrl = String(body.ollamaBaseUrl || "http://127.0.0.1:11434").trim();
    const inspection = await inspectOllama(baseUrl, model);

    return NextResponse.json({
      connected: inspection.modelExists,
      provider,
      model,
      availableModels: inspection.models,
      message: inspection.modelExists
        ? "本机 Ollama 已连接，所选模型已预热并保持加载20分钟"
        : inspection.models.length
          ? `Ollama 已连接，但尚未安装 ${model}`
          : "Ollama 已连接，但当前没有可用模型",
    });
  } catch (error) {
    return NextResponse.json(
      {
        connected: false,
        message: error instanceof Error ? error.message : "连接检查失败",
      },
      { status: 200 },
    );
  }
}
