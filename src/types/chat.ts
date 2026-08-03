export type ChatRole = "user" | "assistant";

export interface ChatMessage {
  id: string;
  role: ChatRole;
  content: string;
  createdAt: string;
}

export interface ChatThread {
  id: string;
  title: string;
  messages: ChatMessage[];
  summary?: string;
  summarizedMessageCount?: number;
  summaryUpdatedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ChatHistoryItem {
  role: ChatRole;
  content: string;
}
