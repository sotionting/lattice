import api from './api';

export interface SkillItem {
  id: string;
  name: string;
  description: string;
  skill_type: 'api' | 'code' | 'prompt'; // 后端存储的实际类型
  config: Record<string, unknown>;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface SkillForm {
  name: string;
  description: string;
  skill_type: 'api' | 'code' | 'prompt';
  config: Record<string, unknown>;
  is_active: boolean;
}

export const skillsService = {
  list: (page = 1, pageSize = 50) =>
    api.get('/admin/skills', { params: { page, page_size: pageSize } }),

  create: (data: SkillForm) =>
    api.post('/admin/skills', data),

  update: (id: string, data: Partial<SkillForm>) =>
    api.put(`/admin/skills/${id}`, data),

  delete: (id: string) =>
    api.delete(`/admin/skills/${id}`),
};
