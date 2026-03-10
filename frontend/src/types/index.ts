// ── 用户 ──────────────────────────────────────────────────────────────────
export interface User {
  id: string;
  username: string;
  email: string;
  role: 'admin' | 'user';
  is_active: boolean;
  created_at: string;
  updated_at?: string;
}

// ── 对话 ──────────────────────────────────────────────────────────────────
export interface Conversation {
  id: string;
  user_id?: string;
  title: string;
  created_at: string;
  updated_at?: string;
  last_message?: string | null;  // 最后一条消息内容摘要
  message_count?: number;        // 对话消息总数
  model_id?: string | null;      // 使用的模型 ID
}

export interface Message {
  id: string;
  conversation_id: string;
  role: 'user' | 'assistant';
  content: string;
  metadata?: Record<string, unknown>;
  created_at: string;
}

// ── 资源 ──────────────────────────────────────────────────────────────────
export interface Resource {
  id: string;
  user_id: string;
  conversation_id: string | null;
  name: string;
  type: 'image' | 'video' | 'code' | 'file';
  url: string;
  size_bytes: number | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

// ── 任务 ──────────────────────────────────────────────────────────────────
export interface TaskItem {
  id: string;
  user_id: string;
  skill_name: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  progress: number;
  result: unknown | null;
  error: string | null;
  created_at: string;
}

// ── 模型配置 ───────────────────────────────────────────────────────────────
export interface ModelConfig {
  id: string;
  name: string;
  provider: string;
  base_url: string;
  model_name: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// ── Skill ─────────────────────────────────────────────────────────────────
export interface Skill {
  id: string;
  name: string;
  description: string;
  handler: string;
  parameters: Record<string, unknown>;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// ── MCP 服务器 ────────────────────────────────────────────────────────────
export interface MCPServer {
  id: string;
  name: string;
  endpoint: string;
  description: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// ── 用量日志 ───────────────────────────────────────────────────────────────
export interface UsageLog {
  id: string;
  user_id: string;
  username: string;
  model_name: string | null;
  tokens_input: number;
  tokens_output: number;
  created_at: string;
}

// ── 通用响应 ───────────────────────────────────────────────────────────────
export interface ApiResponse<T = unknown> {
  code: number;
  message: string;
  data: T;
}

export interface PaginatedData<T> {
  items: T[];
  total: number;
  page: number;
  page_size: number;
}
