export interface ChatSource {
  id: string;
  title: string;
  href: string;
}
export interface ChatThread {
  id: string;
  title: string;
  updated_at: string;
}
export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  status: 'pending' | 'complete' | 'failed';
  sources: ChatSource[];
  created_at: string;
}
export interface ChatInput {
  message: string;
  messageId: string;
  threadId?: string;
}
export type ChatEvent =
  | { type: 'meta'; threadId: string; messageId: string }
  | { type: 'delta'; text: string }
  | { type: 'done'; sources: ChatSource[] }
  | { type: 'error'; message: string };
