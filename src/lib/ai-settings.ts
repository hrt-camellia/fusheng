import type { AiSettings } from "@/types/ai";

const SETTINGS_KEY = "fusheng:ai-settings:v2";
const DEEPSEEK_KEY = "fusheng:deepseek-api-key:session:v1";

export const DEFAULT_AI_SETTINGS: AiSettings = {
  provider: "context_debug",
  ollamaBaseUrl: "http://127.0.0.1:11434",
  ollamaModel: "qwen3:4b",
  ollamaSpeedMode: "fast",
  deepseekModel: "deepseek-v4-flash",
};

function canUseLocalStorage() {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

function canUseSessionStorage() {
  return typeof window !== "undefined" && typeof window.sessionStorage !== "undefined";
}

export function readAiSettings(): AiSettings {
  if (!canUseLocalStorage()) return DEFAULT_AI_SETTINGS;

  try {
    const legacy = JSON.parse(localStorage.getItem("fusheng:ai-settings:v1") || "null") as
      | Partial<AiSettings>
      | null;
    const parsed = JSON.parse(localStorage.getItem(SETTINGS_KEY) || "null") as
      | Partial<AiSettings>
      | null;
    const value = parsed || legacy || {};

    return {
      ...DEFAULT_AI_SETTINGS,
      ...value,
      provider:
        value.provider === "deepseek_byok"
          ? "deepseek_byok"
          : value.provider === "context_debug"
            ? "context_debug"
            : "ollama",
      ollamaSpeedMode: value.ollamaSpeedMode === "balanced" ? "balanced" : "fast",
    };
  } catch {
    return DEFAULT_AI_SETTINGS;
  }
}

export function writeAiSettings(settings: AiSettings) {
  if (!canUseLocalStorage()) return;
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}

export function readSessionDeepSeekKey() {
  if (!canUseSessionStorage()) return "";
  return sessionStorage.getItem(DEEPSEEK_KEY) || "";
}

export function writeSessionDeepSeekKey(apiKey: string) {
  if (!canUseSessionStorage()) return;
  const value = apiKey.trim();
  if (value) sessionStorage.setItem(DEEPSEEK_KEY, value);
  else sessionStorage.removeItem(DEEPSEEK_KEY);
}

export function clearSessionDeepSeekKey() {
  if (!canUseSessionStorage()) return;
  sessionStorage.removeItem(DEEPSEEK_KEY);
}
