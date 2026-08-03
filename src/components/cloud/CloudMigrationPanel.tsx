"use client";

import { useEffect, useMemo, useState } from "react";
import { CloudDownload, CloudUpload, LoaderCircle, RefreshCw } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import {
  downloadCloudSnapshot,
  getLocalDataCounts,
  hasCompletedMigration,
  uploadLocalSnapshot,
  type LocalDataCounts,
} from "@/lib/cloud-sync";

const EMPTY_COUNTS: LocalDataCounts = {
  bazi: 0,
  chatThreads: 0,
  chatMessages: 0,
  bracelets: 0,
};

export function CloudMigrationPanel({ userId }: { userId: string }) {
  const [counts, setCounts] = useState<LocalDataCounts>(EMPTY_COUNTS);
  const [loading, setLoading] = useState<"upload" | "download" | "">("");
  const [notice, setNotice] = useState("");
  const [isError, setIsError] = useState(false);
  const [restoreConfirm, setRestoreConfirm] = useState(false);
  const [completed, setCompleted] = useState(false);

  useEffect(() => {
    setCounts(getLocalDataCounts());
    setCompleted(hasCompletedMigration(userId));
  }, [userId]);

  const total = useMemo(
    () => counts.bazi + counts.chatThreads + counts.chatMessages + counts.bracelets,
    [counts],
  );

  async function upload() {
    if (loading) return;
    setLoading("upload");
    setNotice("");
    setIsError(false);

    try {
      const supabase = createClient();
      if (!supabase) throw new Error("Supabase 尚未配置。");
      const result = await uploadLocalSnapshot(supabase, userId);
      setCounts(getLocalDataCounts());
      setCompleted(true);
      setNotice(
        `同步完成：命盘 ${result.bazi} 份、对话 ${result.chatThreads} 个、消息 ${result.chatMessages} 条、手串 ${result.bracelets} 个。`,
      );
    } catch (error) {
      setIsError(true);
      setNotice(error instanceof Error ? error.message : "同步失败，请稍后重试。");
    } finally {
      setLoading("");
    }
  }

  async function download() {
    if (loading) return;
    if (!restoreConfirm) {
      setRestoreConfirm(true);
      setNotice("再次点击“确认从云端恢复”，将以云端数据更新当前浏览器的本机记录。");
      setIsError(false);
      return;
    }

    setLoading("download");
    setNotice("");
    setIsError(false);

    try {
      const supabase = createClient();
      if (!supabase) throw new Error("Supabase 尚未配置。");
      const result = await downloadCloudSnapshot(supabase, userId);
      setCounts(getLocalDataCounts());
      setCompleted(true);
      setRestoreConfirm(false);
      setNotice(
        `恢复完成：命盘 ${result.bazi} 份、对话 ${result.chatThreads} 个、消息 ${result.chatMessages} 条、手串 ${result.bracelets} 个。刷新相关页面即可看到。`,
      );
    } catch (error) {
      setIsError(true);
      setNotice(error instanceof Error ? error.message : "恢复失败，请稍后重试。");
    } finally {
      setLoading("");
    }
  }

  function refreshCounts() {
    setCounts(getLocalDataCounts());
    setNotice("已重新读取当前浏览器中的本机数据。");
    setIsError(false);
  }

  return (
    <section className="rounded-3xl border border-brand-100 bg-brand-50/70 p-5 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="eyebrow">账号云端迁移</p>
          <h2 className="mt-2 text-xl font-semibold">把本机记录同步到当前账号</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">
            首次上传后，命盘、对话和手串会写入受 RLS 保护的账号空间。换电脑或手机登录后，可从云端恢复到新设备。
          </p>
        </div>
        <button type="button" onClick={refreshCounts} className="btn-secondary !px-3 !py-2 text-xs">
          <RefreshCw size={15} />
          重新统计
        </button>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <CountCard label="命盘" value={counts.bazi} />
        <CountCard label="对话" value={counts.chatThreads} />
        <CountCard label="消息" value={counts.chatMessages} />
        <CountCard label="手串" value={counts.bracelets} />
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <button
          type="button"
          disabled={Boolean(loading) || total === 0}
          onClick={upload}
          className="btn-primary w-full"
        >
          {loading === "upload" ? <LoaderCircle className="animate-spin" size={18} /> : <CloudUpload size={18} />}
          {loading === "upload" ? "正在同步…" : total === 0 ? "当前没有本机数据" : "同步本机数据到账号"}
        </button>
        <button
          type="button"
          disabled={Boolean(loading)}
          onClick={download}
          className={`btn-secondary w-full ${
            restoreConfirm ? "border-amber-300 text-amber-800" : ""
          }`}
        >
          {loading === "download" ? (
            <LoaderCircle className="animate-spin" size={18} />
          ) : (
            <CloudDownload size={18} />
          )}
          {loading === "download"
            ? "正在恢复…"
            : restoreConfirm
              ? "确认从云端恢复"
              : "从云端恢复到本机"}
        </button>
      </div>

      <p className="mt-4 text-xs leading-5 text-muted">
        {completed
          ? "此浏览器已完成过账号迁移。后续新建或修改的命盘、对话与手串会继续尝试自动同步。"
          : "尚未完成首次迁移。建议先点击“同步本机数据到账号”。"}
      </p>

      {notice && (
        <p
          className={`mt-4 rounded-2xl p-4 text-sm leading-6 ${
            isError ? "bg-red-50 text-red-700" : "bg-white text-brand-900"
          }`}
        >
          {notice}
        </p>
      )}
    </section>
  );
}

function CountCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl bg-white p-4 text-center shadow-sm ring-1 ring-brand-100">
      <strong className="block text-2xl text-brand-800">{value}</strong>
      <span className="mt-1 block text-xs text-muted">{label}</span>
    </div>
  );
}
