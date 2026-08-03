"use client";

import Link from "next/link";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type FormEvent,
  type KeyboardEvent,
} from "react";
import {
  Braces,
  CircleCheck,
  CircleX,
  Laptop,
  LoaderCircle,
  MessageCirclePlus,
  Send,
  Settings2,
  Sparkles,
  Square,
  Trash2,
} from "lucide-react";
import type { ChatMessage, ChatThread } from "@/types/chat";
import type { StoredBaziProfile } from "@/lib/client-storage";
import type { AiSettings } from "@/types/ai";
import {
  DEFAULT_AI_SETTINGS,
  readAiSettings,
  readSessionDeepSeekKey,
} from "@/lib/ai-settings";
import {
  readActiveBazi,
  readActiveThreadId,
  readChatThreads,
  replaceChatThreads,
  writeActiveThreadId,
  writeChatThreads,
} from "@/lib/client-storage";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";
import { loadCloudChatThreads, syncChatThreadsToCloud } from "@/lib/cloud-sync";
import { getContextMessages, prepareThreadContext } from "@/lib/chat-context";

const OPENING_MESSAGE =
  "你好，我是浮生。你当前确认的命盘会作为固定背景信息，我不会在对话中重新计算或擅自修改。告诉我此刻最让你犹豫的一件事，我们先把问题看清楚。";

function createId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function nowIso() {
  return new Date().toISOString();
}

function createMessage(role: ChatMessage["role"], content: string): ChatMessage {
  return { id: createId(), role, content, createdAt: nowIso() };
}

function createThread(): ChatThread {
  const now = nowIso();
  return {
    id: createId(),
    title: "新的对话",
    createdAt: now,
    updatedAt: now,
    summary: "",
    summarizedMessageCount: 0,
    messages: [createMessage("assistant", OPENING_MESSAGE)],
  };
}

function formatThreadTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function compactBazi(profile: StoredBaziProfile | null) {
  if (!profile) return null;
  const { input, result } = profile;
  return {
    name: input.name || "用户",
    birthDate: input.date,
    birthTime: input.time,
    gender: input.gender,
    location: result.location,
    pillars: result.pillars,
    dayMaster: result.dayMaster,
    elements: result.elements,
    calendar: result.calendar,
    policy: result.policy,
  };
}

function friendlyClientError(error: unknown) {
  if (!(error instanceof Error)) return "模型服务暂时不可用，请稍后再试。";
  const text = error.message.toLowerCase();

  if (
    error.name === "AbortError" ||
    text.includes("aborted") ||
    text.includes("timeout") ||
    text.includes("terminated")
  ) {
    return "本地模型响应较慢或连接中断。请确认 Ollama 仍在运行，稍后重试，或在 AI 设置中选择更轻量的模型。";
  }

  if (text.includes("failed to fetch") || text.includes("network")) {
    return "无法连接模型服务。请在 AI 设置中重新测试 Ollama 或 DeepSeek 连接。";
  }

  return error.message || "模型服务暂时不可用，请稍后再试。";
}


function getRecentMessageLimit(settings: AiSettings) {
  if (settings.provider !== "ollama") return 8;
  return settings.ollamaSpeedMode === "fast" ? 2 : 4;
}

interface ProviderStatus {
  checked: boolean;
  connected: boolean;
  provider: AiSettings["provider"];
  model: string;
  message: string;
}

export function ChatPanel() {
  const [threads, setThreads] = useState<ChatThread[]>([]);
  const [activeThreadId, setActiveThreadId] = useState("");
  const [activeBazi, setActiveBazi] = useState<StoredBaziProfile | null>(null);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [streamingText, setStreamingText] = useState("");
  const [hydrated, setHydrated] = useState(false);
  const [aiSettings, setAiSettings] = useState<AiSettings>(DEFAULT_AI_SETTINGS);
  const [deepseekApiKey, setDeepseekApiKey] = useState("");
  const [showContextDetails, setShowContextDetails] = useState(false);
  const [apiStatus, setApiStatus] = useState<ProviderStatus>({
    checked: false,
    connected: false,
    provider: "ollama",
    model: "",
    message: "",
  });
  const abortRef = useRef<AbortController | null>(null);
  const stoppedByUserRef = useRef(false);
  const messagesViewportRef = useRef<HTMLDivElement | null>(null);
  const cloudReadyRef = useRef(false);
  const cloudSyncTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const savedThreads = readChatThreads();
    const initialThreads = savedThreads.length ? savedThreads : [createThread()];
    const savedActiveId = readActiveThreadId();
    const validActiveId = initialThreads.some((thread) => thread.id === savedActiveId)
      ? savedActiveId!
      : initialThreads[0].id;

    setThreads(initialThreads);
    setActiveThreadId(validActiveId);
    setActiveBazi(readActiveBazi());
    setAiSettings(readAiSettings());
    setDeepseekApiKey(readSessionDeepSeekKey());
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;

    if (!isSupabaseConfigured()) {
      cloudReadyRef.current = true;
      return;
    }

    let cancelled = false;
    const restoreCloudThreads = async () => {
      try {
        const supabase = createClient();
        if (!supabase) return;
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) return;

        const remote = await loadCloudChatThreads(supabase);
        if (cancelled || !remote.length) return;

        const local = readChatThreads();
        const merged = new Map<string, ChatThread>();
        for (const thread of [...remote, ...local]) {
          const existing = merged.get(thread.id);
          if (!existing || thread.updatedAt > existing.updatedAt) merged.set(thread.id, thread);
        }
        const next = [...merged.values()].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
        replaceChatThreads(next);
        setThreads(next);
        setActiveThreadId((current) =>
          next.some((thread) => thread.id === current) ? current : next[0].id,
        );
      } catch {
        // 云端不可用时继续使用本机记录，不中断聊天页面。
      } finally {
        cloudReadyRef.current = true;
      }
    };

    void restoreCloudThreads();
    return () => {
      cancelled = true;
    };
  }, [hydrated]);

  useEffect(() => {
    if (!hydrated || !cloudReadyRef.current || !threads.length || !isSupabaseConfigured()) return;
    if (cloudSyncTimerRef.current) clearTimeout(cloudSyncTimerRef.current);

    cloudSyncTimerRef.current = setTimeout(() => {
      const sync = async () => {
        try {
          const supabase = createClient();
          if (!supabase) return;
          const {
            data: { user },
          } = await supabase.auth.getUser();
          if (!user) return;
          await syncChatThreadsToCloud(supabase, user.id, threads);
        } catch {
          // 自动同步失败时保留本机记录，用户可在个人中心手动重试。
        }
      };
      void sync();
    }, 1200);

    return () => {
      if (cloudSyncTimerRef.current) clearTimeout(cloudSyncTimerRef.current);
    };
  }, [hydrated, threads]);

  useEffect(() => {
    if (!hydrated) return;

    let cancelled = false;
    const model =
      aiSettings.provider === "ollama"
        ? aiSettings.ollamaModel
        : aiSettings.provider === "deepseek_byok"
          ? aiSettings.deepseekModel
          : "context-debug";

    setApiStatus({
      checked: false,
      connected: false,
      provider: aiSettings.provider,
      model,
      message: "正在检查模型连接…",
    });

    fetch("/api/chat/status", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(aiSettings.provider === "deepseek_byok" && deepseekApiKey
          ? { "x-fusheng-deepseek-key": deepseekApiKey }
          : {}),
      },
      body: JSON.stringify({
        provider: aiSettings.provider,
        model,
        ollamaBaseUrl: aiSettings.ollamaBaseUrl,
      }),
      cache: "no-store",
    })
      .then((response) => response.json())
      .then((data: { connected?: boolean; message?: string }) => {
        if (cancelled) return;
        setApiStatus({
          checked: true,
          connected: Boolean(data.connected),
          provider: aiSettings.provider,
          model,
          message: String(data.message || "连接检查完成"),
        });
      })
      .catch((error) => {
        if (cancelled) return;
        setApiStatus({
          checked: true,
          connected: false,
          provider: aiSettings.provider,
          model,
          message: error instanceof Error ? error.message : "连接检查失败",
        });
      });

    return () => {
      cancelled = true;
    };
  }, [aiSettings, deepseekApiKey, hydrated]);

  useEffect(() => {
    if (!hydrated) return;
    writeChatThreads(threads);
  }, [hydrated, threads]);

  useEffect(() => {
    if (!hydrated || !activeThreadId) return;
    writeActiveThreadId(activeThreadId);
  }, [activeThreadId, hydrated]);

  useEffect(() => {
    const viewport = messagesViewportRef.current;
    if (!viewport) return;

    const frame = window.requestAnimationFrame(() => {
      viewport.scrollTo({
        top: viewport.scrollHeight,
        behavior: streamingText ? "auto" : "smooth",
      });
    });

    return () => window.cancelAnimationFrame(frame);
  }, [activeThreadId, loading, streamingText, threads]);

  useEffect(
    () => () => {
      abortRef.current?.abort();
      if (cloudSyncTimerRef.current) clearTimeout(cloudSyncTimerRef.current);
    },
    [],
  );

  const activeThread = useMemo(
    () => threads.find((thread) => thread.id === activeThreadId) ?? threads[0],
    [activeThreadId, threads],
  );

  function addThread() {
    abortRef.current?.abort();
    const thread = createThread();
    setThreads((current) => [thread, ...current]);
    setActiveThreadId(thread.id);
    setInput("");
    setStreamingText("");
  }

  function deleteThread(threadId: string) {
    if (threads.length === 1) {
      const replacement = createThread();
      setThreads([replacement]);
      setActiveThreadId(replacement.id);
      return;
    }

    const remaining = threads.filter((thread) => thread.id !== threadId);
    setThreads(remaining);
    if (activeThreadId === threadId) setActiveThreadId(remaining[0].id);
  }

  function updateThread(threadId: string, updater: (thread: ChatThread) => ChatThread) {
    setThreads((current) =>
      current
        .map((thread) => (thread.id === threadId ? updater(thread) : thread))
        .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)),
    );
  }

  function stopGeneration() {
    stoppedByUserRef.current = true;
    abortRef.current?.abort();
  }

  async function submitCurrentInput() {
    const text = input.trim();
    if (!text || loading || !activeThread || !apiStatus.connected) return;

    const threadId = activeThread.id;
    const userMessage = createMessage("user", text);
    const nextTitle =
      activeThread.title === "新的对话"
        ? text.replace(/\s+/g, " ").slice(0, 24)
        : activeThread.title;
    const historyLimit = getRecentMessageLimit(aiSettings);

    updateThread(threadId, (thread) => ({
      ...thread,
      title: nextTitle,
      updatedAt: nowIso(),
      messages: [...thread.messages, userMessage],
    }));

    setInput("");
    setLoading(true);
    setStreamingText("");
    stoppedByUserRef.current = false;

    const controller = new AbortController();
    abortRef.current = controller;
    let accumulated = "";

    const appendAssistantAndRefreshMemory = (content: string) => {
      const assistantMessage = createMessage("assistant", content);
      updateThread(threadId, (thread) => {
        const withAssistant: ChatThread = {
          ...thread,
          updatedAt: nowIso(),
          messages: [...thread.messages, assistantMessage].slice(-200),
        };
        return prepareThreadContext(withAssistant, historyLimit).thread;
      });
    };

    try {
      // 当前问题通过 message 单独发送，history 只携带此前消息，避免重复。
      const prepared = prepareThreadContext(activeThread, historyLimit);
      const history = prepared.recentHistory;

      if (prepared.summaryChanged) {
        updateThread(threadId, (thread) => ({
          ...thread,
          summary: prepared.summary,
          summarizedMessageCount: prepared.summarizedMessageCount,
          summaryUpdatedAt: prepared.thread.summaryUpdatedAt,
        }));
      }

      const model =
        aiSettings.provider === "ollama"
          ? aiSettings.ollamaModel
          : aiSettings.provider === "deepseek_byok"
            ? aiSettings.deepseekModel
            : "context-debug";

      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(aiSettings.provider === "deepseek_byok" && deepseekApiKey
            ? { "x-fusheng-deepseek-key": deepseekApiKey }
            : {}),
        },
        body: JSON.stringify({
          provider: aiSettings.provider,
          model,
          ollamaBaseUrl: aiSettings.ollamaBaseUrl,
          ollamaSpeedMode: aiSettings.ollamaSpeedMode,
          message: text,
          history,
          bazi: compactBazi(activeBazi),
          threadId,
          threadTitle: nextTitle,
          threadSummary: prepared.summary,
          // 本轮问题作为独立层发送，因此累计数需要包含本轮用户消息。
          contextMessageCount: prepared.contextMessageCount + 1,
          summarizedMessageCount: prepared.summarizedMessageCount,
          recentMessageLimit: historyLimit,
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        const data = (await response.json().catch(() => null)) as { error?: string } | null;
        throw new Error(data?.error || `模型服务返回 ${response.status}`);
      }
      if (!response.body) throw new Error("模型未返回可读取的数据流");

      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        accumulated += decoder.decode(value, { stream: true });
        setStreamingText(accumulated);
      }
      accumulated += decoder.decode();

      if (!accumulated.trim()) throw new Error("模型没有返回有效内容");
      appendAssistantAndRefreshMemory(accumulated.trim());
    } catch (error) {
      const stopped = stoppedByUserRef.current;
      const content = accumulated.trim()
        ? `${accumulated.trim()}${stopped ? "\n\n（已停止生成）" : ""}`
        : stopped
          ? "已停止生成。"
          : friendlyClientError(error);

      appendAssistantAndRefreshMemory(content);
    } finally {
      abortRef.current = null;
      stoppedByUserRef.current = false;
      setStreamingText("");
      setLoading(false);
    }
  }

  function send(event: FormEvent) {
    event.preventDefault();
    void submitCurrentInput();
  }

  function handleInputKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key !== "Enter" || event.nativeEvent.isComposing) return;

    // Ctrl/Command + Enter 和 Shift + Enter 均保留为换行。
    if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;

    event.preventDefault();
    void submitCurrentInput();
  }

  if (!hydrated || !activeThread) {
    return (
      <div className="card mx-auto grid min-h-[70vh] max-w-6xl place-items-center">
        <LoaderCircle className="animate-spin text-brand-700" size={28} />
      </div>
    );
  }

  const pillars = activeBazi?.result.pillars
    .map((pillar) => `${pillar.stem}${pillar.branch}`)
    .join(" · ");
  const providerLabel =
    aiSettings.provider === "ollama"
      ? "本机 Ollama"
      : aiSettings.provider === "deepseek_byok"
        ? "自己的 DeepSeek Key"
        : "上下文调试";

  return (
    <div className="mx-auto grid max-w-6xl gap-4 lg:h-[calc(100dvh-7rem)] lg:min-h-[620px] lg:grid-cols-[270px_minmax(0,1fr)]">
      <aside className="card h-fit p-4 lg:sticky lg:top-24 lg:max-h-[76vh]">
        <button type="button" onClick={addThread} className="btn-primary w-full">
          <MessageCirclePlus size={18} />
          新建对话
        </button>

        <Link href="/settings/ai" className="btn-secondary mt-3 w-full justify-center">
          <Settings2 size={17} />
          AI 设置
        </Link>

        <div className="mt-4 max-h-52 space-y-2 overflow-y-auto pr-1 lg:max-h-[56vh]">
          {threads.map((thread) => (
            <div
              key={thread.id}
              className={`group flex items-start gap-2 rounded-2xl border p-2 transition ${
                thread.id === activeThread.id
                  ? "border-brand-300 bg-brand-50"
                  : "border-transparent hover:bg-brand-50/70"
              }`}
            >
              <button
                type="button"
                onClick={() => setActiveThreadId(thread.id)}
                className="min-w-0 flex-1 px-2 py-1 text-left"
              >
                <span className="block truncate text-sm font-medium">{thread.title}</span>
                <span className="mt-1 block text-[11px] text-muted">
                  {formatThreadTime(thread.updatedAt)}
                </span>
              </button>
              <button
                type="button"
                onClick={() => deleteThread(thread.id)}
                className="rounded-xl p-2 text-muted hover:bg-white hover:text-red-600"
                aria-label="删除对话"
              >
                <Trash2 size={15} />
              </button>
            </div>
          ))}
        </div>
      </aside>

      <div className="card flex min-h-[74vh] min-w-0 flex-col overflow-hidden lg:h-full lg:min-h-0">
        <header className="border-b border-brand-100 p-5 sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="eyebrow">问浮生</p>
              <h1 className="mt-2 font-serif text-3xl">把模糊的焦虑，变成可讨论的问题</h1>
            </div>
            <div
              className={`flex items-center gap-2 rounded-full px-3 py-2 text-xs ${
                apiStatus.connected
                  ? "bg-emerald-50 text-emerald-700"
                  : apiStatus.checked
                    ? "bg-amber-50 text-amber-800"
                    : "bg-brand-50 text-muted"
              }`}
            >
              {!apiStatus.checked ? (
                <LoaderCircle className="animate-spin" size={15} />
              ) : apiStatus.connected ? (
                <CircleCheck size={15} />
              ) : (
                <CircleX size={15} />
              )}
              {apiStatus.connected
                ? `${providerLabel} · ${apiStatus.model}`
                : apiStatus.checked
                  ? `${providerLabel}未连接`
                  : "正在检查连接"}
            </div>
          </div>

          {activeBazi ? (
            <div className="mt-4 rounded-2xl border border-brand-100 bg-brand-50 p-4 text-sm leading-6">
              <p className="font-medium text-brand-900">已载入当前确认命盘：{pillars}</p>
              <p className="mt-1 text-xs text-muted">
                {activeBazi.result.location.displayName} · 日主 {activeBazi.result.dayMaster.stem}
                {activeBazi.result.dayMaster.element}。所有对话都读取这份命盘，不会在聊天中重新排盘。
              </p>
            </div>
          ) : (
            <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900">
              尚未找到已确认命盘。你仍可进行普通对话，但命理相关回答不会个性化。
              <Link href="/bazi" className="ml-1 font-medium underline">
                先去排盘
              </Link>
            </div>
          )}

          {apiStatus.checked && !apiStatus.connected && (
            <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900">
              <p>{apiStatus.message}</p>
              <Link href="/settings/ai" className="mt-2 inline-block font-medium underline">
                前往 AI 设置检查连接
              </Link>
            </div>
          )}

          <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs leading-5 text-muted">
              上下文采用固定命盘、当前会话摘要与近期消息三层结构；其他会话不会被读取。
            </p>
            <button
              type="button"
              onClick={() => setShowContextDetails((current) => !current)}
              className="inline-flex items-center gap-1 rounded-full border border-brand-200 px-3 py-1.5 text-xs text-brand-700 hover:bg-brand-50"
            >
              <Braces size={13} />
              {showContextDetails ? "收起上下文" : "查看上下文"}
            </button>
          </div>

          {showContextDetails && (
            <div className="mt-3 rounded-2xl border border-brand-100 bg-white/70 p-4 text-xs leading-6 text-muted">
              <p>
                当前会话累计有效消息：{getContextMessages(activeThread).length} 条；已归入长期摘要：
                {activeThread.summarizedMessageCount || 0} 条；本次近期窗口：
                {Math.min(
                  getRecentMessageLimit(aiSettings),
                  Math.max(
                    0,
                    getContextMessages(activeThread).length -
                      (activeThread.summarizedMessageCount || 0),
                  ),
                )}
                /{getRecentMessageLimit(aiSettings)} 条。
              </p>
              <p className="mt-1">
                累计消息会持续增长；近期窗口达到上限后会保持固定，更早内容会自动进入长期摘要，并非消息丢失。
              </p>
              <p className="mt-2 whitespace-pre-wrap">
                {activeThread.summary || "尚未生成长期摘要。消息达到阈值后会自动归纳较早内容。"}
              </p>
            </div>
          )}
        </header>

        <div ref={messagesViewportRef} className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4 sm:p-6">
          {activeThread.messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[88%] whitespace-pre-wrap rounded-3xl px-5 py-4 text-sm leading-7 ${
                  message.role === "user"
                    ? "bg-brand-700 text-white"
                    : "bg-brand-50 text-ink"
                }`}
              >
                {message.content}
              </div>
            </div>
          ))}

          {loading && (
            <div className="flex justify-start">
              <div className="max-w-[88%] rounded-3xl bg-brand-50 px-5 py-4 text-sm leading-7 text-ink">
                {streamingText ? (
                  <span className="whitespace-pre-wrap">
                    {streamingText}
                    <span className="ml-1 inline-block h-4 w-1 animate-pulse rounded bg-brand-500 align-middle" />
                  </span>
                ) : (
                  <span className="flex items-center gap-2 text-muted">
                    <LoaderCircle className="animate-spin" size={17} />
                    {aiSettings.provider === "context_debug"
                      ? "正在核对实际上下文…"
                      : "浮生正在整理你的命盘与问题…"}
                  </span>
                )}
              </div>
            </div>
          )}
        </div>

        <form onSubmit={send} className="shrink-0 border-t border-brand-100 bg-white p-4 sm:p-5">
          <div className="flex gap-3">
            <textarea
              className="field min-h-14 resize-none"
              value={input}
              maxLength={2000}
              onChange={(event: ChangeEvent<HTMLTextAreaElement>) => setInput(event.target.value)}
              onKeyDown={handleInputKeyDown}
              placeholder={
                apiStatus.connected
                  ? "例如：结合我的命盘，我在职业选择中更需要关注什么？"
                  : "请先完成 AI 连接设置"
              }
              disabled={!apiStatus.connected || loading}
            />

            {loading ? (
              <button
                type="button"
                onClick={stopGeneration}
                className="btn-secondary self-end !px-4"
                aria-label="停止生成"
                title="停止生成"
              >
                <Square size={17} fill="currentColor" />
              </button>
            ) : (
              <button
                disabled={!apiStatus.connected}
                className="btn-primary self-end !px-4"
                aria-label="发送"
              >
                <Send size={18} />
              </button>
            )}
          </div>
          <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs text-muted">
            <p>
              <Sparkles className="mr-1 inline" size={12} />
              Enter 发送，Ctrl/Command + Enter 或 Shift + Enter 换行。请勿输入敏感信息。
            </p>
            <p className="flex items-center gap-1">
              <Laptop size={12} />
              {input.length}/2000
            </p>
          </div>
        </form>
      </div>
    </div>
  );
}
