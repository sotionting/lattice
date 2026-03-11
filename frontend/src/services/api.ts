import axios from 'axios';
import type { ApiResponse } from '@/types';
import { storage } from '@/utils/storage';
import { TOKEN_KEY } from '@/utils/constants';

// 开发环境下，前端页面从 localhost:5173 直接请求 localhost:8000 的 API
// 生产环境通过 Nginx 代理（前端和后端都通过 Nginx）
const baseURL = '/api/v1';

const api = axios.create({
  baseURL,
  timeout: 30000,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  const token = storage.get(TOKEN_KEY);
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => {
    const data = response.data as ApiResponse;
    if (data.code !== 200) {
      return Promise.reject(new Error(data.message || '请求失败'));
    }
    return response;
  },
  (error) => {
    if (error.response?.status === 401) {
      storage.remove(TOKEN_KEY);
      window.location.href = '/login';
    }
    const msg = error.response?.data?.message || error.message || '网络错误';
    return Promise.reject(new Error(msg));
  }
);

export default api;
