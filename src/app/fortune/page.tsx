"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  CalendarDays,
  Clock3,
  Flower2,
  Gem,
  Hash,
  LoaderCircle,
  Palette,
  Utensils,
  type LucideIcon,
} from "lucide-react";
import {
  readActiveBazi,
  type StoredBaziProfile,
} from "@/lib/client-storage";
import type { DailyFortuneResult } from "@/types/fortune";

function localToday() {
  const now = new Date();
  const offset = now.getTimezoneOffset() * 60_000;

  return new Date(now.getTime() - offset).toISOString().slice(0, 10);
}

export default function FortunePage() {
  const [profile, setProfile] = useState<StoredBaziProfile | null>(null);
  const [date, setDate] = useState(localToday());
  const [result, setResult] = useState<DailyFortuneResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    setProfile(readActiveBazi());
  }, []);

  useEffect(() => {
    if (!profile) {
      setLoading(false);
      return;
    }

    const controller = new AbortController();

    setLoading(true);
    setError("");

    fetch("/api/fortune", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        date,
        input: profile.input,
        result: profile.result,
      }),
      signal: controller.signal,
    })
      .then(async (response) => {
        const data = (await response.json()) as DailyFortuneResult & {
          error?: string;
        };

        if (!response.ok) {
          throw new Error(data.error || "每日命理计算失败");
        }

        return data;
      })
      .then((data) => {
        setResult(data);
      })
      .catch((requestError: unknown) => {
        if (requestError instanceof DOMException && requestError.name === "AbortError") {
          return;
        }

        setResult(null);
        setError(
          requestError instanceof Error
            ? requestError.message
            : "每日命理计算失败",
        );
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      });

    return () => {
      controller.abort();
    };
  }, [date, profile]);

  if (!profile) {
    return (
      <main className="shell py-10">
        <section className="card mx-auto max-w-3xl p-8 text-center sm:p-12">
          <CalendarDays className="mx-auto text-brand-700" size={34} />

          <h1 className="mt-4 font-serif text-4xl">先建立你的命盘</h1>

          <p className="mx-auto mt-4 max-w-xl leading-7 text-muted">
            每日结果需要读取已确认的出生地点、四柱、日主与五行分布。
            当前没有找到命盘记录，因此不会生成公共随机内容。
          </p>

          <Link href="/bazi" className="btn-primary mt-7">
            前往真实排盘
          </Link>
        </section>
      </main>
    );
  }

  return (
    <main className="shell py-10 sm:py-14">
      <section className="mx-auto max-w-6xl">
        <div className="text-center">
          <p className="eyebrow">基于当前确认命盘</p>

          <h1 className="mt-3 font-serif text-4xl sm:text-5xl">
            每日命理推演
          </h1>

          <p className="mx-auto mt-4 max-w-2xl text-sm leading-6 text-muted">
            同一命盘在同一日期的结果固定，不使用随机刷新，
            也不让大模型重新计算四柱。
          </p>
        </div>

        <label className="mx-auto mt-7 flex max-w-sm items-center gap-3 rounded-2xl border border-brand-100 bg-white px-4 py-3">
          <CalendarDays size={18} className="text-brand-700" />

          <input
            type="date"
            value={date}
            onChange={(event) => setDate(event.target.value)}
            className="w-full bg-transparent text-sm outline-none"
          />
        </label>

        {loading && (
          <div className="card mx-auto mt-8 flex min-h-72 max-w-3xl items-center justify-center gap-3 text-muted">
            <LoaderCircle className="animate-spin" size={22} />
            正在计算当日干支与本命关系…
          </div>
        )}

        {!loading && error && (
          <div className="mx-auto mt-8 max-w-3xl rounded-2xl bg-red-50 p-5 text-sm leading-6 text-red-700">
            {error}
          </div>
        )}

        {!loading && result && (
          <>
            <div className="card mt-8 p-6 sm:p-8">
              <div className="grid gap-5 md:grid-cols-[1fr_auto_1fr] md:items-center">
                <div className="text-center md:text-right">
                  <p className="text-xs text-muted">你的日主</p>

                  <p className="mt-2 font-serif text-3xl">
                    {result.natal.dayMasterStem}
                    {result.natal.dayMasterElement}
                  </p>
                </div>

                <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-brand-100 text-brand-700">
                  ×
                </div>

                <div className="text-center md:text-left">
                  <p className="text-xs text-muted">当日干支</p>

                  <p className="mt-2 font-serif text-3xl">
                    {result.dailyPillar.stem}
                    {result.dailyPillar.branch}
                  </p>
                </div>
              </div>

              <div className="mx-auto mt-6 max-w-3xl rounded-2xl bg-brand-50 p-5 text-center">
                <p className="font-semibold text-brand-900">
                  {result.relation.title}
                </p>

                <p className="mt-2 text-sm leading-6 text-muted">
                  {result.relation.conciseMeaning}
                </p>

                <p className="mt-3 text-xs text-brand-700">
                  今日推荐五行：{result.recommendedElement}
                </p>
              </div>
            </div>

            <div className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              <article className="card overflow-hidden p-6">
                <div className="flex items-center gap-2 text-brand-700">
                  <Palette size={20} />
                  <p className="text-sm font-medium">幸运色</p>
                </div>

                <div className="mt-5 flex h-28 overflow-hidden rounded-3xl border border-black/5">
                  <div
                    className="flex-1"
                    style={{ backgroundColor: result.color.primaryHex }}
                  />

                  <div
                    className="flex-1"
                    style={{ backgroundColor: result.color.secondaryHex }}
                  />
                </div>

                <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="font-semibold">{result.color.primaryName}</p>
                    <p className="mt-1 text-xs text-muted">
                      {result.color.primaryHex}
                    </p>
                  </div>

                  <div className="text-right">
                    <p className="font-semibold">
                      {result.color.secondaryName}
                    </p>
                    <p className="mt-1 text-xs text-muted">
                      {result.color.secondaryHex}
                    </p>
                  </div>
                </div>
              </article>

              <FortuneCard
                icon={Hash}
                label="幸运数字"
                value={String(result.luckyNumber)}
                variant="number"
              />

              <FortuneCard icon={Gem} label="幸运配饰" value={result.accessory} />

              <FortuneCard
                icon={Utensils}
                label="幸运食物"
                value={result.food}
                tone="warm"
              />

              <FortuneCard
                icon={Flower2}
                label="幸运花"
                value={result.flower}
                tone="pink"
              />

              <FortuneCard
                icon={Clock3}
                label="幸运时段"
                value={result.luckyTime}
                variant="time"
              />
            </div>

            <p className="mx-auto mt-7 max-w-3xl text-center text-xs leading-5 text-muted">
              {result.methodNote}
              结果属于传统文化娱乐与生活灵感，不构成对事件结果的保证。
            </p>
          </>
        )}
      </section>
    </main>
  );
}

function FortuneCard({
  icon: Icon,
  label,
  value,
  tone = "purple",
  variant = "default",
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  tone?: "purple" | "warm" | "pink";
  variant?: "default" | "number" | "time";
}) {
  const background =
    tone === "warm"
      ? "bg-[#FFF8EE]"
      : tone === "pink"
        ? "bg-[#FFF3F7]"
        : "bg-brand-50";

  return (
    <article className="card p-6">
      <div className="flex items-center gap-2 text-brand-700">
        <Icon size={20} />
        <p className="text-sm font-medium">{label}</p>
      </div>

      <div
        className={`mt-5 flex h-28 items-center justify-center rounded-3xl px-5 text-center ${background}`}
      >
        {variant === "number" && (
          <div className="grid h-20 w-20 place-items-center rounded-full bg-white/75 shadow-sm ring-1 ring-brand-100">
            <span className="font-sans text-5xl font-semibold tracking-tight text-brand-800 tabular-nums">
              {value}
            </span>
          </div>
        )}

        {variant === "time" && (
          <span className="font-sans text-2xl font-medium tracking-[0.04em] text-slate-700 tabular-nums">
            {value}
          </span>
        )}

        {variant === "default" && (
          <h2 className="font-serif text-2xl font-semibold leading-relaxed text-slate-800">
            {value}
          </h2>
        )}
      </div>
    </article>
  );
}
