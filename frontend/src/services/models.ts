/**
 * 模型配置 API 服务
 * 封装与后端 /admin/models 接口的所有通信
 * 只有管理员才有权限调用这些接口（后端有 require_admin 依赖校验）
 */
import api from './api';

/** 聊天界面使用的轻量模型信息（不含敏感字段） */
export interface ActiveModel {
  id: string;                          // 模型配置 UUID，发消息时传给后端
  name: string;                        // 展示名称，如 "GPT-4o"
  provider: string;                    // 提供商标识
  model_id: string;                    // 实际模型名，如 "gpt-4o"
  is_default: boolean;                 // 是否为默认模型
  model_type: 'llm' | 'image' | 'video'; // 模型类型：大语言模型 / 图片生成 / 视频生成
}

/** 模型配置的数据结构（与后端 _serialize 返回格式一致） */
export interface ModelConfig {
  id: string;
  name: string;                        // 展示名称，如 "MiMo Flash"
  provider: string;                    // 提供商标识，如 "google" / "openai" / "doubao" / "custom"
  model_id: string;                    // 实际调用时传给 API 的模型 ID
  api_key: string;                     // 脱敏后的 API Key（前8位 + ... + 后4位）
  base_url: string;                    // 自定义接口地址（空字符串表示使用默认）
  is_active: boolean;                  // 是否启用
  is_default: boolean;                 // 是否为默认模型
  model_type: 'llm' | 'image' | 'video'; // 模型类型：大语言模型 / 图片生成 / 视频生成
}

/** 新建/更新时提交的字段（api_key 是完整明文，不是脱敏版） */
export interface ModelConfigForm {
  name: string;
  provider: string;
  model_id: string;
  api_key?: string;
  base_url?: string;
  is_active: boolean;
  is_default: boolean;
  model_type: 'llm' | 'image' | 'video'; // 模型类型分类，必选
}

export const modelsService = {
  /** 获取所有模型配置列表 */
  list: async (): Promise<ModelConfig[]> => {
    const res = await api.get('/admin/models');
    return res.data.data.items;  // 后端返回 {data: {items: [], total: n}}
  },

  /** 新建一条模型配置，返回新建后的数据（含数据库生成的 id） */
  create: async (data: ModelConfigForm): Promise<ModelConfig> => {
    const res = await api.post('/admin/models', data);
    return res.data.data;
  },

  /** 更新指定 id 的模型配置，返回更新后的数据 */
  update: async (id: string, data: Partial<ModelConfigForm>): Promise<ModelConfig> => {
    const res = await api.put(`/admin/models/${id}`, data);
    return res.data.data;
  },

  /** 删除指定 id 的模型配置 */
  delete: async (id: string): Promise<void> => {
    await api.delete(`/admin/models/${id}`);
  },

  /** 将指定模型设为默认（后端会自动清除其他模型的默认标记） */
  setDefault: async (id: string): Promise<void> => {
    await api.patch(`/admin/models/${id}/default`);
  },

  /**
   * 获取所有已启用的模型列表（普通用户可访问，不含 API Key）
   * 供聊天界面的「选择模型」下拉框使用
   */
  getActive: async (): Promise<ActiveModel[]> => {
    const res = await api.get('/models/active');  // 对应后端 GET /api/v1/models/active
    return res.data.data;
  },
};
