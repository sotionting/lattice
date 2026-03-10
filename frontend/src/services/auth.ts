import api from './api';
import type { ApiResponse, User } from '@/types';

export interface LoginParams {
  username: string;
  password: string;
}

export interface LoginResult {
  access_token: string;
  token_type: string;
  user: User;
}

export const authService = {
  async login(params: LoginParams) {
    const { data } = await api.post<ApiResponse<LoginResult>>('/auth/login', params);
    return data.data;
  },
  async register(params: { username: string; email: string; password: string }) {
    const { data } = await api.post<ApiResponse<User>>('/auth/register', params);
    return data.data;
  },
  async getMe() {
    const { data } = await api.get<ApiResponse<User>>('/auth/me');
    return data.data;
  },
  async changePassword(params: { old_password: string; new_password: string }) {
    const { data } = await api.put<ApiResponse<null>>('/auth/password', params);
    return data.data;
  },
};
