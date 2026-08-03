import type { AiProvider, OllamaSpeedMode } from "@/types/ai";

export interface ProviderChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface ProviderCallInput {
  provider: AiProvider;
  messages: ProviderChatMessage[];
  model: string;
  ollamaBaseUrl?: string;
  ollamaSpeedMode?: OllamaSpeedMode;
  deepseekApiKey?: string;
}

export interface ProviderCallResult {
  answer: string;
  usage?: {
    promptTokens?: number;
    completionTokens?: number;
    totalTokens?: number;
  };
}

export function normalizeProvider(value: unknown): AiProvider {
  if (value === "deepseek_byok") return "deepseek_byok";
  if (value === "context_debug") return "context_debug";
  return "ollama";
}

export function validateOllamaBaseUrl(value: string) {
  const raw = (value || "http://127.0.0.1:11434").trim().replace(/\/$/, "");
  let url: URL;

  try {
    url = new URL(raw);
  } catch {
    throw new Error("Ollama 地址格式不正确");
  }

  const allowedHosts = new Set(["127.0.0.1", "localhost", "::1", "[::1]"]);
  if (url.protocol !== "http:" || !allowedHosts.has(url.hostname)) {
    throw new Error("测试版仅允许连接本机 Ollama：127.0.0.1 或 localhost");
  }

  if (url.username || url.password || url.search || url.hash) {
    throw new Error("Ollama 地址不能包含账号、查询参数或片段");
  }

  return raw;
}

async function readError(response: Response) {
  const text = await response.text();
  return text.slice(0, 800) || response.statusText;
}

function timeoutMessage(provider: "Ollama" | "DeepSeek") {
  return provider === "Ollama"
    ? "本地模型启动或生成时间过长。请确认 Ollama 正在运行，等待模型加载后重试，或换用更轻量的模型。"
    : "DeepSeek 响应超时，请检查网络后重试。";
}

export function friendlyProviderError(error: unknown) {
  if (!(error instanceof Error)) return "AI 服务暂时不可用，请稍后再试。";

  const text = error.message.toLowerCase();
  if (
    error.name === "TimeoutError" ||
    error.name === "AbortError" ||
    text.includes("timeout") ||
    text.includes("aborted")
  ) {
    return text.includes("deepseek")
      ? "DeepSeek 响应超时，请检查网络后重试。"
      : "本地模型响应较慢，等待时间已超过上限。可以重试一次，或在 AI 设置中切换更轻量的模型。";
  }

  if (
    text.includes("fetch failed") ||
    text.includes("econnrefused") ||
    text.includes("failed to fetch")
  ) {
    return "无法连接模型服务。请确认 Ollama 已启动，并在 AI 设置中重新测试连接。";
  }

  return error.message || "AI 服务暂时不可用，请稍后再试。";
}

export async function createOllamaTextStream(
  messages: ProviderChatMessage[],
  model: string,
  baseUrl: string,
  speedMode: OllamaSpeedMode = "fast",
) {
  const safeBaseUrl = validateOllamaBaseUrl(baseUrl);
  const selectedModel = model.trim();
  if (!selectedModel) throw new Error("请先选择一个本地 Ollama 模型");

  let response: Response;
  try {
    response = await fetch(`${safeBaseUrl}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: selectedModel,
        messages,
        stream: true,
        think: false,
        keep_alive: "20m",
        options:
          speedMode === "fast"
            ? {
                temperature: 0.45,
                num_predict: 320,
                num_ctx: 2048,
              }
            : {
                temperature: 0.6,
                num_predict: 600,
                num_ctx: 4096,
              },
      }),
      cache: "no-store",
      signal: AbortSignal.timeout(speedMode === "fast" ? 180_000 : 300_000),
    });
  } catch (error) {
    if (
      error instanceof Error &&
      (error.name === "TimeoutError" || error.name === "AbortError")
    ) {
      throw new Error(timeoutMessage("Ollama"));
    }
    throw error;
  }

  if (!response.ok) {
    throw new Error(`Ollama ${response.status}: ${await readError(response)}`);
  }
  if (!response.body) throw new Error("Ollama 未返回可读取的数据流");

  const upstreamReader = response.body.getReader();
  const decoder = new TextDecoder();
  const encoder = new TextEncoder();

  return new ReadableStream<Uint8Array>({
    async start(controller) {
      let buffer = "";

      try {
        while (true) {
          const { done, value } = await upstreamReader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() || "";

          for (const line of lines) {
            if (!line.trim()) continue;
            const item = JSON.parse(line) as {
              message?: { content?: string | null };
              error?: string;
            };
            if (item.error) throw new Error(item.error);
            const content = item.message?.content;
            if (content) controller.enqueue(encoder.encode(content));
          }
        }

        if (buffer.trim()) {
          const item = JSON.parse(buffer) as {
            message?: { content?: string | null };
            error?: string;
          };
          if (item.error) throw new Error(item.error);
          if (item.message?.content) controller.enqueue(encoder.encode(item.message.content));
        }

        controller.close();
      } catch (error) {
        controller.error(error);
      } finally {
        upstreamReader.releaseLock();
      }
    },
    async cancel() {
      await upstreamReader.cancel();
    },
  });
}

export async function createDeepSeekTextStream(
  messages: ProviderChatMessage[],
  model: string,
  apiKey: string,
) {
  const key = apiKey.trim();
  if (!key) throw new Error("请先在 AI 设置中填写你自己的 DeepSeek API Key");

  const selectedModel = model.trim() || "deepseek-v4-flash";
  let response: Response;
  try {
    response = await fetch("https://api.deepseek.com/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify({
        model: selectedModel,
        messages,
        stream: true,
        thinking: { type: "disabled" },
        temperature: 0.6,
        max_tokens: 700,
      }),
      cache: "no-store",
      signal: AbortSignal.timeout(120_000),
    });
  } catch (error) {
    if (
      error instanceof Error &&
      (error.name === "TimeoutError" || error.name === "AbortError")
    ) {
      throw new Error(timeoutMessage("DeepSeek"));
    }
    throw error;
  }

  if (!response.ok) {
    throw new Error(`DeepSeek ${response.status}: ${await readError(response)}`);
  }
  if (!response.body) throw new Error("DeepSeek 未返回可读取的数据流");

  const upstreamReader = response.body.getReader();
  const decoder = new TextDecoder();
  const encoder = new TextEncoder();

  return new ReadableStream<Uint8Array>({
    async start(controller) {
      let buffer = "";

      try {
        while (true) {
          const { done, value } = await upstreamReader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() || "";

          for (const rawLine of lines) {
            const line = rawLine.trim();
            if (!line.startsWith("data:")) continue;
            const payload = line.slice(5).trim();
            if (!payload || payload === "[DONE]") continue;

            const item = JSON.parse(payload) as {
              choices?: Array<{ delta?: { content?: string | null } }>;
              error?: { message?: string };
            };
            if (item.error?.message) throw new Error(item.error.message);
            const content = item.choices?.[0]?.delta?.content;
            if (content) controller.enqueue(encoder.encode(content));
          }
        }

        controller.close();
      } catch (error) {
        controller.error(error);
      } finally {
        upstreamReader.releaseLock();
      }
    },
    async cancel() {
      await upstreamReader.cancel();
    },
  });
}

export async function createAiTextStream(input: ProviderCallInput) {
  if (input.provider === "context_debug") {
    throw new Error("上下文调试模式应由本地调试路由直接处理");
  }
  if (input.provider === "deepseek_byok") {
    return createDeepSeekTextStream(
      input.messages,
      input.model || "deepseek-v4-flash",
      input.deepseekApiKey || "",
    );
  }

  return createOllamaTextStream(
    input.messages,
    input.model,
    input.ollamaBaseUrl || "http://127.0.0.1:11434",
    input.ollamaSpeedMode || "fast",
  );
}

/* 保留非流式调用，便于后续复用。 */
export async function callOllama(
  messages: ProviderChatMessage[],
  model: string,
  baseUrl: string,
): Promise<ProviderCallResult> {
  const safeBaseUrl = validateOllamaBaseUrl(baseUrl);
  const selectedModel = model.trim();
  if (!selectedModel) throw new Error("请先选择一个本地 Ollama 模型");

  const response = await fetch(`${safeBaseUrl}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: selectedModel,
      messages,
      stream: false,
      think: false,
      keep_alive: "10m",
      options: { temperature: 0.6, num_predict: 600, num_ctx: 4096 },
    }),
    cache: "no-store",
    signal: AbortSignal.timeout(300_000),
  });

  if (!response.ok) {
    throw new Error(`Ollama ${response.status}: ${await readError(response)}`);
  }

  const data = (await response.json()) as {
    message?: { content?: string | null };
    prompt_eval_count?: number;
    eval_count?: number;
  };
  const answer = data.message?.content?.trim();
  if (!answer) throw new Error("Ollama 未返回有效内容");

  return { answer };
}

export async function callDeepSeekByok(
  messages: ProviderChatMessage[],
  model: string,
  apiKey: string,
): Promise<ProviderCallResult> {
  const key = apiKey.trim();
  if (!key) throw new Error("请先在 AI 设置中填写你自己的 DeepSeek API Key");

  const response = await fetch("https://api.deepseek.com/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${key}`,
    },
    body: JSON.stringify({
      model: model.trim() || "deepseek-v4-flash",
      messages,
      thinking: { type: "disabled" },
      temperature: 0.6,
      max_tokens: 700,
    }),
    cache: "no-store",
    signal: AbortSignal.timeout(120_000),
  });

  if (!response.ok) {
    throw new Error(`DeepSeek ${response.status}: ${await readError(response)}`);
  }

  const data = (await response.json()) as {
    choices?: Array<{ message?: { content?: string | null } }>;
    usage?: {
      prompt_tokens?: number;
      completion_tokens?: number;
      total_tokens?: number;
    };
  };
  const answer = data.choices?.[0]?.message?.content?.trim();
  if (!answer) throw new Error("DeepSeek 未返回有效内容");

  return {
    answer,
    usage: data.usage
      ? {
          promptTokens: data.usage.prompt_tokens,
          completionTokens: data.usage.completion_tokens,
          totalTokens: data.usage.total_tokens,
        }
      : undefined,
  };
}

export async function callAiProvider(input: ProviderCallInput) {
  if (input.provider === "context_debug") {
    throw new Error("上下文调试模式不调用模型服务");
  }
  if (input.provider === "deepseek_byok") {
    return callDeepSeekByok(
      input.messages,
      input.model || "deepseek-v4-flash",
      input.deepseekApiKey || "",
    );
  }

  return callOllama(
    input.messages,
    input.model,
    input.ollamaBaseUrl || "http://127.0.0.1:11434",
  );
}

export async function inspectOllama(baseUrl: string, selectedModel: string) {
  const safeBaseUrl = validateOllamaBaseUrl(baseUrl);

  const [versionResponse, modelsResponse] = await Promise.all([
    fetch(`${safeBaseUrl}/api/version`, {
      cache: "no-store",
      signal: AbortSignal.timeout(8_000),
    }),
    fetch(`${safeBaseUrl}/api/tags`, {
      cache: "no-store",
      signal: AbortSignal.timeout(8_000),
    }),
  ]);

  if (!versionResponse.ok) {
    throw new Error(`Ollama 服务未响应：${versionResponse.status}`);
  }
  if (!modelsResponse.ok) {
    throw new Error(`无法读取 Ollama 模型列表：${modelsResponse.status}`);
  }

  const modelData = (await modelsResponse.json()) as {
    models?: Array<{ name?: string; model?: string }>;
  };

  const models = (modelData.models || [])
    .map((item) => String(item.name || item.model || "").trim())
    .filter(Boolean);
  const modelExists = models.includes(selectedModel);

  if (modelExists) {
    const warmupResponse = await fetch(`${safeBaseUrl}/api/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: selectedModel,
        prompt: "",
        stream: false,
        keep_alive: "20m",
      }),
      cache: "no-store",
      signal: AbortSignal.timeout(180_000),
    });

    if (!warmupResponse.ok) {
      throw new Error(`模型预热失败：${warmupResponse.status}`);
    }
  }

  return {
    models,
    modelExists,
  };
}

export async function inspectDeepSeek(apiKey: string, model: string) {
  const key = apiKey.trim();
  if (!key) throw new Error("尚未填写 DeepSeek API Key");

  const response = await fetch("https://api.deepseek.com/models", {
    headers: { Authorization: `Bearer ${key}` },
    cache: "no-store",
    signal: AbortSignal.timeout(15_000),
  });

  if (!response.ok) {
    throw new Error(`DeepSeek ${response.status}: ${await readError(response)}`);
  }

  const data = (await response.json()) as { data?: Array<{ id?: string }> };
  const models = (data.data || []).map((item) => String(item.id || "")).filter(Boolean);

  return {
    models,
    modelExists: models.length === 0 || models.includes(model),
  };
}
