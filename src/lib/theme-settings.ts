import type { ThemeMode } from "@/types/theme";

const THEME_MODE_KEY = "fusheng:theme-mode:v1";
const LOCATION_KEY = "fusheng:theme-location:v2";

export interface CachedThemeLocation {
  latitude: number;
  longitude: number;
  label?: string;
  savedAt: number;
}

export function readThemeMode(): ThemeMode {
  if (typeof window === "undefined") return "auto";
  const value = window.localStorage.getItem(THEME_MODE_KEY);
  return value === "day" || value === "night" ? value : "auto";
}

export function writeThemeMode(mode: ThemeMode) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(THEME_MODE_KEY, mode);
}

export function readCachedThemeLocation(): CachedThemeLocation | null {
  if (typeof window === "undefined") return null;

  try {
    const parsed = JSON.parse(window.localStorage.getItem(LOCATION_KEY) || "null") as
      | CachedThemeLocation
      | null;

    if (
      !parsed ||
      !Number.isFinite(parsed.latitude) ||
      !Number.isFinite(parsed.longitude) ||
      !Number.isFinite(parsed.savedAt)
    ) {
      return null;
    }

    return parsed;
  } catch {
    return null;
  }
}

export function writeCachedThemeLocation(location: CachedThemeLocation) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(LOCATION_KEY, JSON.stringify(location));
}
