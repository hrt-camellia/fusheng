"use client";

import { useEffect, useRef, useState, type ChangeEvent, type MouseEvent } from "react";
import {
  Check,
  LocateFixed,
  LoaderCircle,
  MapPin,
  MoonStar,
  Search,
  Sparkles,
  SunMedium,
} from "lucide-react";
import { useThemeMode } from "@/components/theme/ThemeProvider";
import type { BirthLocation } from "@/types/location";
import type { ThemeMode } from "@/types/theme";

const options: Array<{
  mode: ThemeMode;
  label: string;
  description: string;
  icon: typeof SunMedium;
}> = [
  {
    mode: "auto",
    label: "跟随日落",
    description: "根据当前城市当天日出、日落自动切换",
    icon: Sparkles,
  },
  { mode: "day", label: "始终白天", description: "保持浅紫暖白界面", icon: SunMedium },
  { mode: "night", label: "始终夜晚", description: "保持流动星河界面", icon: MoonStar },
];

function formatTime(value?: number) {
  if (!value) return "--:--";
  return new Date(value).toLocaleTimeString("zh-CN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

export function ThemeSwitcher() {
  const {
    mode,
    setMode,
    isNight,
    sunTimes,
    status,
    statusMessage,
    refreshLocation,
    setManualLocation,
  } = useThemeMode();
  const ActiveIcon = isNight ? MoonStar : SunMedium;
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<BirthLocation[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState("");
  const requestIdRef = useRef(0);

  useEffect(() => {
    if (query.trim().length < 2) {
      setResults([]);
      setSearching(false);
      setSearchError("");
      return;
    }

    const requestId = ++requestIdRef.current;
    const timer = window.setTimeout(async () => {
      setSearching(true);
      setSearchError("");

      try {
        const response = await fetch(`/api/locations?q=${encodeURIComponent(query.trim())}`);
        const data = (await response.json()) as {
          results?: BirthLocation[];
          error?: string;
        };

        if (!response.ok) throw new Error(data.error || "城市查询失败");
        if (requestId === requestIdRef.current) setResults(data.results || []);
      } catch (error) {
        if (requestId === requestIdRef.current) {
          setResults([]);
          setSearchError(error instanceof Error ? error.message : "城市查询失败");
        }
      } finally {
        if (requestId === requestIdRef.current) setSearching(false);
      }
    }, 350);

    return () => window.clearTimeout(timer);
  }, [query]);

  async function selectLocation(location: BirthLocation) {
    setQuery(location.displayName);
    setResults([]);
    await setManualLocation(
      location.latitude,
      location.longitude,
      location.displayName,
    );
  }

  return (
    <details className="theme-switcher relative">
      <summary
        className="grid h-10 w-10 cursor-pointer list-none place-items-center rounded-2xl border border-brand-200 bg-white/80 text-brand-700 transition hover:bg-brand-50"
        aria-label="切换昼夜主题"
      >
        <ActiveIcon size={18} />
      </summary>

      <div className="absolute right-0 top-12 z-50 w-[22rem] max-w-[calc(100vw-2rem)] rounded-3xl border border-brand-100 bg-white/95 p-3 shadow-2xl backdrop-blur-xl">
        <div className="px-2 pb-2 pt-1">
          <p className="font-semibold">昼夜疗愈主题</p>
          <p className="mt-1 text-xs leading-5 text-muted">
            不再自动弹出定位权限。可直接搜索当前城市，定位只作为可选快捷方式。
          </p>
        </div>

        <div className="space-y-1">
          {options.map(({ mode: optionMode, label, description, icon: Icon }) => (
            <button
              key={optionMode}
              type="button"
              onClick={(event: MouseEvent<HTMLButtonElement>) => {
                setMode(optionMode);
                if (optionMode !== "auto") {
                  const details = event.currentTarget.closest("details") as HTMLDetailsElement | null;
                  if (details) details.open = false;
                }
              }}
              className={`flex w-full items-start gap-3 rounded-2xl px-3 py-3 text-left transition ${
                mode === optionMode ? "bg-brand-100 text-brand-900" : "hover:bg-brand-50"
              }`}
            >
              <span className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-white/75 text-brand-700">
                <Icon size={18} />
              </span>
              <span>
                <strong className="block text-sm">{label}</strong>
                <small className="mt-1 block leading-5 text-muted">{description}</small>
              </span>
            </button>
          ))}
        </div>

        {mode === "auto" && (
          <div className="mt-3 rounded-2xl border border-brand-100 bg-brand-50/70 p-3">
            <label className="text-xs font-medium text-ink">搜索当前城市</label>
            <div className="relative mt-2">
              <MapPin className="absolute left-3 top-3 text-brand-600" size={16} />
              <input
                className="field h-10 pl-9 pr-9 text-sm"
                value={query}
                onChange={(event: ChangeEvent<HTMLInputElement>) => setQuery(event.target.value)}
                placeholder="例如：上海、深圳、东京"
                autoComplete="off"
              />
              <span className="absolute right-3 top-3 text-muted">
                {searching ? (
                  <LoaderCircle className="animate-spin" size={16} />
                ) : (
                  <Search size={16} />
                )}
              </span>
            </div>

            {results.length > 0 && (
              <div className="mt-2 max-h-44 overflow-y-auto rounded-xl border border-brand-100 bg-white p-1 shadow-lg">
                {results.map((location) => (
                  <button
                    key={`${location.id}-${location.latitude}-${location.longitude}`}
                    type="button"
                    onClick={() => void selectLocation(location)}
                    className="flex w-full items-start gap-2 rounded-lg px-3 py-2 text-left text-xs transition hover:bg-brand-50"
                  >
                    <MapPin className="mt-0.5 shrink-0 text-brand-600" size={14} />
                    <span>
                      <strong className="block text-ink">{location.displayName}</strong>
                      <small className="mt-0.5 block text-muted">
                        {location.latitude.toFixed(3)}°, {location.longitude.toFixed(3)}°
                      </small>
                    </span>
                  </button>
                ))}
              </div>
            )}

            {searchError && <p className="mt-2 text-xs text-red-600">{searchError}</p>}

            <div className="mt-3 flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => void refreshLocation()}
                disabled={status === "loading"}
                className="inline-flex items-center gap-1.5 rounded-xl border border-brand-200 bg-white px-3 py-2 text-xs font-medium text-brand-700 transition hover:bg-brand-50 disabled:opacity-60"
              >
                {status === "loading" ? (
                  <LoaderCircle className="animate-spin" size={14} />
                ) : (
                  <LocateFixed size={14} />
                )}
                使用浏览器位置
              </button>

              {status === "ready" && (
                <span className="inline-flex items-center gap-1 text-xs text-emerald-700">
                  <Check size={13} /> 已设置
                </span>
              )}
            </div>

            <p className="mt-2 text-[11px] leading-5 text-muted">
              VS Code 内置浏览器对定位权限支持不稳定；弹窗一闪而过时，直接搜索城市，或用外部 Edge/Chrome 打开 localhost。
            </p>
          </div>
        )}

        <div className="mt-2 rounded-2xl bg-brand-50 p-3 text-xs leading-5 text-muted">
          {status === "ready" ? (
            <>
              {sunTimes?.locationLabel ? `${sunTimes.locationLabel} · ` : ""}
              今日日出 {formatTime(sunTimes?.sunrise)}，日落 {formatTime(sunTimes?.sunset)}
            </>
          ) : status === "loading" ? (
            statusMessage || "正在获取位置与日落时间…"
          ) : (
            statusMessage || "暂按本地 06:30—18:30 判断昼夜。"
          )}
        </div>
      </div>
    </details>
  );
}
