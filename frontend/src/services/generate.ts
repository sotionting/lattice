/** 图片 / 视频生成 API 服务 */
import api from './api';
import { storage } from '@/utils/storage';
import { TOKEN_KEY } from '@/utils/constants';

// ── 图片生成 ─────────────────────────────────────────────────────────────────

export interface ImageGenResult {
  images: string[];           // base64 DataURL 列表
  text: string;               // 模型附带的文字说明（可能为空）
  conversation_id?: string;   // 后端自动创建的对话 ID，用于更新历史记录
}

/**
 * 调用后端 POST /generate/image
 * imageData: 参考图 DataURL，有值时走图生图（仅 Gemini 支持），无值时纯文生图
 */
export async function generateImage(
  prompt: string,
  modelId?: string,
  imageData?: string,
): Promise<ImageGenResult> {
  const res = await api.post<{ code: number; data: ImageGenResult }>('/generate/image', {
    prompt,
    model_id: modelId,     // 后端 Pydantic 字段名为 model_id
    image_data: imageData, // 可选参考图
  });
  return res.data.data;
}

// ── 视频生成 ─────────────────────────────────────────────────────────────────

export interface VideoGenResult {
  video_filename: string;   // 后端保存在 /app/uploads/videos/ 下的 MP4 文件名
  conversation_id?: string; // 后端自动创建的对话 ID，用于更新浏览器 URL
}

/**
 * 调用后端 POST /generate/video（Veo API，异步轮询，最长约 5 分钟）
 * imageData: 可选参考图 DataURL，部分 Veo 模型支持图生视频
 */
export async function generateVideo(
  prompt: string,
  modelId?: string,
  imageData?: string,
): Promise<VideoGenResult> {
  const res = await api.post<{ code: number; data: VideoGenResult }>(
    '/generate/video',
    {
      prompt,
      model_id: modelId,
      image_data: imageData,
    },
    {
      // Veo 视频生成最长约 5 分钟，覆盖 axios 实例默认的 30 秒 timeout
      timeout: 360_000,  // 6 分钟（比后端最大等待时间 5 分钟多留 1 分钟余量）
    },
  );
  return res.data.data;
}

/**
 * 根据后端返回的视频文件名，构造带 JWT 的播放 URL。
 *
 * 为什么把 JWT 放进 query param 而不是 Authorization Header？
 * HTML <video src="..."> 是浏览器原生行为，无法像 axios 那样注入 Bearer Token。
 * 因此后端 /generate/video/file/{name} 接受 ?token=xxx 参数进行鉴权。
 */
export function buildVideoUrl(filename: string): string {
  const token = storage.get(TOKEN_KEY) ?? '';  // 从 localStorage 读取 JWT
  return `/api/v1/generate/video/file/${encodeURIComponent(filename)}?token=${token}`;
}

// ── 生成记录列表 ───────────────────────────────────────────────────────────

export interface GenerationRecord {
  id: string;
  type: 'image' | 'video';
  url: string;
  prompt: string;
  model_name: string;
  created_at: string;
}

/**
 * 获取用户的生成记录列表
 */
export async function listGenerations(): Promise<GenerationRecord[]> {
  const res = await api.get<{ code: number; data: GenerationRecord[] }>('/generate/list');
  return res.data.data;
}
