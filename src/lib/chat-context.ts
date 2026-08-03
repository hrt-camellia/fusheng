import type { ChatHistoryItem, ChatMessage, ChatThread } from "@/types/chat";

export const DEFAULT_RECENT_MESSAGE_LIMIT = 8;
export const SUMMARY_MAX_LENGTH = 1800;

const OPENING_PREFIX = "你好，我是浮生";
const DEBUG_REPORT_PREFIX = "【上下文调试报告】";

function clip(value: string, limit: number) {
  const compact = value.replace(/\s+/g, " ").trim();
  return compact.length > limit ? `${compact.slice(0, limit)}…` : compact;
}

function isContextMessage(message: ChatMessage, index: number) {
  if (!message.content.trim()) return false;
  if (index === 0 && message.role === "assistant" && message.content.startsWith(OPENING_PREFIX)) {
    return false;
  }
  if (message.role === "assistant" && message.content.startsWith(DEBUG_REPORT_PREFIX)) {
    return false;
  }
  return true;
}

export function getContextMessages(thread: ChatThread) {
  return thread.messages.filter(isContextMessage);
}

function buildSummaryBlock(messages: ChatMessage[]) {
  const userPoints = messages
    .filter((message) => message.role === "user")
    .map((message) => clip(message.content, 150))
    .filter(Boolean)
    .slice(-5);
  const assistantPoints = messages
    .filter((message) => message.role === "assistant")
    .map((message) => clip(message.content, 170))
    .filter(Boolean)
    .slice(-4);

  const lines = [`较早对话摘要（本次归纳 ${messages.length} 条消息）`];
  if (userPoints.length) lines.push(`用户关注：${userPoints.join("；")}`);
  if (assistantPoints.length) lines.push(`已讨论内容：${assistantPoints.join("；")}`);
  return lines.join("\n");
}

function mergeSummary(previous: string, newBlock: string) {
  const oldPart = clip(previous, 850);
  const newPart = clip(newBlock, 900);
  return [oldPart, newPart].filter(Boolean).join("\n\n").slice(0, SUMMARY_MAX_LENGTH);
}

export interface PreparedThreadContext {
  thread: ChatThread;
  summary: string;
  recentHistory: ChatHistoryItem[];
  contextMessageCount: number;
  summarizedMessageCount: number;
  summaryChanged: boolean;
}

export function prepareThreadContext(
  thread: ChatThread,
  recentLimit = DEFAULT_RECENT_MESSAGE_LIMIT,
): PreparedThreadContext {
  const contextMessages = getContextMessages(thread);
  const targetSummarizedCount = Math.max(0, contextMessages.length - recentLimit);
  const currentSummarizedCount = Math.min(
    Math.max(0, thread.summarizedMessageCount || 0),
    targetSummarizedCount,
  );

  let summary = thread.summary || "";
  let summarizedMessageCount = currentSummarizedCount;
  let summaryChanged = false;

  // 近期窗口一旦溢出，就立刻把更早内容归入摘要。
  // 这样第 9 条消息开始不会出现“窗口固定为 8，但摘要尚未更新”的记忆空档。
  if (targetSummarizedCount > currentSummarizedCount) {
    const newlySummarized = contextMessages.slice(
      currentSummarizedCount,
      targetSummarizedCount,
    );
    summary = mergeSummary(summary, buildSummaryBlock(newlySummarized));
    summarizedMessageCount = targetSummarizedCount;
    summaryChanged = true;
  }

  const recentMessages = contextMessages.slice(summarizedMessageCount).slice(-recentLimit);
  const now = new Date().toISOString();
  const nextThread: ChatThread = {
    ...thread,
    summary,
    summarizedMessageCount,
    summaryUpdatedAt: summaryChanged ? now : thread.summaryUpdatedAt,
  };

  return {
    thread: nextThread,
    summary,
    recentHistory: recentMessages.map(({ role, content }) => ({ role, content })),
    contextMessageCount: contextMessages.length,
    summarizedMessageCount,
    summaryChanged,
  };
}

interface DebugReportInput {
  threadId: string;
  threadTitle: string;
  summary: string;
  history: ChatHistoryItem[];
  question: string;
  bazi: Record<string, unknown> | null;
  contextMessageCount?: number;
  summarizedMessageCount?: number;
  recentMessageLimit?: number;
}

function formatBaziForDebug(bazi: Record<string, unknown> | null) {
  if (!bazi) return ["状态：未载入命盘", "系统不会假装已经获得用户八字。"];

  const pillars = Array.isArray(bazi.pillars)
    ? bazi.pillars
        .map((item) => {
          const pillar = item as Record<string, unknown>;
          return `${String(pillar.label || "")}${String(pillar.stem || "")}${String(
            pillar.branch || "",
          )}`;
        })
        .filter(Boolean)
        .join(" / ")
    : "";
  const dayMaster = bazi.dayMaster as Record<string, unknown> | undefined;
  const location = bazi.location as Record<string, unknown> | undefined;

  return [
    "状态：已载入固定命盘",
    `四柱：${pillars || "未提供"}`,
    `日主：${String(dayMaster?.stem || "")}${String(dayMaster?.element || "") || "未提供"}`,
    `出生地点：${String(location?.displayName || bazi.location || "未提供")}`,
    "约束：命盘只作为固定背景，不在聊天中重新排盘或改写。",
  ];
}

export function buildContextDebugReport(input: DebugReportInput) {
  const lines = [
    DEBUG_REPORT_PREFIX,
    "本报告由程序直接生成，不调用 Ollama 或 DeepSeek，也不代表命理解读结果。",
    "",
    "一、固定命盘层",
    ...formatBaziForDebug(input.bazi),
    "",
    "二、当前会话层",
    `会话标题：${input.threadTitle || "新的对话"}`,
    `会话 ID：${input.threadId || "未提供"}`,
    "隔离状态：只读取当前会话，不读取其他对话的消息。",
    "",
    "三、长期摘要层",
    input.summary
      ? `已载入摘要：\n${input.summary}`
      : "尚未生成长期摘要。消息达到阈值后，较早内容会被规则化压缩。",
    `当前会话累计有效消息：${input.contextMessageCount ?? input.history.length} 条`,
    `已归入长期摘要：${input.summarizedMessageCount ?? 0} 条`,
    `本次发送近期窗口：${input.history.length}/${input.recentMessageLimit ?? input.history.length} 条`,
    "说明：累计消息会继续增长；近期窗口达到上限后保持固定，更早内容自动进入长期摘要。",
    "",
    `四、近期消息层（本次实际发送 ${input.history.length} 条）`,
  ];

  if (input.history.length) {
    input.history.forEach((item, index) => {
      lines.push(
        `${index + 1}. ${item.role === "user" ? "用户" : "浮生"}：${clip(item.content, 220)}`,
      );
    });
  } else {
    lines.push("当前没有可发送的近期消息。");
  }

  lines.push(
    "",
    "五、本轮问题",
    clip(input.question, 500),
    "",
    "六、实际上下文顺序",
    "固定安全规则 → 固定命盘 → 当前会话长期摘要 → 当前会话近期消息 → 本轮问题",
    "",
    "验收结论：若四柱正确、会话 ID 正确、其他会话未出现，且近期消息数量符合预期，则上下文编排链路通过。",
  );

  return lines.join("\n");
}
