"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Edit3, LoaderCircle, Trash2, X } from "lucide-react";
import { crystals } from "@/data/crystals";
import {
  calculateBraceletLayout,
  normalizeBraceletDesign,
} from "@/lib/bracelet";
import {
  deleteBraceletDesign,
  readBraceletDesigns,
  writeBraceletDraft,
} from "@/lib/bracelet-storage";
import type { BraceletDesign } from "@/types/bracelet";
import {
  createClient,
  isSupabaseConfigured,
} from "@/lib/supabase/client";

export default function HistoryPage() {
  const router = useRouter();
  const [items, setItems] = useState<BraceletDesign[]>([]);
  const [source, setSource] = useState("本机");
  const [notice, setNotice] = useState("");
  const [pendingDelete, setPendingDelete] = useState<BraceletDesign | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    setItems(readBraceletDesigns());

    if (!isSupabaseConfigured()) return;

    const load = async () => {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase!.auth.getUser();

      if (!user) return;

      const { data, error } = await supabase!
        .from("bracelet_designs")
        .select("design")
        .order("created_at", { ascending: false })
        .limit(20);

      if (error) {
        setNotice(`云端记录读取失败：${error.message}`);
        return;
      }

      const remote = (data ?? [])
        .map((row) => normalizeBraceletDesign(row.design as BraceletDesign))
        .filter((design) => design.beads.length > 0);

      if (remote.length) {
        setItems(remote);
        setSource("云端账号");
      }
    };

    void load();
  }, []);

  function continueEditing(design: BraceletDesign) {
    writeBraceletDraft(design);
    router.push("/bracelet");
  }

  async function confirmDelete() {
    if (!pendingDelete || deleting) return;

    const design = pendingDelete;
    setDeleting(true);
    setNotice("");

    try {
      if (isSupabaseConfigured()) {
        const supabase = createClient();
        const {
          data: { user },
        } = await supabase!.auth.getUser();

        if (user) {
          const { error } = await supabase!
            .from("bracelet_designs")
            .delete()
            .eq("id", design.id)
            .eq("user_id", user.id);

          if (error) {
            setNotice(`云端删除失败：${error.message}`);
            return;
          }
        }
      }

      deleteBraceletDesign(design.id);
      setItems((current) => current.filter((item) => item.id !== design.id));
      setNotice(`已删除“${design.name}”。`);
      setPendingDelete(null);
    } catch (error) {
      setNotice(
        error instanceof Error
          ? `删除失败：${error.message}`
          : "删除失败，请稍后重试。",
      );
    } finally {
      setDeleting(false);
    }
  }

  return (
    <>
      <main className="shell py-10">
        <p className="eyebrow">{source}记录</p>
        <h1 className="mt-3 font-serif text-4xl">历史记录</h1>
        <p className="mt-3 text-muted">
          保存后的手串可以完整恢复珠子材质、珠径、顺序、主题和手围，也可以从这里删除。
        </p>

        {notice && (
          <p className="mt-5 rounded-2xl bg-brand-50 px-4 py-3 text-sm text-brand-800">
            {notice}
          </p>
        )}

        {items.length ? (
          <div className="mt-8 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {items.map((item) => {
              const sizes = Array.from(
                new Set(item.beads.map((bead) => `${bead.sizeMm} mm`)),
              ).join(" / ");

              return (
                <article key={item.id} className="card overflow-hidden p-5">
                  <BraceletPreview design={item} />

                  <span className="mt-5 inline-block rounded-full bg-brand-100 px-3 py-1 text-xs text-brand-800">
                    {item.theme}
                  </span>
                  <h2 className="mt-3 text-xl font-semibold">{item.name}</h2>
                  <p className="mt-2 text-sm leading-6 text-muted">
                    {item.beads.length} 颗 · 珠径 {sizes || "8 mm"} · 手腕净围 {item.wristSizeMm} mm
                  </p>

                  <div className="mt-5 grid grid-cols-[1fr_auto] gap-2">
                    <button
                      type="button"
                      onClick={() => continueEditing(item)}
                      className="btn-secondary w-full"
                    >
                      <Edit3 size={17} />
                      恢复并继续设计
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setNotice("");
                        setPendingDelete(item);
                      }}
                      className="grid min-h-11 min-w-11 place-items-center rounded-2xl border border-red-100 bg-red-50 px-3 text-red-600 transition hover:border-red-200 hover:bg-red-100"
                      title="删除这条手串记录"
                      aria-label={`删除${item.name}`}
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <div className="card mt-8 p-10 text-center">
            <p className="text-muted">还没有保存的手串方案。</p>
            <Link href="/bracelet" className="btn-primary mt-5">
              去设计第一条
            </Link>
          </div>
        )}
      </main>

      {pendingDelete && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/35 px-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-bracelet-title"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !deleting) {
              setPendingDelete(null);
            }
          }}
        >
          <section className="w-full max-w-md rounded-3xl border border-white/70 bg-white p-6 shadow-2xl sm:p-7">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-red-600">删除手串记录</p>
                <h2 id="delete-bracelet-title" className="mt-2 text-2xl font-semibold text-slate-900">
                  确定删除“{pendingDelete.name}”吗？
                </h2>
              </div>

              <button
                type="button"
                onClick={() => setPendingDelete(null)}
                disabled={deleting}
                className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-slate-100 text-slate-500 transition hover:bg-slate-200 disabled:opacity-50"
                aria-label="关闭删除确认框"
              >
                <X size={19} />
              </button>
            </div>

            <p className="mt-4 text-sm leading-6 text-slate-600">
              删除后，这条记录将从历史列表中移除；若它同时是当前编辑草稿，草稿也会一并清除。此操作无法撤销。
            </p>

            <div className="mt-7 grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setPendingDelete(null)}
                disabled={deleting}
                className="btn-secondary w-full justify-center disabled:cursor-not-allowed disabled:opacity-50"
              >
                取消
              </button>

              <button
                type="button"
                onClick={() => void confirmDelete()}
                disabled={deleting}
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl bg-red-600 px-5 font-medium text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {deleting ? (
                  <>
                    <LoaderCircle size={18} className="animate-spin" />
                    正在删除
                  </>
                ) : (
                  <>
                    <Trash2 size={18} />
                    确认删除
                  </>
                )}
              </button>
            </div>
          </section>
        </div>
      )}
    </>
  );
}

function BraceletPreview({ design }: { design: BraceletDesign }) {
  const layout = calculateBraceletLayout(design.beads, {
    centerX: 110,
    centerY: 110,
    pxPerMm: 1.75,
    gapPx: 1,
    minOrbitRadius: 54,
    maxOrbitRadius: 78,
  });

  return (
    <div className="overflow-hidden rounded-2xl border border-[#D9D4E8] bg-[#ECE9F6]">
      <svg viewBox="0 0 220 220" className="h-auto w-full">
        <circle
          cx="110"
          cy="110"
          r={layout.orbitRadius}
          fill="none"
          stroke="#C8C0E2"
          strokeDasharray="4 6"
        />
        {layout.positions.map(({ bead, x, y, radius }) => {
          const crystal = crystals.find((item) => item.id === bead.crystalId);
          const isClear = bead.crystalId === "clear";
          const previewRadius = Math.max(5.5, radius * 0.55);

          return (
            <g key={bead.instanceId}>
              {isClear && (
                <circle
                  cx={x}
                  cy={y}
                  r={previewRadius + 1.5}
                  fill="rgba(255,255,255,.38)"
                  stroke="#8F98AD"
                  strokeWidth="1.5"
                />
              )}
              <circle
                cx={x}
                cy={y}
                r={previewRadius}
                fill={crystal?.color ?? "#8C73D9"}
                fillOpacity={isClear ? ".72" : ".9"}
                stroke={isClear ? "#A0A8BA" : "#FFFFFF"}
                strokeWidth="1.5"
              />
            </g>
          );
        })}
      </svg>
    </div>
  );
}
