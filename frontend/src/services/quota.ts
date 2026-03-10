import api from './api';

export interface UsageRecord {
  id: string;
  username: string;
  user_id: string;
  model_id: string;
  model_name: string;
  provider: string;
  input_tokens: number;
  cached_input_tokens: number;
  output_tokens: number;
  created_at: string;
}

export interface UserUsage {
  user_id: string;
  username: string;
  input_tokens: number;
  cached_input_tokens: number;
  output_tokens: number;
  total_tokens: number;
  requests: number;
}

export interface ModelUsage {
  model_id: string;
  model_name: string;
  provider: string;
  input_tokens: number;
  cached_input_tokens: number;
  output_tokens: number;
  total_tokens: number;
  requests: number;
}

export const quotaService = {
  getSummary: (days = 7) =>
    api.get('/admin/quota/summary', { params: { days } }),

  getRecords: (params: { page?: number; page_size?: number; user_id?: string; model_id?: string; days?: number }) =>
    api.get('/admin/quota/records', { params }),

  getByUser: (days = 30) =>
    api.get('/admin/quota/by-user', { params: { days } }),

  getByModel: (days = 30) =>
    api.get('/admin/quota/by-model', { params: { days } }),
};
