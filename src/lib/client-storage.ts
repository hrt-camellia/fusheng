import type { BirthInput, BaziResult } from "@/types/bazi";
import type { ChatThread } from "@/types/chat";

export interface StoredBaziProfile {
  input: BirthInput;
  result: BaziResult;
  savedAt: string;
}

const KEYS = {
  activeBazi: "fusheng:active-bazi:v1",
  legacyBazi: "fusheng:last-bazi",
  baziDraft: "fusheng:bazi-draft:v1",
  chatThreads: "fusheng:chat-threads:v1",
  activeThread: "fusheng:active-chat-thread:v1",
} as const;

function canUseStorage() {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

function parseJson<T>(value: string | null): T | null {
  if (!value) return null;
  try {
    return JSON.parse(value) as T;
  } catch {
    return null;
  }
}

export function readActiveBazi(): StoredBaziProfile | null {
  if (!canUseStorage()) return null;

  const current = parseJson<StoredBaziProfile>(localStorage.getItem(KEYS.activeBazi));
  if (current?.input && current?.result) return current;

  const legacy = parseJson<{ input: BirthInput; result: BaziResult }>(
    localStorage.getItem(KEYS.legacyBazi),
  );

  if (!legacy?.input || !legacy?.result) return null;

  const migrated: StoredBaziProfile = {
    ...legacy,
    savedAt: new Date().toISOString(),
  };
  localStorage.setItem(KEYS.activeBazi, JSON.stringify(migrated));
  return migrated;
}

export function writeActiveBazi(profile: StoredBaziProfile) {
  if (!canUseStorage()) return;
  localStorage.setItem(KEYS.activeBazi, JSON.stringify(profile));
  localStorage.setItem(
    KEYS.legacyBazi,
    JSON.stringify({ input: profile.input, result: profile.result }),
  );
}

export function clearActiveBazi() {
  if (!canUseStorage()) return;
  localStorage.removeItem(KEYS.activeBazi);
  localStorage.removeItem(KEYS.legacyBazi);
  localStorage.removeItem(KEYS.baziDraft);
}

export function readBaziDraft(): BirthInput | null {
  if (!canUseStorage()) return null;
  return parseJson<BirthInput>(localStorage.getItem(KEYS.baziDraft));
}

export function writeBaziDraft(input: BirthInput) {
  if (!canUseStorage()) return;
  localStorage.setItem(KEYS.baziDraft, JSON.stringify(input));
}

export function readChatThreads(): ChatThread[] {
  if (!canUseStorage()) return [];
  const threads = parseJson<ChatThread[]>(localStorage.getItem(KEYS.chatThreads));
  return Array.isArray(threads) ? threads : [];
}

export function writeChatThreads(threads: ChatThread[]) {
  if (!canUseStorage()) return;
  localStorage.setItem(KEYS.chatThreads, JSON.stringify(threads));
}

export function replaceChatThreads(threads: ChatThread[]) {
  writeChatThreads(threads);
  if (!canUseStorage()) return;

  const activeId = localStorage.getItem(KEYS.activeThread);
  if (!activeId || !threads.some((thread) => thread.id === activeId)) {
    if (threads[0]) localStorage.setItem(KEYS.activeThread, threads[0].id);
    else localStorage.removeItem(KEYS.activeThread);
  }
}

export function readActiveThreadId(): string | null {
  if (!canUseStorage()) return null;
  return localStorage.getItem(KEYS.activeThread);
}

export function writeActiveThreadId(threadId: string) {
  if (!canUseStorage()) return;
  localStorage.setItem(KEYS.activeThread, threadId);
}
