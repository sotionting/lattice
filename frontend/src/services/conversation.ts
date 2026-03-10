import api from './api';
import type { ApiResponse, PaginatedData, Conversation, Message } from '@/types';

// 列表中每条对话的完整字段（含摘要）
export interface ConversationItem extends Conversation {
  model_id: string | null;
  last_message: string | null;
  message_count: number;
}

// 对话详情（含消息列表）
export interface ConversationDetail extends ConversationItem {
  messages: Message[];
}

export const conversationService = {
  async list(page = 1, pageSize = 50) {
    const { data } = await api.get<ApiResponse<PaginatedData<ConversationItem>>>('/conversations', {
      params: { page, page_size: pageSize },
    });
    return data.data;
  },

  async get(id: string) {
    const { data } = await api.get<ApiResponse<ConversationDetail>>(`/conversations/${id}`);
    return data.data;
  },

  async rename(id: string, title: string) {
    const { data } = await api.put<ApiResponse<{ id: string; title: string }>>(`/conversations/${id}`, { title });
    return data.data;
  },

  async remove(id: string) {
    await api.delete<ApiResponse<null>>(`/conversations/${id}`);
  },
};
