"use client";

import { useEffect, useMemo, useState } from "react";
import { Info, LoaderCircle, Sparkles } from "lucide-react";
import type { BaziResult, BirthInput } from "@/types/bazi";
import type { BirthLocation } from "@/types/location";
import { LocationPicker } from "@/components/location/LocationPicker";
import {
  clearActiveBazi,
  readActiveBazi,
  readBaziDraft,
  writeActiveBazi,
  writeBaziDraft,
} from "@/lib/client-storage";
import { BaziChart } from "./BaziChart";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";
import {
  deleteActiveBaziFromCloud,
  loadLatestCloudBazi,
  uploadActiveBazi,
} from "@/lib/cloud-sync";

const initial: BirthInput = {
  name: "",
  date: "1998-08-08",
  time: "12:00",
  place: "",
  timezone: "",
  gender: "female",
  useTrueSolarTime: true,
  dayBoundaryMode: "ZI_HOUR_23",
};

function locationFromForm(form: BirthInput): BirthLocation | null {
  if (
    !form.place ||
    !form.timezone ||
    typeof form.longitude !== "number" ||
    typeof form.latitude !== "number"
  ) {
    return null;
  }

  return {
    id: form.locationId ?? 0,
    name: form.place.split(" · ")[0] || form.place,
    displayName: form.place,
    latitude: form.latitude,
    longitude: form.longitude,
    timezone: form.timezone,
    countryCode: form.countryCode ?? "",
    precision: form.locationPrecision,
    source: form.locationSource,
    addressType: form.addressType,
  };
}

export function BaziForm() {
  const [form, setForm] = useState<BirthInput>(initial);
  const [result, setResult] = useState<BaziResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [restored, setRestored] = useState(false);
  const [cloudNotice, setCloudNotice] = useState("");

  useEffect(() => {
    const local = readActiveBazi();
    if (local) {
      setForm(local.input);
      setResult(local.result);
    } else {
      const draft = readBaziDraft();
      if (draft) setForm(draft);
    }
    setRestored(true);

    if (!isSupabaseConfigured()) return;

    let cancelled = false;
    const restoreCloud = async () => {
      try {
        const supabase = createClient();
        if (!supabase) return;
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) return;

        const cloud = await loadLatestCloudBazi(supabase);
        const current = readActiveBazi();
        if (!cloud || (current && current.savedAt >= cloud.savedAt)) return;

        writeActiveBazi(cloud);
        if (!cancelled) {
          setForm(cloud.input);
          setResult(cloud.result);
          setCloudNotice("已从当前账号恢复较新的云端命盘。");
        }
      } catch (error) {
        if (!cancelled) {
          setCloudNotice(
            error instanceof Error ? `云端命盘读取失败：${error.message}` : "云端命盘读取失败。",
          );
        }
      }
    };

    void restoreCloud();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (restored) writeBaziDraft(form);
  }, [form, restored]);

  const selectedLocation = locationFromForm(form);
  const boundarySensitive = useMemo(() => {
    const hour = Number(form.time.split(":")[0]);
    return hour === 23 || hour === 0;
  }, [form.time]);

  const set = <K extends keyof BirthInput>(key: K, value: BirthInput[K]) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  function setLocation(location: BirthLocation | null) {
    if (!location) {
      setForm((current) => ({
        ...current,
        place: "",
        longitude: undefined,
        latitude: undefined,
        timezone: "",
        locationId: undefined,
        countryCode: undefined,
        locationPrecision: undefined,
        locationSource: undefined,
        addressType: undefined,
      }));
      return;
    }

    setForm((current) => ({
      ...current,
      place: location.displayName,
      longitude: location.longitude,
      latitude: location.latitude,
      timezone: location.timezone,
      locationId: location.id,
      countryCode: location.countryCode,
      locationPrecision: location.precision,
      locationSource: location.source,
      addressType: location.addressType,
    }));
  }

  async function resetRecord() {
    clearActiveBazi();
    setForm(initial);
    setResult(null);
    setError("");
    setCloudNotice("");

    if (!isSupabaseConfigured()) return;
    try {
      const supabase = createClient();
      if (!supabase) return;
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) await deleteActiveBaziFromCloud(supabase, user.id);
    } catch (error) {
      setCloudNotice(
        error instanceof Error ? `云端命盘清除失败：${error.message}` : "云端命盘清除失败。",
      );
    }
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError("");

    if (!selectedLocation) {
      setError("请先搜索并选择准确的出生地点，不能只输入地点文字。");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("/api/bazi", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      const data = (await response.json()) as BaziResult & { error?: string };

      if (!response.ok) {
        throw new Error(data.error || "排盘失败");
      }

      const profile = {
        input: form,
        result: data,
        savedAt: new Date().toISOString(),
      };
      setResult(data);
      writeActiveBazi(profile);

      if (isSupabaseConfigured()) {
        const supabase = createClient();
        if (supabase) {
          const {
            data: { user },
          } = await supabase.auth.getUser();
          if (user) {
            try {
              await uploadActiveBazi(supabase, user.id, profile);
              setCloudNotice("命盘已保存，并同步到当前账号。");
            } catch (syncError) {
              setCloudNotice(
                syncError instanceof Error
                  ? `命盘已保存在本机，云端同步失败：${syncError.message}`
                  : "命盘已保存在本机，云端同步失败。",
              );
            }
          }
        }
      }
    } catch (submitError) {
      setResult(null);
      setError(submitError instanceof Error ? submitError.message : "排盘失败");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[440px_1fr]">
      <form onSubmit={submit} className="card h-fit p-6 sm:p-8">
        <p className="eyebrow">出生信息</p>
        <h1 className="mt-2 font-serif text-3xl">生成你的四柱命盘</h1>
        <p className="mt-3 text-sm leading-6 text-muted">
          本页面使用确定性排盘引擎。出生地点支持省、市、区县、乡镇或街道逐级选择，也可直接搜索完整地址。系统自动获取经纬度与时区，AI不参与四柱计算。
        </p>

        {result && (
          <div className="mt-4 rounded-2xl border border-brand-100 bg-brand-50 p-4 text-sm leading-6 text-brand-900">
            已恢复你最近一次确认的命盘。切换页面或刷新后仍会保留；点击右侧“重新排盘”才会清除。
          </div>
        )}

        <div className="mt-7 space-y-5">
          <div>
            <label className="label">称呼（可选）</label>
            <input
              className="field"
              value={form.name}
              onChange={(event) => set("name", event.target.value)}
              placeholder="如何称呼你"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">出生日期</label>
              <input
                required
                type="date"
                className="field"
                value={form.date}
                onChange={(event) => set("date", event.target.value)}
              />
            </div>
            <div>
              <label className="label">出生时间</label>
              <input
                required
                type="time"
                className="field"
                value={form.time}
                onChange={(event) => set("time", event.target.value)}
              />
            </div>
          </div>

          <div>
            <label className="label">出生地点</label>
            <LocationPicker value={selectedLocation} onChange={setLocation} />
          </div>

          <div>
            <label className="label">性别</label>
            <select
              className="field"
              value={form.gender}
              onChange={(event) =>
                set("gender", event.target.value as BirthInput["gender"])
              }
            >
              <option value="female">女</option>
              <option value="male">男</option>
            </select>
            <p className="mt-2 text-xs leading-5 text-muted">
              性别用于大运顺逆排；四柱本身仍由出生时间决定。
            </p>
          </div>

          <div>
            <label className="label">换日规则</label>
            <select
              className="field"
              value={form.dayBoundaryMode}
              onChange={(event) =>
                set(
                  "dayBoundaryMode",
                  event.target.value as BirthInput["dayBoundaryMode"],
                )
              }
            >
              <option value="ZI_HOUR_23">子初换日（23:00起按次日）</option>
              <option value="MIDNIGHT_00">午夜换日（00:00起按次日）</option>
            </select>

            <div className="mt-3 rounded-2xl border border-brand-100 bg-white p-4 text-xs leading-6 text-muted">
              <div className="flex gap-2">
                <Info className="mt-0.5 shrink-0 text-brand-700" size={16} />
                <div>
                  <p>
                    <strong className="text-ink">子初换日：</strong>
                    晚上23:00开始，日柱按次日计算。
                  </p>
                  <p className="mt-1">
                    <strong className="text-ink">午夜换日：</strong>
                    到00:00才进入次日。
                  </p>
                  <p className="mt-1">
                    不同排盘体系采用的规则并不完全一致。若你已有可信参考命盘，请选择与其相同的规则；出生时间远离23点前后时，通常不会影响结果。
                  </p>
                </div>
              </div>
            </div>

            {boundarySensitive && (
              <p className="mt-2 rounded-xl bg-amber-50 p-3 text-xs leading-5 text-amber-900">
                你的出生时间位于换日边界附近，建议分别用两种规则排盘，并与家中记录或可信参考工具核对日柱。
              </p>
            )}
          </div>

          <label className="flex items-start gap-3 rounded-2xl bg-brand-50 p-4 text-sm">
            <input
              type="checkbox"
              className="mt-1 accent-[#6D5BD0]"
              checked={form.useTrueSolarTime}
              onChange={(event) =>
                set("useTrueSolarTime", event.target.checked)
              }
            />
            <span>
              <strong className="block">使用真太阳时校正</strong>
              <span className="mt-1 block text-muted">
                根据出生地经度、时区与均时差修正民用时间；建议保持开启。
              </span>
            </span>
          </label>
        </div>

        {error && (
          <p className="mt-4 rounded-xl bg-red-50 p-3 text-sm leading-6 text-red-700">
            {error}
          </p>
        )}

        {cloudNotice && (
          <p className="mt-4 rounded-xl bg-brand-50 p-3 text-sm leading-6 text-brand-900">
            {cloudNotice}
          </p>
        )}

        <button disabled={loading} className="btn-primary mt-6 w-full">
          {loading ? (
            <LoaderCircle className="animate-spin" size={18} />
          ) : (
            <Sparkles size={18} />
          )}
          {result ? "重新计算并更新命盘" : "开始真实排盘"}
        </button>
      </form>

      <BaziChart result={result} onReset={resetRecord} />
    </div>
  );
}
