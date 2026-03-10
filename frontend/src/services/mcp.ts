import api from './api';

export interface MCPServerItem {
  id: string;
  name: string;
  url: string;
  description: string | null;
  is_active: boolean;
  status: 'online' | 'offline' | 'unknown';
  tool_count: number;
  created_at: string;
}

export interface MCPForm {
  name: string;
  url: string;
  description?: string;
  is_active: boolean;
}

export const mcpService = {
  list: () =>
    api.get('/admin/mcp'),

  create: (data: MCPForm) =>
    api.post('/admin/mcp', data),

  update: (id: string, data: Partial<MCPForm>) =>
    api.put(`/admin/mcp/${id}`, data),

  delete: (id: string) =>
    api.delete(`/admin/mcp/${id}`),

  // 触发后端真实 HTTP 探测，返回 { status, connected }
  testConnection: (id: string) =>
    api.post(`/admin/mcp/${id}/test`),
};
