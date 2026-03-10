/**
 * 聊天 SSE 流式服务
 *
 * 工作原理：
 * 1. 用 fetch 发 POST 请求到后端 /api/v1/chat/stream
 * 2. 后端返回 text/event-stream 类型的响应（SSE 格式）
 * 3. 用 ReadableStream + TextDecoder 逐块读取响应体
 * 4. 按 SSE 协议解析每一行（"data: {...}" 格式）
 * 5. 提取 choices[0].delta.content 字段，yield 给调用者
 * 6. 调用者（Chat.tsx）把每个 yield 的字符追加到消息末尾，实现打字机效果
 *
 * 注意：不用 EventSource，因为它不支持 POST 和自定义 Header（Authorization）
 */

import { storage } from '@/utils/storage';
import { TOKEN_KEY } from '@/utils/constants';

// vision 格式下消息内容的每个"块"（文字块或图片块）
export interface ContentPart {
  type: 'text' | 'image_url';          // 块的类型：纯文字 or 图片
  text?: string;                         // type="text" 时的文字内容
  image_url?: { url: string };           // type="image_url" 时的图片（支持 base64 data URL）
}

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string | ContentPart[];       // 普通消息用字符串；含图片时用数组（vision 格式）
}

/**
 * 流式聊天异步生成器
 * @param messages 完整消息历史（包含 system prompt 和所有对话轮次）
 * @yields 每次 yield 一小段文字（AI 回复的增量 delta）
 * @throws 请求失败或 mimo API 报错时抛出 Error
 */
export async function* streamChat(
  messages: ChatMessage[],
  conversationId?: string,
  onMeta?: (conversationId: string) => void,
  modelId?: string,   // 模型配置 UUID，不传则后端使用默认模型
): AsyncGenerator<string> {
  const token = storage.get(TOKEN_KEY);  // 从本地存储取 JWT token

  // 发起 POST 请求，要求返回 SSE 流
  const response = await fetch('/api/v1/chat/stream', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,  // 后端验证身份用
    },
    body: JSON.stringify({
      messages,
      conversation_id: conversationId ?? null,
      model_id: modelId ?? null,   // 传给后端的模型配置 UUID，null 表示用默认模型
    }),
  });

  // HTTP 层面的错误（如 401、400、500）
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`请求失败（${response.status}）：${errorText}`);
  }

  const reader = response.body!.getReader();       // 获取可读流
  const decoder = new TextDecoder('utf-8');         // 用于把 Uint8Array 转成字符串
  let buffer = '';                                   // 缓冲区，用于处理跨 chunk 的不完整行

  while (true) {
    const { done, value } = await reader.read();  // 读取下一个数据块
    if (done) break;                              // 流结束（mimo 发送完毕）

    // 把新读取到的字节追加到缓冲区（stream: true 表示还有更多数据）
    buffer += decoder.decode(value, { stream: true });

    // 按换行符分割，逐行处理
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';  // 最后一行可能不完整，留到下次处理

    for (const line of lines) {
      const trimmed = line.trim();

      // SSE 数据行格式：以 "data: " 开头
      if (!trimmed.startsWith('data: ')) continue;

      const data = trimmed.slice(6);  // 去掉 "data: " 前缀，取后面的 JSON 字符串

      // "[DONE]" 是 OpenAI 协议的流结束标志
      if (data === '[DONE]') return;

      try {
        const parsed = JSON.parse(data);

        // meta 事件：后端发来的 conversation_id，通知调用者
        if (parsed.type === 'meta' && parsed.conversation_id) {
          onMeta?.(parsed.conversation_id);
          continue;
        }

        // 检查是否有错误（后端在 mimo 报错时会在 data 里放 {error: ...}）
        if (parsed.error) {
          throw new Error(parsed.error);
        }

        // 提取本次 delta 的文字内容（OpenAI SSE 格式）
        // choices[0].delta.content 是每次增量文字，可能是 undefined（如 finish_reason 行）
        const delta = parsed.choices?.[0]?.delta?.content;
        if (delta) {
          yield delta;  // 把增量文字 yield 出去，调用者会实时追加到界面
        }
      } catch (e: any) {
        // JSON 解析失败（可能是不规范的行）则跳过
        if (e.message && !e.message.includes('JSON')) throw e;
      }
    }
  }
}
