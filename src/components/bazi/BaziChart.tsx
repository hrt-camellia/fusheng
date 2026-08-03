import Link from "next/link";
import { CalendarDays, Info, MapPin, MessageCircleHeart, RotateCcw } from "lucide-react";
import type { BaziResult } from "@/types/bazi";

export function BaziChart({
  result,
  onReset,
}: {
  result: BaziResult | null;
  onReset?: () => void;
}) {
  if (!result) {
    return (
      <section className="card grid min-h-[560px] place-items-center p-8 text-center">
        <div>
          <div className="mx-auto grid h-24 w-24 place-items-center rounded-full bg-brand-100 font-serif text-3xl text-brand-700">
            八字
          </div>
          <h2 className="mt-6 font-serif text-2xl">等待出生信息</h2>
          <p className="mt-3 max-w-md text-sm leading-6 text-muted">
            先搜索并选择出生地点。系统取得经纬度和IANA时区后，才会生成真实四柱，不再返回随机演示结果。
          </p>
        </div>
      </section>
    );
  }

  return (
    <section className="card p-6 sm:p-8">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="eyebrow">确定性排盘引擎</p>
          <h2 className="mt-2 font-serif text-3xl">四柱命盘</h2>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-2">
          <span className="rounded-full bg-brand-100 px-3 py-1 text-xs text-brand-800">
            计算时间：{result.correctedTime}
          </span>
          {onReset && (
            <button type="button" onClick={onReset} className="btn-secondary !px-3 !py-2 text-xs">
              <RotateCcw size={15} />
              重新排盘
            </button>
          )}
        </div>
      </div>

      <div className="mt-5 flex gap-3 rounded-2xl border border-brand-100 bg-brand-50 p-4 text-sm">
        <MapPin className="mt-0.5 shrink-0 text-brand-700" size={18} />
        <div>
          <p className="font-medium text-ink">{result.location.displayName}</p>
          <p className="mt-1 text-xs leading-5 text-muted">
            经度 {result.location.longitude.toFixed(4)}° · 纬度 {result.location.latitude.toFixed(4)}° · {result.location.timezone}
          </p>
        </div>
      </div>

      <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {result.pillars.map((pillar) => (
          <div
            key={pillar.label}
            className="rounded-3xl border border-brand-100 bg-brand-50 p-5 text-center"
          >
            <p className="text-xs text-muted">{pillar.label}</p>
            <p className="mt-4 font-serif text-4xl tracking-widest">
              {pillar.stem}
              {pillar.branch}
            </p>
            <p className="mt-3 text-sm text-brand-700">{pillar.element}</p>
          </div>
        ))}
      </div>

      <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl bg-white p-4 ring-1 ring-brand-100">
          <p className="text-xs text-muted">日主</p>
          <p className="mt-2 font-serif text-xl">
            {result.dayMaster.polarity}{result.dayMaster.element} · {result.dayMaster.stem}
          </p>
        </div>
        <div className="rounded-2xl bg-white p-4 ring-1 ring-brand-100">
          <p className="text-xs text-muted">民用出生时间</p>
          <p className="mt-2 text-sm font-medium">{result.calendar.civilSolar}</p>
        </div>
        <div className="rounded-2xl bg-white p-4 ring-1 ring-brand-100">
          <p className="text-xs text-muted">计算采用时间</p>
          <p className="mt-2 text-sm font-medium">{result.calendar.calculationSolar}</p>
        </div>
        <div className="rounded-2xl bg-white p-4 ring-1 ring-brand-100">
          <p className="text-xs text-muted">农历与生肖</p>
          <p className="mt-2 text-sm font-medium">
            {result.calendar.lunar} · {result.calendar.zodiac}
          </p>
        </div>
      </div>

      <div className="mt-6 rounded-2xl bg-white p-5 ring-1 ring-brand-100">
        <h3 className="font-semibold">五行概览</h3>
        <p className="mt-1 text-xs text-muted">按四柱天干与地支主五行共8项统计</p>
        <div className="mt-4 grid grid-cols-5 gap-2">
          {Object.entries(result.elements).map(([key, value]) => (
            <div key={key} className="text-center">
              <div className="mx-auto flex h-20 w-5 items-end rounded-full bg-brand-100">
                <div
                  className="w-full rounded-full bg-brand-500"
                  style={{ height: `${Math.max(8, Number(value) * 12.5)}%` }}
                />
              </div>
              <span className="mt-2 block text-sm">
                {key} {value}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-6 flex gap-3 rounded-2xl bg-amber-50 p-4 text-sm leading-6 text-amber-900">
        <Info className="mt-0.5 shrink-0" size={18} />
        <div>
          <p>{result.summary}</p>
          {result.warnings.map((warning) => (
            <p key={warning} className="mt-1">
              • {warning}
            </p>
          ))}
        </div>
      </div>

      <div className="mt-6 flex flex-col gap-3 sm:flex-row">
        <Link href="/fortune" className="btn-primary">
          <CalendarDays size={18} />
          查看今日命理
        </Link>
        <Link href="/chat" className="btn-secondary">
          <MessageCircleHeart size={18} />
          带着命盘问浮生
        </Link>
      </div>
    </section>
  );
}
