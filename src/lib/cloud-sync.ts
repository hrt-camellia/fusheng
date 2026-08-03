"use client";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { BraceletDesign } from "@/types/bracelet";
import type { ChatMessage, ChatThread } from "@/types/chat";
import {
  readActiveBazi,
  readChatThreads,
  replaceChatThreads,
  writeActiveBazi,
  writeActiveThreadId,
  type StoredBaziProfile,
} from "@/lib/client-storage";
import {
  readBraceletDesigns,
  replaceBraceletDesigns,
  writeBraceletDraft,
} from "@/lib/bracelet-storage";
import { normalizeBraceletDesign } from "@/lib/bracelet";

export interface LocalDataCounts {
  bazi: number;
  chatThreads: number;
  chatMessages: number;
  bracelets: number;
}

export interface CloudSyncResult extends LocalDataCounts {
  direction: "upload" | "download";
}

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function uuid(value?: string) {
  return value && UUID_PATTERN.test(value) ? value : crypto.randomUUID();
}

function normalizeThreadsForCloud(threads: ChatThread[]) {
  return threads.map((thread) => {
    const threadId = uuid(thread.id);
    const messages = thread.messages.map((message) => ({
      ...message,
      id: uuid(message.id),
    }));
    return { ...thread, id: threadId, messages };
  });
}

export function getLocalDataCounts(): LocalDataCounts {
  const threads = readChatThreads();
  return {
    bazi: readActiveBazi() ? 1 : 0,
    chatThreads: threads.length,
    chatMessages: threads.reduce((sum, thread) => sum + thread.messages.length, 0),
    bracelets: readBraceletDesigns().length,
  };
}

export function migrationFlagKey(userId: string) {
  return `fusheng:cloud-migration-complete:${userId}`;
}

export function hasCompletedMigration(userId: string) {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(migrationFlagKey(userId)) === "true";
}

export function markMigrationComplete(userId: string) {
  if (typeof window === "undefined") return;
  localStorage.setItem(migrationFlagKey(userId), "true");
}

export async function uploadActiveBazi(
  supabase: SupabaseClient,
  userId: string,
  profile: StoredBaziProfile,
) {
  const { error } = await supabase.from("bazi_records").upsert(
    {
      id: uuid(profile.result.id),
      user_id: userId,
      birth_info: profile.input,
      bazi_result: profile.result,
      saved_at: profile.savedAt,
      updated_at: profile.savedAt,
    },
    { onConflict: "id" },
  );
  if (error) throw error;
}

export async function deleteActiveBaziFromCloud(
  supabase: SupabaseClient,
  userId: string,
) {
  const { error } = await supabase.from("bazi_records").delete().eq("user_id", userId);
  if (error) throw error;
}

export async function loadLatestCloudBazi(
  supabase: SupabaseClient,
): Promise<StoredBaziProfile | null> {
  const { data, error } = await supabase
    .from("bazi_records")
    .select("birth_info,bazi_result,saved_at,updated_at")
    .order("saved_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  if (!data?.birth_info || !data?.bazi_result) return null;

  return {
    input: data.birth_info as StoredBaziProfile["input"],
    result: data.bazi_result as StoredBaziProfile["result"],
    savedAt: String(data.saved_at || data.updated_at || new Date().toISOString()),
  };
}

export async function syncChatThreadsToCloud(
  supabase: SupabaseClient,
  userId: string,
  sourceThreads: ChatThread[],
) {
  if (!sourceThreads.length) return;
  const threads = normalizeThreadsForCloud(sourceThreads);
  replaceChatThreads(threads);

  const threadRows = threads.map((thread) => ({
    id: thread.id,
    user_id: userId,
    title: thread.title,
    created_at: thread.createdAt,
    updated_at: thread.updatedAt,
  }));

  const { data: existingRows, error: existingError } = await supabase
    .from("chat_threads")
    .select("id");
  if (existingError) throw existingError;

  const localIds = new Set(threadRows.map((row) => row.id));
  const staleIds = (existingRows ?? [])
    .map((row) => row.id as string)
    .filter((id) => !localIds.has(id));
  if (staleIds.length) {
    const { error: staleError } = await supabase
      .from("chat_threads")
      .delete()
      .in("id", staleIds);
    if (staleError) throw staleError;
  }

  const { error: threadError } = await supabase
    .from("chat_threads")
    .upsert(threadRows, { onConflict: "id" });
  if (threadError) throw threadError;

  const threadIds = threads.map((thread) => thread.id);
  const { error: deleteError } = await supabase
    .from("chat_messages")
    .delete()
    .in("thread_id", threadIds);
  if (deleteError) throw deleteError;

  const messageRows = threads.flatMap((thread) =>
    thread.messages.map((message) => ({
      id: message.id,
      thread_id: thread.id,
      user_id: userId,
      role: message.role,
      content: message.content,
      created_at: message.createdAt,
    })),
  );

  if (messageRows.length) {
    const { error: messageError } = await supabase.from("chat_messages").insert(messageRows);
    if (messageError) throw messageError;
  }
}

export async function loadCloudChatThreads(
  supabase: SupabaseClient,
): Promise<ChatThread[]> {
  const { data: threadRows, error: threadError } = await supabase
    .from("chat_threads")
    .select("id,title,summary,summarized_message_count,summary_updated_at,created_at,updated_at")
    .order("updated_at", { ascending: false });
  if (threadError) throw threadError;
  if (!threadRows?.length) return [];

  const ids = threadRows.map((row) => row.id);
  const { data: messageRows, error: messageError } = await supabase
    .from("chat_messages")
    .select("id,thread_id,role,content,created_at")
    .in("thread_id", ids)
    .order("created_at", { ascending: true });
  if (messageError) throw messageError;

  const grouped = new Map<string, ChatMessage[]>();
  for (const row of messageRows ?? []) {
    const list = grouped.get(row.thread_id) ?? [];
    list.push({
      id: row.id,
      role: row.role as ChatMessage["role"],
      content: row.content,
      createdAt: row.created_at,
    });
    grouped.set(row.thread_id, list);
  }

  return threadRows.map((row) => ({
    id: row.id,
    title: row.title,
    summary: row.summary || "",
    summarizedMessageCount: Number(row.summarized_message_count || 0),
    summaryUpdatedAt: row.summary_updated_at || undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    messages: grouped.get(row.id) ?? [],
  }));
}

export async function syncBraceletsToCloud(
  supabase: SupabaseClient,
  userId: string,
  designs: BraceletDesign[],
) {
  if (!designs.length) return;
  const rows = designs.map((item) => {
    const design = normalizeBraceletDesign(item);
    return {
      id: uuid(design.id),
      user_id: userId,
      name: design.name,
      theme: design.theme,
      wrist_size_mm: design.wristSizeMm,
      design,
      created_at: design.createdAt,
      updated_at: design.updatedAt,
    };
  });
  const { error } = await supabase.from("bracelet_designs").upsert(rows, { onConflict: "id" });
  if (error) throw error;
}

export async function loadCloudBracelets(
  supabase: SupabaseClient,
): Promise<BraceletDesign[]> {
  const { data, error } = await supabase
    .from("bracelet_designs")
    .select("design")
    .order("updated_at", { ascending: false })
    .limit(20);
  if (error) throw error;
  return (data ?? [])
    .map((row) => normalizeBraceletDesign(row.design as BraceletDesign))
    .filter((design) => design.beads.length > 0);
}

export async function uploadLocalSnapshot(
  supabase: SupabaseClient,
  userId: string,
): Promise<CloudSyncResult> {
  const localBazi = readActiveBazi();
  const localThreads = readChatThreads();
  const localBracelets = readBraceletDesigns();

  const [cloudBazi, cloudThreads, cloudBracelets] = await Promise.all([
    loadLatestCloudBazi(supabase),
    loadCloudChatThreads(supabase),
    loadCloudBracelets(supabase),
  ]);

  const selectedBazi =
    localBazi && (!cloudBazi || localBazi.savedAt >= cloudBazi.savedAt)
      ? localBazi
      : cloudBazi;
  if (selectedBazi) {
    writeActiveBazi(selectedBazi);
    await uploadActiveBazi(supabase, userId, selectedBazi);
  }

  const threadMap = new Map<string, ChatThread>();
  for (const thread of [...cloudThreads, ...localThreads]) {
    const existing = threadMap.get(thread.id);
    if (!existing || thread.updatedAt > existing.updatedAt) threadMap.set(thread.id, thread);
  }
  const mergedThreads = [...threadMap.values()].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  if (mergedThreads.length) {
    replaceChatThreads(mergedThreads);
    writeActiveThreadId(mergedThreads[0].id);
    await syncChatThreadsToCloud(supabase, userId, mergedThreads);
  }

  const braceletMap = new Map<string, BraceletDesign>();
  for (const design of [...cloudBracelets, ...localBracelets]) {
    const existing = braceletMap.get(design.id);
    if (!existing || design.updatedAt > existing.updatedAt) braceletMap.set(design.id, design);
  }
  const mergedBracelets = [...braceletMap.values()].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  if (mergedBracelets.length) {
    replaceBraceletDesigns(mergedBracelets);
    writeBraceletDraft(mergedBracelets[0]);
    await syncBraceletsToCloud(supabase, userId, mergedBracelets);
  }

  markMigrationComplete(userId);
  return { ...getLocalDataCounts(), direction: "upload" };
}

export async function downloadCloudSnapshot(
  supabase: SupabaseClient,
  userId: string,
): Promise<CloudSyncResult> {
  const [bazi, threads, bracelets] = await Promise.all([
    loadLatestCloudBazi(supabase),
    loadCloudChatThreads(supabase),
    loadCloudBracelets(supabase),
  ]);

  if (bazi) writeActiveBazi(bazi);
  if (threads.length) {
    replaceChatThreads(threads);
    writeActiveThreadId(threads[0].id);
  }
  if (bracelets.length) {
    replaceBraceletDesigns(bracelets);
    writeBraceletDraft(bracelets[0]);
  }

  markMigrationComplete(userId);
  return {
    bazi: bazi ? 1 : 0,
    chatThreads: threads.length,
    chatMessages: threads.reduce((sum, thread) => sum + thread.messages.length, 0),
    bracelets: bracelets.length,
    direction: "download",
  };
}
