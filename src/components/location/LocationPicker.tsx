"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Check,
  LoaderCircle,
  MapPin,
  Search,
  X,
} from "lucide-react";
import type {
  AmapDistrictOption,
  BirthLocation,
  LocationPrecision,
} from "@/types/location";

type Props = {
  value: BirthLocation | null;
  onChange: (location: BirthLocation | null) => void;
};

type DistrictLevelState = {
  options: AmapDistrictOption[];
  selectedAdcode: string;
};

const precisionLabels: Record<LocationPrecision, string> = {
  coordinate: "精确坐标",
  address: "详细地点",
  town: "乡镇/街道",
  district: "区县",
  city: "城市",
  region: "省级区域",
  unknown: "地点",
};

function levelLabel(level?: AmapDistrictOption["level"], depth = 0): string {
  if (level === "province") return "省 / 直辖市";
  if (level === "city") return "城市";
  if (level === "district") return "区 / 县";
  if (level === "street") return "乡镇 / 街道";
  return ["省 / 直辖市", "城市", "区 / 县", "乡镇 / 街道"][depth] ?? "下级行政区";
}

function precisionFromDistrictLevel(level: AmapDistrictOption["level"]): LocationPrecision {
  if (level === "street") return "town";
  if (level === "district") return "district";
  if (level === "city") return "city";
  if (level === "province") return "region";
  return "unknown";
}

function createBirthLocation(
  option: AmapDistrictOption,
  selections: AmapDistrictOption[],
): BirthLocation | null {
  if (typeof option.longitude !== "number" || typeof option.latitude !== "number") {
    return null;
  }

  const names = selections.map((item) => item.name);
  const displayName = names.filter((name, index) => names.indexOf(name) === index).join(" · ");

  return {
    id: option.id,
    name: option.name,
    displayName,
    latitude: option.latitude,
    longitude: option.longitude,
    timezone: "Asia/Shanghai",
    countryCode: "CN",
    country: "中国",
    admin1: selections.find((item) => item.level === "province")?.name,
    admin2: selections.find((item) => item.level === "city")?.name,
    admin3:
      selections.find((item) => item.level === "street")?.name ||
      selections.find((item) => item.level === "district")?.name,
    precision: precisionFromDistrictLevel(option.level),
    source: "amap",
    addressType: option.level,
  };
}

export function LocationPicker({ value, onChange }: Props) {
  const [mode, setMode] = useState<"cascade" | "search">("cascade");
  const [levels, setLevels] = useState<DistrictLevelState[]>([]);
  const [selections, setSelections] = useState<AmapDistrictOption[]>([]);
  const [loadingDepth, setLoadingDepth] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<BirthLocation[]>([]);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState("");

  const currentSelection = selections.at(-1) ?? null;
  const canConfirm = Boolean(
    currentSelection &&
      typeof currentSelection.longitude === "number" &&
      typeof currentSelection.latitude === "number",
  );

  const currentPath = useMemo(
    () => selections.map((item) => item.name).join(" · "),
    [selections],
  );

  useEffect(() => {
    if (value || levels.length > 0) return;
    void loadInitial();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  async function fetchDistrictChildren(keywords: string) {
    const response = await fetch(
      `/api/locations/districts?keywords=${encodeURIComponent(keywords)}`,
    );
    const data = (await response.json()) as {
      items?: AmapDistrictOption[];
      error?: string;
    };
    if (!response.ok) throw new Error(data.error || "行政区加载失败");
    return data.items ?? [];
  }

  async function loadInitial() {
    setError("");
    setLoadingDepth(0);
    try {
      const items = await fetchDistrictChildren("中国");
      setLevels([{ options: items, selectedAdcode: "" }]);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "行政区加载失败");
    } finally {
      setLoadingDepth(null);
    }
  }

  async function selectDistrict(depth: number, adcode: string) {
    const option = levels[depth]?.options.find((item) => item.adcode === adcode);
    if (!option) return;

    onChange(null);
    setError("");

    const nextSelections = [...selections.slice(0, depth), option];
    setSelections(nextSelections);
    setLevels((current) =>
      current.slice(0, depth + 1).map((level, index) =>
        index === depth ? { ...level, selectedAdcode: adcode } : level,
      ),
    );

    if (option.level === "street") return;

    setLoadingDepth(depth + 1);
    try {
      const children = await fetchDistrictChildren(option.adcode);
      if (children.length > 0) {
        setLevels((current) => [
          ...current.slice(0, depth + 1),
          { options: children, selectedAdcode: "" },
        ]);
      }
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "下级行政区加载失败");
    } finally {
      setLoadingDepth(null);
    }
  }

  function confirmCascadeLocation() {
    if (!currentSelection) return;
    const location = createBirthLocation(currentSelection, selections);
    if (!location) {
      setError("当前行政区没有可用坐标，请继续选择更具体的区县或乡镇。 ");
      return;
    }
    onChange(location);
    setError("");
  }

  async function searchLocation() {
    const query = searchQuery.trim();
    if (query.length < 2) {
      setError("请输入至少两个字，并尽量包含省、市、区县或乡镇。 ");
      return;
    }

    setSearching(true);
    setError("");
    setSearchResults([]);

    try {
      const response = await fetch(`/api/locations?q=${encodeURIComponent(query)}`);
      const data = (await response.json()) as {
        results?: BirthLocation[];
        error?: string;
      };
      if (!response.ok) throw new Error(data.error || "地点搜索失败");
      setSearchResults(data.results ?? []);
      if ((data.results ?? []).length === 0) {
        setError("没有找到匹配结果，请补全上级行政区，例如“省 + 市 + 区县 + 乡镇/街道”。 ");
      }
    } catch (searchError) {
      setError(searchError instanceof Error ? searchError.message : "地点搜索失败");
    } finally {
      setSearching(false);
    }
  }

  if (value) {
    const precision = value.precision ?? "unknown";
    return (
      <div className="rounded-2xl border border-brand-200 bg-brand-50 p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex min-w-0 gap-3">
            <span className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-white text-brand-700 shadow-sm">
              <Check size={18} />
            </span>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <p className="font-medium text-ink">{value.displayName}</p>
                <span className="rounded-full bg-white px-2.5 py-1 text-[11px] font-medium text-brand-700">
                  {precisionLabels[precision]}
                </span>
              </div>
              <div className="mt-2 grid gap-1 text-xs leading-5 text-muted sm:grid-cols-3 sm:gap-3">
                <span>经度 {value.longitude.toFixed(5)}°</span>
                <span>纬度 {value.latitude.toFixed(5)}°</span>
                <span>{value.timezone}</span>
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              onChange(null);
              setSelections([]);
              setSearchResults([]);
              setSearchQuery("");
              if (levels.length === 0) void loadInitial();
            }}
            className="rounded-xl p-2 text-muted transition hover:bg-white hover:text-brand-700"
            aria-label="重新选择出生地点"
          >
            <X size={18} />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="grid grid-cols-2 gap-2 rounded-2xl bg-brand-50 p-1.5">
        <button
          type="button"
          onClick={() => setMode("cascade")}
          className={`rounded-xl px-3 py-2 text-sm font-medium transition ${
            mode === "cascade" ? "bg-white text-brand-700 shadow-sm" : "text-muted"
          }`}
        >
          逐级选择
        </button>
        <button
          type="button"
          onClick={() => setMode("search")}
          className={`rounded-xl px-3 py-2 text-sm font-medium transition ${
            mode === "search" ? "bg-white text-brand-700 shadow-sm" : "text-muted"
          }`}
        >
          直接搜索
        </button>
      </div>

      {mode === "cascade" ? (
        <div className="mt-3 space-y-3">
          {levels.map((level, depth) => {
            const optionLevel = level.options[0]?.level;
            return (
              <label key={`${depth}-${optionLevel ?? "unknown"}`} className="block">
                <span className="label">{levelLabel(optionLevel, depth)}</span>
                <select
                  className="field"
                  value={level.selectedAdcode}
                  onChange={(event) => void selectDistrict(depth, event.target.value)}
                >
                  <option value="">请选择{levelLabel(optionLevel, depth)}</option>
                  {level.options.map((option) => (
                    <option key={`${option.adcode}-${option.name}`} value={option.adcode}>
                      {option.name}
                    </option>
                  ))}
                </select>
              </label>
            );
          })}

          {loadingDepth !== null && (
            <div className="flex items-center gap-2 rounded-xl bg-brand-50 px-3 py-2 text-xs text-muted">
              <LoaderCircle className="animate-spin" size={15} />
              正在加载下一级行政区…
            </div>
          )}

          {currentSelection && (
            <div className="rounded-2xl border border-brand-100 bg-white p-4">
              <p className="text-sm font-medium text-ink">{currentPath}</p>
              <p className="mt-1 text-xs leading-5 text-muted">
                可继续选择更具体的乡镇/街道，也可以直接使用当前行政区的代表坐标。
              </p>
              <button
                type="button"
                disabled={!canConfirm}
                onClick={confirmCascadeLocation}
                className="btn-primary mt-3 w-full"
              >
                <MapPin size={17} />
                使用当前地点
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="mt-3">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <MapPin className="absolute left-4 top-3.5 text-brand-600" size={18} />
              <input
                className="field pl-11"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    void searchLocation();
                  }
                }}
                placeholder="例如：广东省深圳市龙岗区坂田街道"
                autoComplete="off"
              />
            </div>
            <button
              type="button"
              onClick={() => void searchLocation()}
              disabled={searching}
              className="btn-primary shrink-0 px-4"
            >
              {searching ? <LoaderCircle className="animate-spin" size={18} /> : <Search size={18} />}
              搜索
            </button>
          </div>

          {searchResults.length > 0 && (
            <div className="mt-2 max-h-80 overflow-y-auto rounded-2xl border border-brand-100 bg-white p-2 shadow-lg">
              {searchResults.map((location) => {
                const precision = location.precision ?? "unknown";
                return (
                  <button
                    key={`${location.id}-${location.longitude}-${location.latitude}`}
                    type="button"
                    onClick={() => onChange(location)}
                    className="w-full rounded-xl px-4 py-3 text-left transition hover:bg-brand-50"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-medium text-ink">{location.displayName}</p>
                      <span className="rounded-full bg-brand-50 px-2 py-0.5 text-[10px] text-brand-700">
                        {precisionLabels[precision]}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-muted">
                      {location.longitude.toFixed(5)}°, {location.latitude.toFixed(5)}° · {location.timezone}
                    </p>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      {error && <p className="mt-2 rounded-xl bg-red-50 p-3 text-xs leading-5 text-red-700">{error}</p>}
      {!error && (
        <p className="mt-2 text-xs leading-5 text-muted">
          系统会自动获取行政区代表坐标与时区。无需填写经纬度；建议至少选择到区县，最好选择到乡镇或街道。
        </p>
      )}
    </div>
  );
}
