"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  readCachedThemeLocation,
  readThemeMode,
  writeCachedThemeLocation,
  writeThemeMode,
} from "@/lib/theme-settings";
import type { SunTimes, ThemeMode } from "@/types/theme";

export type ThemeLocationStatus =
  | "loading"
  | "ready"
  | "needs-location"
  | "permission-denied"
  | "fallback";

interface ThemeContextValue {
  mode: ThemeMode;
  setMode: (mode: ThemeMode) => void;
  isNight: boolean;
  sunTimes: SunTimes | null;
  status: ThemeLocationStatus;
  statusMessage: string;
  refreshLocation: () => Promise<void>;
  setManualLocation: (
    latitude: number,
    longitude: number,
    label?: string,
  ) => Promise<void>;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

function fallbackSunTimes(): SunTimes {
  const now = new Date();
  const sunrise = new Date(now);
  const sunset = new Date(now);
  sunrise.setHours(6, 30, 0, 0);
  sunset.setHours(18, 30, 0, 0);

  return {
    sunrise: sunrise.getTime(),
    sunset: sunset.getTime(),
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "local",
    latitude: Number.NaN,
    longitude: Number.NaN,
    locationLabel: "本地时间兜底",
    source: "fallback",
  };
}

function calculateNight(mode: ThemeMode, sunTimes: SunTimes | null) {
  if (mode === "night") return true;
  if (mode === "day") return false;

  const fallback = sunTimes || fallbackSunTimes();
  const now = Date.now();
  return now < fallback.sunrise || now >= fallback.sunset;
}

async function requestSunTimes(
  latitude: number,
  longitude: number,
  source: SunTimes["source"],
  locationLabel?: string,
) {
  const params = new URLSearchParams({
    lat: String(latitude),
    lon: String(longitude),
  });
  const response = await fetch(`/api/theme/sun?${params.toString()}`, {
    cache: "no-store",
  });

  const data = (await response.json()) as {
    sunrise?: number;
    sunset?: number;
    timezone?: string;
    error?: string;
  };

  if (!response.ok || !data.sunrise || !data.sunset) {
    throw new Error(data.error || "无法获取日落时间");
  }

  return {
    sunrise: data.sunrise,
    sunset: data.sunset,
    timezone: data.timezone || "local",
    latitude,
    longitude,
    locationLabel,
    source,
  } satisfies SunTimes;
}

function getBrowserLocation() {
  return new Promise<GeolocationPosition>((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("当前浏览器不支持定位"));
      return;
    }

    navigator.geolocation.getCurrentPosition(resolve, reject, {
      enableHighAccuracy: false,
      timeout: 12_000,
      maximumAge: 6 * 60 * 60 * 1000,
    });
  });
}

function locationErrorMessage(error: unknown) {
  if (error && typeof error === "object" && "code" in error) {
    const code = Number((error as { code?: unknown }).code);
    if (code === 1) {
      return "定位权限未授予。VS Code 内置浏览器可能会自动拒绝，请改用 Edge/Chrome，或直接搜索当前城市。";
    }
    if (code === 2) {
      return "暂时无法获取当前位置，请直接搜索当前城市。";
    }
    if (code === 3) {
      return "定位等待超时，请直接搜索当前城市。";
    }
  }

  if (error instanceof Error && error.message) return error.message;
  return "无法获取当前位置，请直接搜索当前城市。";
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [mode, setModeState] = useState<ThemeMode>("auto");
  const [sunTimes, setSunTimes] = useState<SunTimes | null>(null);
  const [isNight, setIsNight] = useState(false);
  const [status, setStatus] = useState<ThemeLocationStatus>("loading");
  const [statusMessage, setStatusMessage] = useState("");
  const lastResolvedDate = useRef("");

  const useLocation = useCallback(
    async (
      latitude: number,
      longitude: number,
      source: SunTimes["source"],
      label?: string,
    ) => {
      setStatus("loading");
      setStatusMessage("正在获取当天日出与日落时间…");

      try {
        const result = await requestSunTimes(
          latitude,
          longitude,
          source,
          label,
        );
        setSunTimes(result);
        setStatus("ready");
        setStatusMessage("");
        lastResolvedDate.current = new Date().toDateString();
      } catch (error) {
        setSunTimes(fallbackSunTimes());
        setStatus("fallback");
        setStatusMessage(
          error instanceof Error
            ? error.message
            : "日落服务暂时不可用，已使用本地时间兜底。",
        );
        lastResolvedDate.current = new Date().toDateString();
      }
    },
    [],
  );

  const resolveCachedLocation = useCallback(async () => {
    const cached = readCachedThemeLocation();
    if (!cached) {
      setSunTimes(fallbackSunTimes());
      setStatus("needs-location");
      setStatusMessage(
        "尚未设置当前城市。自动模式暂按本地 06:30—18:30 判断昼夜。",
      );
      lastResolvedDate.current = new Date().toDateString();
      return;
    }

    await useLocation(
      cached.latitude,
      cached.longitude,
      "cached-location",
      cached.label,
    );
  }, [useLocation]);

  const refreshLocation = useCallback(async () => {
    setStatus("loading");
    setStatusMessage("正在请求浏览器定位权限…");

    try {
      const position = await getBrowserLocation();
      const latitude = position.coords.latitude;
      const longitude = position.coords.longitude;
      writeCachedThemeLocation({
        latitude,
        longitude,
        label: "浏览器当前位置",
        savedAt: Date.now(),
      });
      await useLocation(
        latitude,
        longitude,
        "geolocation",
        "浏览器当前位置",
      );
    } catch (error) {
      setSunTimes(fallbackSunTimes());
      setStatus("permission-denied");
      setStatusMessage(locationErrorMessage(error));
      lastResolvedDate.current = new Date().toDateString();
    }
  }, [useLocation]);

  const setManualLocation = useCallback(
    async (latitude: number, longitude: number, label?: string) => {
      writeCachedThemeLocation({
        latitude,
        longitude,
        label: label || "手动选择城市",
        savedAt: Date.now(),
      });
      await useLocation(
        latitude,
        longitude,
        "manual-location",
        label || "手动选择城市",
      );
    },
    [useLocation],
  );

  useEffect(() => {
    setModeState(readThemeMode());
    void resolveCachedLocation();
  }, [resolveCachedLocation]);

  useEffect(() => {
    const applyTheme = () => {
      const nextNight = calculateNight(mode, sunTimes);
      setIsNight(nextNight);
      document.documentElement.dataset.theme = nextNight ? "night" : "day";
      document.documentElement.dataset.themeMode = mode;
    };

    applyTheme();
    const interval = window.setInterval(() => {
      applyTheme();
      if (
        mode === "auto" &&
        lastResolvedDate.current !== new Date().toDateString()
      ) {
        void resolveCachedLocation();
      }
    }, 60_000);

    return () => window.clearInterval(interval);
  }, [mode, resolveCachedLocation, sunTimes]);

  const setMode = useCallback((nextMode: ThemeMode) => {
    setModeState(nextMode);
    writeThemeMode(nextMode);
  }, []);

  const value = useMemo<ThemeContextValue>(
    () => ({
      mode,
      setMode,
      isNight,
      sunTimes,
      status,
      statusMessage,
      refreshLocation,
      setManualLocation,
    }),
    [
      isNight,
      mode,
      refreshLocation,
      setManualLocation,
      setMode,
      status,
      statusMessage,
      sunTimes,
    ],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useThemeMode() {
  const value = useContext(ThemeContext);
  if (!value) throw new Error("useThemeMode 必须在 ThemeProvider 内使用");
  return value;
}
