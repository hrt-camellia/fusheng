"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Download,
  Plus,
  RotateCcw,
  Save,
  Shuffle,
  Trash2,
} from "lucide-react";
import { crystals } from "@/data/crystals";
import {
  BEAD_SIZES,
  calculateBraceletLayout,
  circumference,
  createBeads,
  fillBraceletToWrist,
  recommendedLength,
  targetCount,
} from "@/lib/bracelet";
import {
  readBraceletDraft,
  saveBraceletDesign,
  writeBraceletDraft,
} from "@/lib/bracelet-storage";
import type { BraceletBead, BraceletDesign } from "@/types/bracelet";
import {
  createClient,
  isSupabaseConfigured,
} from "@/lib/supabase/client";
import { loadCloudBracelets } from "@/lib/cloud-sync";

const themes = [
  "事业与行动",
  "学业与专注",
  "关系与自我接纳",
  "情绪稳定",
  "自信表达",
];

const DEFAULT_WRIST = 155;
const DEFAULT_SIZE = 8;

function createDefaultDesign(): BraceletDesign {
  const now = new Date().toISOString();

  return {
    id: crypto.randomUUID(),
    name: `${themes[0]}手串`,
    theme: themes[0],
    wristSizeMm: DEFAULT_WRIST,
    style: "浅紫治愈",
    beads: createBeads(
      "amethyst",
      targetCount(DEFAULT_WRIST, DEFAULT_SIZE),
      DEFAULT_SIZE,
    ),
    createdAt: now,
    updatedAt: now,
  };
}

export function BraceletEditor() {
  const [designId, setDesignId] = useState("");
  const [createdAt, setCreatedAt] = useState("");
  const [wrist, setWrist] = useState(DEFAULT_WRIST);
  const [theme, setTheme] = useState(themes[0]);
  const [selected, setSelected] = useState("amethyst");
  const [selectedSize, setSelectedSize] = useState(DEFAULT_SIZE);
  const [beads, setBeads] = useState<BraceletBead[]>([]);
  const [notice, setNotice] = useState("");
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const local = readBraceletDraft();
    const stored = local ?? createDefaultDesign();

    setDesignId(stored.id);
    setCreatedAt(stored.createdAt);
    setWrist(stored.wristSizeMm);
    setTheme(stored.theme);
    setBeads(stored.beads);
    setSelectedSize(stored.beads[0]?.sizeMm ?? DEFAULT_SIZE);
    setHydrated(true);

    if (local || !isSupabaseConfigured()) return;

    let cancelled = false;
    const restoreCloud = async () => {
      try {
        const supabase = createClient();
        if (!supabase) return;
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) return;

        const designs = await loadCloudBracelets(supabase);
        const cloud = designs[0];
        if (!cloud || cancelled) return;

        writeBraceletDraft(cloud);
        setDesignId(cloud.id);
        setCreatedAt(cloud.createdAt);
        setWrist(cloud.wristSizeMm);
        setTheme(cloud.theme);
        setBeads(cloud.beads);
        setSelectedSize(cloud.beads[0]?.sizeMm ?? DEFAULT_SIZE);
        setNotice("已从当前账号恢复最近保存的手串方案。");
      } catch {
        // 云端不可用时继续使用本机默认设计。
      }
    };

    void restoreCloud();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!hydrated || !designId || beads.length === 0) return;

    writeBraceletDraft({
      id: designId,
      name: `${theme}手串`,
      theme,
      wristSizeMm: wrist,
      style: "浅紫治愈",
      beads,
      createdAt: createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  }, [beads, createdAt, designId, hydrated, theme, wrist]);

  const total = circumference(beads);
  const targetLength = recommendedLength(wrist);
  const layout = useMemo(() => calculateBraceletLayout(beads), [beads]);
  const positions = layout.positions;

  function add() {
    setBeads((current) => [
      ...current,
      {
        instanceId: crypto.randomUUID(),
        crystalId: selected,
        sizeMm: selectedSize,
      },
    ]);
  }

  function replace(index: number) {
    setBeads((current) =>
      current.map((bead, beadIndex) =>
        beadIndex === index
          ? {
              ...bead,
              crystalId: selected,
              sizeMm: selectedSize,
            }
          : bead,
      ),
    );
  }

  function randomize() {
    const ids = crystals
      .filter((crystal) =>
        theme.includes("关系")
          ? ["rose", "clear", "amethyst"].includes(crystal.id)
          : true,
      )
      .map((crystal) => crystal.id);

    setBeads(
      Array.from(
        { length: targetCount(wrist, selectedSize) },
        () => ({
          instanceId: crypto.randomUUID(),
          crystalId: ids[Math.floor(Math.random() * ids.length)],
          sizeMm: selectedSize,
        }),
      ),
    );
  }

  function applySizeToAll() {
    setBeads((current) =>
      current.map((bead) => ({
        ...bead,
        sizeMm: selectedSize,
      })),
    );
    setNotice(`已将全部珠子统一为 ${selectedSize} mm。`);
  }

  function autoFillToWrist() {
    const fitted = fillBraceletToWrist(
      beads,
      wrist,
      selected,
      selectedSize,
    );

    if (fitted.status === "too-long") {
      setNotice(
        `当前手串比建议佩戴周长长约 ${Math.round(fitted.difference)} mm。为避免破坏现有混合搭配，系统不会自动删除珠子；请先删除末珠或把部分珠子换成更小珠径。`,
      );
      return;
    }

    if (fitted.status === "already-fit") {
      setNotice(
        `当前估算周长为 ${fitted.finalLength} mm，已在建议佩戴周长 ±3 mm 范围内，无需补珠。`,
      );
      return;
    }

    setBeads(fitted.beads);
    setNotice(
      `已保留现有混合珠径与排列，并自动补入 ${fitted.addedSizes.join("、")} mm 珠子；当前估算周长 ${fitted.finalLength} mm。`,
    );
  }

  function resetAsNew() {
    const next = createDefaultDesign();

    setDesignId(next.id);
    setCreatedAt(next.createdAt);
    setWrist(next.wristSizeMm);
    setTheme(next.theme);
    setSelected("amethyst");
    setSelectedSize(DEFAULT_SIZE);
    setBeads(next.beads);
    setNotice("已新建一条独立手串，原保存方案不会被覆盖。");
  }

  async function save() {
    const now = new Date().toISOString();
    const design: BraceletDesign = {
      id: designId || crypto.randomUUID(),
      name: `${theme}手串`,
      theme,
      wristSizeMm: wrist,
      style: "浅紫治愈",
      beads,
      createdAt: createdAt || now,
      updatedAt: now,
    };

    setDesignId(design.id);
    setCreatedAt(design.createdAt);
    saveBraceletDesign(design);

    if (isSupabaseConfigured()) {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase!.auth.getUser();

      if (user) {
        const { error } = await supabase!.from("bracelet_designs").upsert(
          {
            id: design.id,
            user_id: user.id,
            name: design.name,
            theme: design.theme,
            wrist_size_mm: design.wristSizeMm,
            design,
            updated_at: design.updatedAt,
          },
          { onConflict: "id" },
        );

        setNotice(
          error
            ? `本机已保存，云端同步失败：${error.message}`
            : "方案已保存，并同步到当前账号。",
        );
        return;
      }
    }

    setNotice("方案已保存到本机历史记录，可从历史记录继续编辑。" );
  }

  function download() {
    const svg = document.getElementById("bracelet-svg");
    if (!svg) return;

    const blob = new Blob(
      [new XMLSerializer().serializeToString(svg)],
      { type: "image/svg+xml" },
    );
    const anchor = document.createElement("a");
    anchor.href = URL.createObjectURL(blob);
    anchor.download = "fusheng-bracelet.svg";
    anchor.click();
    URL.revokeObjectURL(anchor.href);
  }

  if (!hydrated) {
    return (
      <div className="card p-10 text-center text-sm text-muted">
        正在恢复你的手串设计…
      </div>
    );
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[300px_1fr_320px]">
      <aside className="card h-fit p-5">
        <p className="eyebrow">搭配设置</p>

        <label className="label mt-5">当前主题</label>
        <select
          className="field"
          value={theme}
          onChange={(event) => setTheme(event.target.value)}
        >
          {themes.map((item) => (
            <option key={item}>{item}</option>
          ))}
        </select>

        <label className="label mt-5">手腕净围：{wrist} mm</label>
        <input
          type="range"
          min="130"
          max="210"
          step="5"
          value={wrist}
          onChange={(event) => setWrist(Number(event.target.value))}
          className="w-full accent-[#6D5BD0]"
        />
        <p className="mt-2 text-xs leading-5 text-muted">
          建议预留约 10—15 mm 活动量；实际制作仍需结合弹力线和佩戴松紧复核。
        </p>

        <label className="label mt-5">当前珠径</label>
        <div className="grid grid-cols-4 gap-2">
          {BEAD_SIZES.map((size) => (
            <button
              key={size}
              type="button"
              onClick={() => setSelectedSize(size)}
              className={`rounded-xl border px-2 py-2 text-sm font-medium transition ${
                selectedSize === size
                  ? "border-brand-600 bg-brand-100 text-brand-800 ring-2 ring-brand-100"
                  : "border-brand-100 bg-white text-slate-600"
              }`}
            >
              {size} mm
            </button>
          ))}
        </div>
        <p className="mt-2 text-xs leading-5 text-muted">
          点击预览中的珠子时，会同时替换为当前材质与当前珠径。混合珠径会按真实尺寸紧密排布。
        </p>

        <div className="mt-4 grid gap-2">
          <button
            type="button"
            onClick={applySizeToAll}
            className="btn-secondary w-full"
          >
            全部统一为 {selectedSize} mm
          </button>
          <button
            type="button"
            onClick={autoFillToWrist}
            className="btn-secondary w-full"
          >
            自动补齐到建议手围
          </button>
          <button
            type="button"
            onClick={randomize}
            className="btn-secondary w-full"
          >
            <Shuffle size={17} />
            灵感搭配
          </button>
        </div>
      </aside>

      <section className="card min-h-[560px] p-4 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="eyebrow">实时预览</p>
            <h1 className="mt-2 font-serif text-3xl">我的能量手串</h1>
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={resetAsNew}
              className="btn-secondary !p-3"
              title="新建设计"
            >
              <RotateCcw size={18} />
            </button>
            <button
              type="button"
              onClick={download}
              className="btn-secondary !p-3"
              title="导出 SVG"
            >
              <Download size={18} />
            </button>
          </div>
        </div>

        <div
          className="mt-4 overflow-hidden rounded-3xl border border-[#D9D4E8] bg-[#ECE9F6]"
          style={{
            backgroundImage: [
              "linear-gradient(45deg, rgba(109,91,208,.045) 25%, transparent 25%)",
              "linear-gradient(-45deg, rgba(109,91,208,.045) 25%, transparent 25%)",
              "linear-gradient(45deg, transparent 75%, rgba(109,91,208,.045) 75%)",
              "linear-gradient(-45deg, transparent 75%, rgba(109,91,208,.045) 75%)",
            ].join(", "),
            backgroundPosition: "0 0, 0 10px, 10px -10px, -10px 0px",
            backgroundSize: "20px 20px",
          }}
        >
          <svg
            id="bracelet-svg"
            viewBox="0 0 420 420"
            className="mx-auto h-auto w-full max-w-[520px]"
            xmlns="http://www.w3.org/2000/svg"
          >
            <defs>
              {crystals.map((crystal) => (
                <radialGradient
                  key={crystal.id}
                  id={`g-${crystal.id}`}
                  cx="32%"
                  cy="25%"
                >
                  <stop offset="0" stopColor="#fff" stopOpacity=".9" />
                  <stop offset=".48" stopColor={crystal.color} />
                  <stop
                    offset="1"
                    stopColor={crystal.color}
                    stopOpacity=".76"
                  />
                </radialGradient>
              ))}
              <filter id="bead-shadow" x="-40%" y="-40%" width="180%" height="180%">
                <feDropShadow
                  dx="0"
                  dy="2"
                  stdDeviation="2.2"
                  floodColor="#4A4266"
                  floodOpacity=".22"
                />
              </filter>
            </defs>

            <circle
              cx="210"
              cy="210"
              r={layout.orbitRadius}
              fill="none"
              stroke="#C8C0E2"
              strokeWidth="2"
              strokeDasharray="5 8"
            />

            {positions.map(({ bead, x, y, radius }, index) => {
              const isClear = bead.crystalId === "clear";

              return (
                <g
                  key={bead.instanceId}
                  onClick={() => replace(index)}
                  className="cursor-pointer"
                  filter="url(#bead-shadow)"
                >
                  {isClear && (
                    <circle
                      cx={x}
                      cy={y}
                      r={radius + 2.5}
                      fill="rgba(255,255,255,.32)"
                      stroke="#8F98AD"
                      strokeWidth="2"
                    />
                  )}
                  <circle
                    cx={x}
                    cy={y}
                    r={radius}
                    fill={`url(#g-${bead.crystalId})`}
                    stroke={isClear ? "#A0A8BA" : "#FFFFFF"}
                    strokeWidth={isClear ? "2.2" : "3"}
                  />
                  <circle
                    cx={x - radius * 0.3}
                    cy={y - radius * 0.34}
                    r={Math.max(2.2, radius * 0.18)}
                    fill="#fff"
                    opacity=".7"
                  />
                </g>
              );
            })}
          </svg>
        </div>

        <p className="mt-4 text-center text-sm leading-6 text-muted">
          点击任意珠子，将其替换为右侧当前材质和左侧当前珠径。不同珠径会按相邻珠子的实际尺寸自动收紧，
          不再平均留出空隙；未保存的编辑也会在本机自动保留。
        </p>
      </section>

      <aside className="card h-fit p-5">
        <p className="eyebrow">水晶素材库</p>

        <div className="mt-4 grid grid-cols-2 gap-3">
          {crystals.map((crystal) => {
            const isClear = crystal.id === "clear";

            return (
              <button
                key={crystal.id}
                type="button"
                onClick={() => setSelected(crystal.id)}
                className={`rounded-2xl border p-3 text-left transition ${
                  selected === crystal.id
                    ? "border-brand-600 bg-brand-50 ring-4 ring-brand-100"
                    : "border-brand-100 bg-white"
                }`}
              >
                <span
                  className={`mx-auto block h-10 w-10 rounded-full border-2 shadow ${
                    isClear ? "border-slate-400" : "border-white"
                  }`}
                  style={{ background: crystal.gradient }}
                />
                <strong className="mt-2 block text-center text-sm">
                  {crystal.name}
                </strong>
              </button>
            );
          })}
        </div>

        <div className="mt-5 flex gap-2">
          <button
            type="button"
            onClick={add}
            className="btn-secondary flex-1 !px-3"
          >
            <Plus size={17} />
            添加
          </button>
          <button
            type="button"
            onClick={() => setBeads((current) => current.slice(0, -1))}
            className="btn-secondary !px-3"
            title="删除末珠"
          >
            <Trash2 size={17} />
          </button>
        </div>

        <div className="mt-5 rounded-2xl bg-brand-50 p-4 text-sm">
          <p>
            珠子数量：<strong>{beads.length}</strong>
          </p>
          <p className="mt-2">
            估算周长：<strong>{total} mm</strong>
          </p>
          <p className="mt-2">
            建议佩戴周长：<strong>{targetLength} mm</strong>
          </p>
          <p
            className={`mt-2 ${
              Math.abs(total - targetLength) > 12
                ? "text-amber-700"
                : "text-emerald-700"
            }`}
          >
            {Math.abs(total - targetLength) > 12
              ? "尺寸与建议佩戴周长偏差较大"
              : "尺寸处于初步可用范围"}
          </p>
        </div>

        <button
          type="button"
          onClick={save}
          className="btn-primary mt-5 w-full"
        >
          <Save size={17} />
          保存方案
        </button>

        {notice && (
          <p className="mt-3 text-xs leading-5 text-muted">{notice}</p>
        )}

        <p className="mt-5 text-xs leading-5 text-muted">
          水晶寓意属于文化与生活方式表达，不承诺改变健康、财富、感情或其他现实结果。
        </p>
      </aside>
    </div>
  );
}
