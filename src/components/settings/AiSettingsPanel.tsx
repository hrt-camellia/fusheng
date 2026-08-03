"use client";

import Link from "next/link";
import { useEffect, useState, type ChangeEvent } from "react";
import {
  Bug,
  CheckCircle2,
  Cloud,
  Eye,
  EyeOff,
  KeyRound,
  Laptop,
  LoaderCircle,
  MessageCircle,
  RefreshCw,
  Save,
  ShieldCheck,
  XCircle,
} from "lucide-react";
import {
  DEFAULT_AI_SETTINGS,
  readAiSettings,
  readSessionDeepSeekKey,
  writeAiSettings,
  writeSessionDeepSeekKey,
} from "@/lib/ai-settings";
import type { AiConnectionStatus, AiProvider, AiSettings } from "@/types/ai";

export function AiSettingsPanel() {
  const [settings, setSettings] = useState<AiSettings>(DEFAULT_AI_SETTINGS);
  const [apiKey, setApiKey] = useState("");
  const [showKey, setShowKey] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const [testing, setTesting] = useState(false);
  const [saved, setSaved] = useState(false);
  const [status, setStatus] = useState<AiConnectionStatus | null>(null);

  useEffect(() => {
    setSettings(readAiSettings());
    setApiKey(readSessionDeepSeekKey());
    setHydrated(true);
  }, []);

  function updateProvider(provider: AiProvider) {
    setSettings((current) => ({ ...current, provider }));
    setStatus(null);
    setSaved(false);
  }

  function saveSettings() {
    writeAiSettings(settings);
    writeSessionDeepSeekKey(apiKey);
    setSaved(true);
    window.setTimeout(() => setSaved(false), 1800);
  }

  async function testConnection() {
    setTesting(true);
    setStatus(null);
    saveSettings();

    try {
      const model =
        settings.provider === "ollama"
          ? settings.ollamaModel
          : settings.provider === "deepseek_byok"
            ? settings.deepseekModel
            : "context-debug";

      const response = await fetch("/api/chat/status", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(settings.provider === "deepseek_byok" && apiKey.trim()
            ? { "x-fusheng-deepseek-key": apiKey.trim() }
            : {}),
        },
        body: JSON.stringify({
          provider: settings.provider,
          model,
          ollamaBaseUrl: settings.ollamaBaseUrl,
        }),
      });

      const data = (await response.json()) as Partial<AiConnectionStatus>;
      setStatus({
        connected: Boolean(data.connected),
        provider: settings.provider,
        model,
        message: String(data.message || "连接检查完成"),
        availableModels: Array.isArray(data.availableModels)
          ? data.availableModels.map(String)
          : [],
      });
    } catch (error) {
      setStatus({
        connected: false,
        provider: settings.provider,
        model:
          settings.provider === "ollama"
            ? settings.ollamaModel
            : settings.provider === "deepseek_byok"
              ? settings.deepseekModel
              : "context-debug",
        message: error instanceof Error ? error.message : "连接检查失败",
      });
    } finally {
      setTesting(false);
    }
  }

  if (!hydrated) {
    return (
      <div className="card grid min-h-72 place-items-center">
        <LoaderCircle className="animate-spin text-brand-700" size={28} />
      </div>
    );
  }

  const models = status?.availableModels || [];

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <section className="card p-6 sm:p-8">
        <p className="eyebrow">模型连接方式</p>
        <h1 className="mt-3 font-serif text-4xl">AI 设置</h1>
        <p className="mt-4 max-w-3xl text-sm leading-7 text-muted">
          你可以使用上下文调试模式免费验收命盘注入、多会话隔离、长期摘要与近期消息窗口；
          也可以连接本机 Ollama，或临时使用自己的 DeepSeek API Key。登录后记录可同步到云端。
        </p>

        <div className="mt-7 grid gap-4 md:grid-cols-3">
          <button
            type="button"
            onClick={() => updateProvider("ollama")}
            className={`rounded-3xl border p-5 text-left transition ${
              settings.provider === "ollama"
                ? "border-brand-400 bg-brand-50 ring-2 ring-brand-100"
                : "border-brand-100 bg-white hover:bg-brand-50/60"
            }`}
          >
            <Laptop className="text-brand-700" size={25} />
            <h2 className="mt-4 text-lg font-semibold">本机 Ollama</h2>
            <p className="mt-2 text-sm leading-6 text-muted">
              使用你电脑的本地模型，不产生云端 Token 费用。电脑需要运行 Ollama。
            </p>
          </button>

          <button
            type="button"
            onClick={() => updateProvider("deepseek_byok")}
            className={`rounded-3xl border p-5 text-left transition ${
              settings.provider === "deepseek_byok"
                ? "border-brand-400 bg-brand-50 ring-2 ring-brand-100"
                : "border-brand-100 bg-white hover:bg-brand-50/60"
            }`}
          >
            <Cloud className="text-brand-700" size={25} />
            <h2 className="mt-4 text-lg font-semibold">自己的 DeepSeek Key</h2>
            <p className="mt-2 text-sm leading-6 text-muted">
              调用费用计入你自己的 DeepSeek 账户。测试版只在当前浏览器会话保存 Key。
            </p>
          </button>

          <button
            type="button"
            onClick={() => updateProvider("context_debug")}
            className={`rounded-3xl border p-5 text-left transition ${
              settings.provider === "context_debug"
                ? "border-brand-400 bg-brand-50 ring-2 ring-brand-100"
                : "border-brand-100 bg-white hover:bg-brand-50/60"
            }`}
          >
            <Bug className="text-brand-700" size={25} />
            <h2 className="mt-4 text-lg font-semibold">上下文调试</h2>
            <p className="mt-2 text-sm leading-6 text-muted">
              不调用任何模型、不消耗 Token，直接显示本轮实际读取的命盘、摘要与近期消息。
            </p>
          </button>
        </div>
      </section>

      {settings.provider === "ollama" ? (
        <section className="card p-6 sm:p-8">
          <div className="flex items-center gap-3">
            <Laptop className="text-brand-700" />
            <div>
              <h2 className="text-xl font-semibold">Ollama 本地连接</h2>
              <p className="mt-1 text-sm text-muted">推荐先使用你电脑上已经安装的模型。</p>
            </div>
          </div>

          <div className="mt-6 grid gap-5 md:grid-cols-2">
            <label>
              <span className="text-sm font-medium">Ollama 地址</span>
              <input
                className="field mt-2"
                value={settings.ollamaBaseUrl}
                onChange={(event: ChangeEvent<HTMLInputElement>) =>
                  setSettings((current) => ({
                    ...current,
                    ollamaBaseUrl: event.target.value,
                  }))
                }
                placeholder="http://127.0.0.1:11434"
              />
              <span className="mt-2 block text-xs leading-5 text-muted">
                测试版只允许 localhost 或 127.0.0.1，避免服务端访问任意网络地址。
              </span>
            </label>

            <label>
              <span className="text-sm font-medium">模型名称</span>
              <input
                className="field mt-2"
                value={settings.ollamaModel}
                onChange={(event: ChangeEvent<HTMLInputElement>) =>
                  setSettings((current) => ({
                    ...current,
                    ollamaModel: event.target.value,
                  }))
                }
                placeholder="例如 qwen3:4b"
              />
              <span className="mt-2 block text-xs leading-5 text-muted">
                名称必须与 <code>ollama list</code> 中显示的一致。DeepSeek-R1 8B 偏重推理，本地首字通常更慢。
              </span>
            </label>
          </div>

          <div className="mt-5">
            <p className="text-sm font-medium">响应模式</p>
            <div className="mt-3 grid gap-3 md:grid-cols-2">
              <button
                type="button"
                onClick={() =>
                  setSettings((current) => ({ ...current, ollamaSpeedMode: "fast" }))
                }
                className={`rounded-2xl border p-4 text-left transition ${
                  settings.ollamaSpeedMode === "fast"
                    ? "border-brand-400 bg-brand-50 ring-2 ring-brand-100"
                    : "border-brand-100 bg-white hover:bg-brand-50/60"
                }`}
              >
                <strong className="text-sm">极速模式（推荐测试）</strong>
                <p className="mt-1 text-xs leading-5 text-muted">
                  最近2条消息、较短上下文和回答，优先降低首字等待。
                </p>
              </button>

              <button
                type="button"
                onClick={() =>
                  setSettings((current) => ({ ...current, ollamaSpeedMode: "balanced" }))
                }
                className={`rounded-2xl border p-4 text-left transition ${
                  settings.ollamaSpeedMode === "balanced"
                    ? "border-brand-400 bg-brand-50 ring-2 ring-brand-100"
                    : "border-brand-100 bg-white hover:bg-brand-50/60"
                }`}
              >
                <strong className="text-sm">平衡模式</strong>
                <p className="mt-1 text-xs leading-5 text-muted">
                  最近4条消息和更长回答，连贯性更好，但本地生成更慢。
                </p>
              </button>
            </div>
          </div>

          {models.length > 0 && (
            <div className="mt-5 rounded-2xl bg-brand-50 p-4">
              <p className="text-sm font-medium">检测到的本机模型</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {models.map((model) => (
                  <button
                    type="button"
                    key={model}
                    onClick={() =>
                      setSettings((current) => ({ ...current, ollamaModel: model }))
                    }
                    className={`rounded-full border px-3 py-2 text-xs transition ${
                      settings.ollamaModel === model
                        ? "border-brand-500 bg-white text-brand-800"
                        : "border-brand-100 bg-white/70 text-muted hover:text-brand-800"
                    }`}
                  >
                    {model}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="mt-6 rounded-2xl border border-brand-100 bg-[#FAF9FF] p-4 text-sm leading-7">
            <p className="font-medium">Windows 测试命令</p>
            <code className="mt-2 block rounded-xl bg-white px-3 py-2">ollama list</code>
            <code className="mt-2 block rounded-xl bg-white px-3 py-2">
              ollama pull qwen3:4b
            </code>
            <code className="mt-2 block rounded-xl bg-white px-3 py-2">
              ollama pull deepseek-r1:1.5b
            </code>
            <p className="mt-3 text-xs leading-5 text-muted">
              追求速度优先试 qwen3:4b；必须使用 DeepSeek 时，可先用 1.5B 验证流程。
            </p>
          </div>
        </section>
      ) : settings.provider === "deepseek_byok" ? (
        <section className="card p-6 sm:p-8">
          <div className="flex items-center gap-3">
            <KeyRound className="text-brand-700" />
            <div>
              <h2 className="text-xl font-semibold">DeepSeek BYOK</h2>
              <p className="mt-1 text-sm text-muted">BYOK：使用你自己的 API Key。</p>
            </div>
          </div>

          <div className="mt-6 grid gap-5 md:grid-cols-2">
            <label>
              <span className="text-sm font-medium">DeepSeek API Key</span>
              <div className="relative mt-2">
                <input
                  className="field pr-12"
                  type={showKey ? "text" : "password"}
                  value={apiKey}
                  onChange={(event: ChangeEvent<HTMLInputElement>) => setApiKey(event.target.value)}
                  autoComplete="off"
                  placeholder="sk-..."
                />
                <button
                  type="button"
                  onClick={() => setShowKey((current) => !current)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-1 text-muted hover:text-brand-800"
                  aria-label={showKey ? "隐藏密钥" : "显示密钥"}
                >
                  {showKey ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              <span className="mt-2 block text-xs leading-5 text-muted">
                Key 只写入 sessionStorage；关闭该浏览器会话后需要重新填写。
              </span>
            </label>

            <label>
              <span className="text-sm font-medium">模型</span>
              <select
                className="field mt-2"
                value={settings.deepseekModel}
                onChange={(event: ChangeEvent<HTMLSelectElement>) =>
                  setSettings((current) => ({
                    ...current,
                    deepseekModel: event.target.value,
                  }))
                }
              >
                <option value="deepseek-v4-flash">deepseek-v4-flash</option>
              </select>
              <span className="mt-2 block text-xs leading-5 text-muted">
                测试阶段固定使用响应更快的 Flash 模型。
              </span>
            </label>
          </div>

          <div className="mt-6 flex gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900">
            <ShieldCheck className="mt-0.5 shrink-0" size={20} />
            <p>
              该 Key 不会写入项目文件或数据库，也不会使用开发者额度；调用产生的 Token
              由该 Key 所属账户承担。公用电脑上不要使用此模式。
            </p>
          </div>
        </section>
      ) : (
        <section className="card p-6 sm:p-8">
          <div className="flex items-center gap-3">
            <Bug className="text-brand-700" />
            <div>
              <h2 className="text-xl font-semibold">上下文调试模式</h2>
              <p className="mt-1 text-sm text-muted">用于最终验收记忆链路，不生成命理解读。</p>
            </div>
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <div className="rounded-2xl border border-brand-100 bg-brand-50 p-5">
              <strong className="text-sm">本轮会显示</strong>
              <p className="mt-2 text-sm leading-7 text-muted">
                已确认命盘、当前会话 ID、长期摘要、实际发送的近期消息和本轮问题。
              </p>
            </div>
            <div className="rounded-2xl border border-brand-100 bg-brand-50 p-5">
              <strong className="text-sm">本轮不会执行</strong>
              <p className="mt-2 text-sm leading-7 text-muted">
                不连接 Ollama 或 DeepSeek，不产生 Token 费用，也不会伪造 AI 回答。
              </p>
            </div>
          </div>

          <div className="mt-5 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm leading-7 text-emerald-900">
            建议新建两个对话分别发送不同问题，再回到第一个对话发送“检查上下文”。报告中不应出现第二个对话的内容。
            当当前会话累计超过 8 条有效消息后，更早内容会立即进入规则化长期摘要，最近 8 条继续作为近期窗口。
          </div>
        </section>
      )}

      <section className="card p-6 sm:p-8">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="font-semibold">保存并测试</h2>
            <p className="mt-1 text-sm text-muted">
              测试连接不会发送你的命盘或聊天内容。
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <button type="button" onClick={saveSettings} className="btn-secondary">
              <Save size={17} />
              {saved ? "已保存" : "保存设置"}
            </button>
            <button
              type="button"
              onClick={testConnection}
              disabled={testing}
              className="btn-primary"
            >
              {testing ? (
                <LoaderCircle className="animate-spin" size={17} />
              ) : (
                <RefreshCw size={17} />
              )}
              测试连接
            </button>
          </div>
        </div>

        {status && (
          <div
            className={`mt-5 flex items-start gap-3 rounded-2xl border p-4 text-sm leading-6 ${
              status.connected
                ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                : "border-red-200 bg-red-50 text-red-800"
            }`}
          >
            {status.connected ? (
              <CheckCircle2 className="mt-0.5 shrink-0" size={20} />
            ) : (
              <XCircle className="mt-0.5 shrink-0" size={20} />
            )}
            <div>
              <p className="font-medium">{status.connected ? "连接成功" : "连接失败"}</p>
              <p className="mt-1">{status.message}</p>
            </div>
          </div>
        )}

        <Link href="/chat" className="btn-secondary mt-6 w-full justify-center sm:w-auto">
          <MessageCircle size={17} />
          进入问浮生
        </Link>
      </section>
    </div>
  );
}
