export type AiProvider = "ollama" | "deepseek_byok" | "context_debug";
export type OllamaSpeedMode = "fast" | "balanced";

export interface AiSettings {
  provider: AiProvider;
  ollamaBaseUrl: string;
  ollamaModel: string;
  ollamaSpeedMode: OllamaSpeedMode;
  deepseekModel: string;
}

export interface AiConnectionStatus {
  connected: boolean;
  provider: AiProvider;
  model: string;
  message: string;
  availableModels?: string[];
}
