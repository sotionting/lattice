import api from './api';
import type { ApiResponse, PaginatedData, User } from '@/types';

export const adminService = {
  // ── 用户管理 ─────────────────────────────────────────────────────────
  async listUsers(page = 1, pageSize = 20) {
    const { data } = await api.get<ApiResponse<PaginatedData<User>>>('/admin/users', {
      params: { page, page_size: pageSize },
    });
    return data.data;
  },

  async createUser(params: { username: string; email: string; password: string; role: string }) {
    const { data } = await api.post<ApiResponse<User>>('/admin/users', params);
    return data.data;
  },

  async updateUser(id: string, params: { email?: string; role?: string; is_active?: boolean; password?: string }) {
    const { data } = await api.put<ApiResponse<User>>(`/admin/users/${id}`, params);
    return data.data;
  },

  async deleteUser(id: string) {
    const { data } = await api.delete<ApiResponse<null>>(`/admin/users/${id}`);
    return data.data;
  },
};
