/**
 * 资源库服务
 * - list: 列出用户资源文件
 * - upload: multipart 上传文件
 * - download: 带 JWT 鉴权的文件下载
 * - remove: 删除文件（磁盘 + 数据库）
 */
import api from './api';
import type { ApiResponse, PaginatedData } from '@/types';
import { storage } from '@/utils/storage';
import { TOKEN_KEY } from '@/utils/constants';

export interface ResourceItem {
  id: string;
  name: string;
  type: 'document' | 'image' | 'pdf' | 'spreadsheet' | 'other';
  size: string;          // 格式化后的大小，如 "1.2 MB"
  size_bytes: number;
  mime_type: string | null;
  source: string;        // "用户上传" 或 "AI 生成"
  created_at: string;
}

export const resourcesService = {
  async list(page = 1, pageSize = 20) {
    const { data } = await api.get<ApiResponse<PaginatedData<ResourceItem>>>('/resources', {
      params: { page, page_size: pageSize },
    });
    return data.data;
  },

  async upload(file: File): Promise<ResourceItem> {
    const formData = new FormData();
    formData.append('file', file);
    const { data } = await api.post<ApiResponse<ResourceItem>>('/resources/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return data.data;
  },

  /** 带鉴权的文件下载：用 fetch 获取 Blob 后触发浏览器下载 */
  download(id: string, filename: string): void {
    const token = storage.get(TOKEN_KEY);
    fetch(`/api/v1/resources/${id}/download`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => {
        if (!res.ok) throw new Error('下载失败');
        return res.blob();
      })
      .then((blob) => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      })
      .catch((err) => console.error('下载错误:', err));
  },

  async remove(id: string): Promise<void> {
    await api.delete<ApiResponse<null>>(`/resources/${id}`);
  },
};
