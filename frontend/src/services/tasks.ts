/**
 * 任务状态服务
 * - list: 列出用户任务记录（支持按状态过滤）
 * - get: 查询单条任务详情
 */
import api from './api';
import type { ApiResponse, PaginatedData } from '@/types';

export interface TaskItem {
  id: string;
  name: string;
  type: string;
  status: 'running' | 'pending' | 'success' | 'failed';
  progress: number;      // 0~100
  model: string;
  started_at: string;    // "HH:MM:SS" 或 "-"
  duration: string;      // "32s" / "1m 12s" 或 "-"
  error: string | null;
  created_at: string;
}

export const tasksService = {
  async list(page = 1, pageSize = 50, status?: string) {
    const params: Record<string, string | number> = { page, page_size: pageSize };
    if (status && status !== 'all') params.status = status;
    const { data } = await api.get<ApiResponse<PaginatedData<TaskItem>>>('/tasks', { params });
    return data.data;
  },

  async get(id: string): Promise<TaskItem> {
    const { data } = await api.get<ApiResponse<TaskItem>>(`/tasks/${id}`);
    return data.data;
  },
};
