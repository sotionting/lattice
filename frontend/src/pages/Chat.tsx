import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { Button, Avatar, Tooltip, Modal, Spin, Select, Image as AntImage, Segmented } from 'antd';
import {
  SendOutlined, RobotOutlined, UserOutlined,
  PlusOutlined, PaperClipOutlined, CloseCircleFilled,
  MessageOutlined, PictureOutlined, VideoCameraOutlined,
} from '@ant-design/icons';
import { useSearchParams, useNavigate } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useAuthStore } from '@/store/authStore';
import { streamChat, type ChatMessage as ApiChatMessage, type ContentPart } from '@/services/chat';
import { conversationService } from '@/services/conversation';
import { modelsService, type ActiveModel } from '@/services/models';
import { generateImage, generateVideo, buildVideoUrl } from '@/services/generate';

// ── 类型定义 ─────────────────────────────────────────────────────────────────

interface Attachment {
  id: string;
  type: 'image' | 'video' | 'audio';
  name: string;
  dataUrl: string;
  mimeType: string;
}

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  time: string;
  attachments?: Attachment[];
  generatedImages?: string[];  // 图像模式：AI 生成的图片 DataURL 列表，直接渲染
  generatedVideos?: string[];  // 视频模式：AI 生成的视频播放 URL 列表（带 JWT token）
}

// ── 工具函数 ──────────────────────────────────────────────────────────────────

let _msgIdCounter = 0;
const nextId = () => `msg-${++_msgIdCounter}`;

const getNow = () => {
  const d = new Date();
  return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
};

const VIDEO_EXTS = /\.(mp4|webm|mov|avi|mkv)$/i;
const AUDIO_EXTS = /\.(mp3|wav|ogg|aac|flac|m4a|opus)$/i;

// ── 模式配置 ─────────────────────────────────────────────────────────────────
type ChatMode = 'chat' | 'image' | 'video';

const MODE_COLOR: Record<ChatMode, string> = {
  chat:  '#6366f1',
  image: '#ec4899',
  video: '#8b5cf6',
};

const MODE_GRADIENT: Record<ChatMode, string> = {
  chat:  'linear-gradient(135deg, #6366f1, #8b5cf6)',
  image: 'linear-gradient(135deg, #ec4899, #be185d)',
  video: 'linear-gradient(135deg, #8b5cf6, #7c3aed)',
};

const MODE_WELCOME = {
  chat: {
    title: '有什么可以帮你的？',
    desc: '我是你的 AI 助手，可以回答问题、写代码、分析图片，也可以总结文档。',
    examples: ['帮我用 Python 写一个快速排序', '解释一下什么是 Transformer 模型', '帮我把这段话翻译成英文'],
  },
  image: {
    title: '描述画面，AI 为你创作',
    desc: '输入文字描述，AI 将根据你的想象生成图片。\n支持 Google Imagen 3 等图片模型。',
    examples: ['一只在草地上奔跑的柴犬，写实摄影风格', '赛博朋克城市夜景，霓虹灯，雨后积水倒影', '水墨山水画，中国传统风格，意境深远'],
  },
  video: {
    title: '描述场景，AI 为你生成视频',
    desc: '输入视频描述，AI 将为你生成动态视频内容。\n使用 Google Veo 模型，生成约需 1~5 分钟，请耐心等待。',
    examples: ['海浪拍打礁石，慢动作镜头，4K 超清', '城市延时摄影，夜间车流，俯瞰视角', '春天花园，蜜蜂在花丛中采蜜，微距特写'],
  },
};

const MODE_PLACEHOLDER: Record<ChatMode, string> = {
  chat:  '发送消息… (Enter 发送，Shift+Enter 换行)',
  image: '描述你想生成的图片，例如：一只在雪地里奔跑的哈士奇，写实风格…',
  video: '描述你想生成的视频内容，例如：海浪拍打礁石，慢动作，4K…（生成约需 1~5 分钟）',
};

// ── 子组件：三点动画 ──────────────────────────────────────────────────────────
const TypingDots: React.FC = () => (
  <div style={{ display: 'flex', gap: 5, padding: '2px 0', alignItems: 'center' }}>
    {[0, 1, 2].map((i) => (
      <span key={i} style={{
        width: 7, height: 7, borderRadius: '50%',
        background: 'rgba(99,102,241,0.45)',
        display: 'inline-block',
        animation: 'typingBounce 1.2s infinite ease-in-out',
        animationDelay: `${i * 0.2}s`,
      }} />
    ))}
    <style>{`
      @keyframes typingBounce {
        0%, 80%, 100% { transform: translateY(0); opacity: 0.45; }
        40% { transform: translateY(-5px); opacity: 1; }
      }
    `}</style>
  </div>
);

// ── ReactMarkdown 渲染器 ──────────────────────────────────────────────────────
const MarkdownComponents: React.ComponentProps<typeof ReactMarkdown>['components'] = {
  img: ({ src, alt }) => {
    if (VIDEO_EXTS.test(src || '')) {
      return <video src={src} controls style={{ maxWidth: '100%', borderRadius: 10, marginTop: 6, display: 'block' }} />;
    }
    return (
      <AntImage src={src} alt={alt || ''}
        style={{ maxWidth: '100%', borderRadius: 10, marginTop: 6, display: 'block' }}
        preview={{ mask: '点击查看大图' }} />
    );
  },
  a: ({ href, children }) => {
    if (href && AUDIO_EXTS.test(href)) {
      return <audio src={href} controls style={{ maxWidth: '100%', marginTop: 6, display: 'block', borderRadius: 10 }} />;
    }
    return <a href={href} target="_blank" rel="noopener noreferrer" style={{ color: '#6366f1' }}>{children}</a>;
  },
  pre: ({ children }) => (
    <pre style={{
      background: 'rgba(15,23,42,0.90)', color: '#e2e8f0',
      padding: '14px 18px', borderRadius: 10,
      overflow: 'auto', fontSize: 13, margin: '10px 0',
      fontFamily: '"JetBrains Mono", "Cascadia Code", "Fira Code", monospace',
      border: '1px solid rgba(255,255,255,0.08)',
    }}>{children}</pre>
  ),
  code: ({ children, className }) => (
    <code className={className} style={className ? {} : {
      background: 'rgba(99,102,241,0.10)', color: '#6366f1',
      padding: '2px 6px', borderRadius: 5, fontSize: 13, fontFamily: 'monospace',
    }}>{children}</code>
  ),
  p: ({ children }) => <p style={{ margin: '5px 0', lineHeight: 1.78 }}>{children}</p>,
};

// ── 主组件 ───────────────────────────────────────────────────────────────────
const Chat: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);      // 等待第一个 token / 图片 / 视频
  const [streaming, setStreaming] = useState(false);  // 文字流式输出中
  const [initLoading, setInitLoading] = useState(false); // 加载历史对话中

  const [conversationId, setConversationId] = useState<string | undefined>(undefined);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [chatMode, setChatMode] = useState<ChatMode>('chat');

  const [availableModels, setAvailableModels] = useState<ActiveModel[]>([]);
  const [selectedModelId, setSelectedModelId] = useState<string | undefined>(undefined);

  const user = useAuthStore((s) => s.user);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dragCounterRef = useRef(0);

  // ── Effect：加载模型列表 ────────────────────────────────────────────────────
  useEffect(() => {
    modelsService.getActive()
      .then((models) => {
        setAvailableModels(models);
        const def = models.find((m) => m.is_default) ?? models[0];
        if (def) setSelectedModelId(def.id);
      })
      .catch(() => {});
  }, []);

  // ── Effect：URL ?cid=xxx → 加载历史对话 ────────────────────────────────────
  useEffect(() => {
    const cid = searchParams.get('cid');
    if (!cid) {
      setConversationId(undefined);
      setMessages([]);
      return;
    }
    setInitLoading(true);
    conversationService.get(cid)
      .then((conv) => {
        setConversationId(conv.id);
        if (conv.messages.length === 0) { setMessages([]); return; }

        const IMAGE_MARKER = /\[IMAGE_DATA\]([\s\S]*?)\[\/IMAGE_DATA\]/g;
        // [VIDEO_FILE]filename.mp4[/VIDEO_FILE] — 提取文件名后用 buildVideoUrl 构造播放 URL
        const VIDEO_MARKER = /\[VIDEO_FILE\]([\s\S]*?)\[\/VIDEO_FILE\]/g;

        const loaded: ChatMessage[] = conv.messages.map((m) => {
          const time = new Date(m.created_at).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });

          if (m.role === 'assistant' && m.content.includes('[IMAGE_DATA]')) {
            // 图片类消息：解析 base64 DataURL，存入 generatedImages
            const genImages: string[] = [];
            let match;
            IMAGE_MARKER.lastIndex = 0;
            while ((match = IMAGE_MARKER.exec(m.content)) !== null) genImages.push(match[1]);
            const textContent = m.content.replace(/\[IMAGE_DATA\][\s\S]*?\[\/IMAGE_DATA\]/g, '').trim();
            return { id: m.id, role: 'assistant' as const, content: textContent, time, generatedImages: genImages };
          }

          if (m.role === 'assistant' && m.content.includes('[VIDEO_FILE]')) {
            // 视频类消息：解析文件名，用 buildVideoUrl 构造带 JWT 的播放 URL
            const genVideos: string[] = [];
            let match;
            VIDEO_MARKER.lastIndex = 0;
            while ((match = VIDEO_MARKER.exec(m.content)) !== null) {
              genVideos.push(buildVideoUrl(match[1]));  // 文件名 → 带 token 的 API 路径
            }
            const textContent = m.content.replace(/\[VIDEO_FILE\][\s\S]*?\[\/VIDEO_FILE\]/g, '').trim();
            return { id: m.id, role: 'assistant' as const, content: textContent, time, generatedVideos: genVideos };
          }

          return { id: m.id, role: m.role as 'user' | 'assistant', content: m.content, time };
        });

        setMessages(loaded);

        // 自动推断模式：有生成图片 → image 模式，有生成视频 → video 模式，其余 → chat
        const hasImages = loaded.some((m) => m.generatedImages && m.generatedImages.length > 0);
        const hasVideos = loaded.some((m) => m.generatedVideos && m.generatedVideos.length > 0);
        if (hasVideos) setChatMode('video');
        else if (hasImages) setChatMode('image');
        else setChatMode('chat');
      })
      .catch(() => navigate('/', { replace: true }))
      .finally(() => setInitLoading(false));
  }, [searchParams, navigate]);

  // ── Effect：消息变化时滚动到底部 ───────────────────────────────────────────
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'auto' });
  }, [messages, loading]);

  // ── 按模式过滤模型列表 ────────────────────────────────────────────────────
  const modeModels = useMemo(() => {
    const typeMap: Record<ChatMode, ActiveModel['model_type']> = {
      chat: 'llm', image: 'image', video: 'video',
    };
    const filtered = availableModels.filter((m) => m.model_type === typeMap[chatMode]);
    return filtered.length > 0 ? filtered : availableModels;
  }, [availableModels, chatMode]);

  // ── 模式切换时自动选择该模式下的默认模型 ────────────────────────────────────
  useEffect(() => {
    if (modeModels.length === 0) return;
    const inList = modeModels.some((m) => m.id === selectedModelId);
    if (!inList) {
      const def = modeModels.find((m) => m.is_default) ?? modeModels[0];
      setSelectedModelId(def.id);
    }
  }, [modeModels]); // eslint-disable-line react-hooks/exhaustive-deps

  const selectedModel = useMemo(
    () => availableModels.find((m) => m.id === selectedModelId),
    [availableModels, selectedModelId],
  );

  // ── 模式切换 ──────────────────────────────────────────────────────────────
  const handleModeChange = useCallback((val: string | number) => {
    setChatMode(val as ChatMode);
    setSelectedModelId(undefined);   // 清除已选模型，让 Effect 重新自动选默认
    setMessages([]);
    setAttachments([]);
    navigate('/', { replace: true });
  }, [navigate]);

  // ── 文件处理 ──────────────────────────────────────────────────────────────
  const processFiles = useCallback(async (files: File[]) => {
    const result: Attachment[] = [];
    for (const file of files) {
      const isImage = file.type.startsWith('image/');
      const isVideo = file.type.startsWith('video/');
      const isAudio = file.type.startsWith('audio/');
      if (!isImage && !isVideo && !isAudio) continue;
      const dataUrl = await new Promise<string>((resolve) => {
        if (isImage) {
          const reader = new FileReader();
          reader.onload = (ev) => resolve(ev.target!.result as string);
          reader.readAsDataURL(file);
        } else {
          resolve(URL.createObjectURL(file));  // 视频/音频用本地 objectURL
        }
      });
      result.push({
        id: `att-${Date.now()}-${Math.random().toString(36).slice(2)}`,
        type: isImage ? 'image' : isVideo ? 'video' : 'audio',
        name: file.name, dataUrl, mimeType: file.type,
      });
    }
    setAttachments((prev) => [...prev, ...result]);
  }, []);

  const handleFileSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    e.target.value = '';
    await processFiles(files);
  }, [processFiles]);

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    dragCounterRef.current += 1;
    if (dragCounterRef.current === 1) setIsDragging(true);
  }, []);
  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    dragCounterRef.current -= 1;
    if (dragCounterRef.current === 0) setIsDragging(false);
  }, []);
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  }, []);
  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    dragCounterRef.current = 0;
    setIsDragging(false);
    await processFiles(Array.from(e.dataTransfer.files));
  }, [processFiles]);

  const removeAttachment = useCallback((id: string) => {
    setAttachments((prev) => {
      const att = prev.find((a) => a.id === id);
      if (att && (att.type === 'video' || att.type === 'audio')) URL.revokeObjectURL(att.dataUrl);
      return prev.filter((a) => a.id !== id);
    });
  }, []);

  // ── 新建对话 ─────────────────────────────────────────────────────────────
  const handleNew = useCallback(() => {
    if (loading || streaming) return;
    setConversationId(undefined);
    setMessages([]);
    setAttachments([]);
    navigate('/', { replace: true });
  }, [loading, streaming, navigate]);

  // ── 发送（核心逻辑）──────────────────────────────────────────────────────
  const handleSend = useCallback(async () => {
    const userContent = input.trim();
    const hasText = userContent.length > 0;
    const hasAttachments = attachments.length > 0;
    if ((!hasText && !hasAttachments) || loading || streaming) return;

    const currentAttachments = [...attachments];

    // ── 图像生成模式 ────────────────────────────────────────────────────────
    if (chatMode === 'image') {
      if (!hasText) {
        Modal.info({ title: '请输入描述', content: '请在输入框中描述你想生成的图片', okText: '好的' });
        return;
      }
      const userMsg: ChatMessage = {
        id: nextId(), role: 'user', content: userContent, time: getNow(),
        attachments: currentAttachments,  // 用户上传的参考图在气泡里显示
      };
      setMessages((prev) => [...prev, userMsg]);
      setInput('');
      setAttachments([]);
      setLoading(true);
      try {
        const refImage = currentAttachments.find((a) => a.type === 'image');  // 取参考图
        const result = await generateImage(userContent, selectedModelId, refImage?.dataUrl);
        setMessages((prev) => [...prev, {
          id: nextId(), role: 'assistant',
          content: result.text || '',
          time: getNow(),
          generatedImages: result.images,  // 存 DataURL 列表，渲染时绕过 ReactMarkdown
        }]);
        if (result.conversation_id) {
          setConversationId(result.conversation_id);
          navigate(`/?cid=${result.conversation_id}`, { replace: true });
        }
      } catch (err: any) {
        const detail = err.response?.data?.detail || err.message || '未知错误';
        setMessages((prev) => [...prev, {
          id: nextId(), role: 'assistant',
          content: `⚠️ 图片生成失败：${detail}`, time: getNow(),
        }]);
      } finally {
        setLoading(false);
      }
      return;
    }

    // ── 视频生成模式（Veo）────────────────────────────────────────────────────
    if (chatMode === 'video') {
      if (!hasText) {
        Modal.info({ title: '请输入描述', content: '请在输入框中描述你想生成的视频内容', okText: '好的' });
        return;
      }
      const userMsg: ChatMessage = {
        id: nextId(), role: 'user', content: userContent, time: getNow(),
        attachments: currentAttachments,  // 显示用户上传的参考图（图生视频）
      };
      setMessages((prev) => [...prev, userMsg]);
      setInput('');
      setAttachments([]);
      setLoading(true);
      try {
        // 取第一张图片作为参考图（图生视频，Veo 部分模型支持）
        const refImage = currentAttachments.find((a) => a.type === 'image');
        const result = await generateVideo(userContent, selectedModelId, refImage?.dataUrl);
        // buildVideoUrl 把文件名转成带 JWT 的播放 URL，<video> 标签可直接使用
        const videoUrl = buildVideoUrl(result.video_filename);
        setMessages((prev) => [...prev, {
          id: nextId(), role: 'assistant',
          content: '',          // Veo 不附带文字说明
          time: getNow(),
          generatedVideos: [videoUrl],  // 存带 token 的 URL，渲染时用 <video> 播放
        }]);
        if (result.conversation_id) {
          setConversationId(result.conversation_id);
          navigate(`/?cid=${result.conversation_id}`, { replace: true });
        }
      } catch (err: any) {
        const detail = err.response?.data?.detail || err.message || '未知错误';
        setMessages((prev) => [...prev, {
          id: nextId(), role: 'assistant',
          content: `⚠️ 视频生成失败：${detail}`, time: getNow(),
        }]);
      } finally {
        setLoading(false);
      }
      return;
    }

    // ── 对话模式（SSE 流式）────────────────────────────────────────────────
    const userMsg: ChatMessage = {
      id: nextId(), role: 'user', content: userContent, time: getNow(),
      attachments: currentAttachments,
    };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setAttachments([]);
    setLoading(true);

    const imageAtts = currentAttachments.filter((a) => a.type === 'image');
    const videoAtts = currentAttachments.filter((a) => a.type === 'video');
    const audioAtts = currentAttachments.filter((a) => a.type === 'audio');

    let apiUserContent: ApiChatMessage['content'];
    if (imageAtts.length > 0) {
      const parts: ContentPart[] = imageAtts.map((a) => ({ type: 'image_url' as const, image_url: { url: a.dataUrl } }));
      const textLines: string[] = [];
      if (videoAtts.length > 0) textLines.push(videoAtts.map((a) => `[视频文件: ${a.name}]`).join(' '));
      if (audioAtts.length > 0) textLines.push(audioAtts.map((a) => `[音频文件: ${a.name}]`).join(' '));
      if (userContent) textLines.push(userContent);
      if (textLines.length > 0) parts.push({ type: 'text', text: textLines.join('\n') });
      apiUserContent = parts;
    } else {
      const textLines: string[] = [];
      if (videoAtts.length > 0) textLines.push(videoAtts.map((a) => `[视频文件: ${a.name}]`).join(' '));
      if (audioAtts.length > 0) textLines.push(audioAtts.map((a) => `[音频文件: ${a.name}]`).join(' '));
      if (userContent) textLines.push(userContent);
      apiUserContent = textLines.join('\n') || '';
    }

    const apiMessages: ApiChatMessage[] = [
      { role: 'system', content: `你是一个AI智能助手。今天是 ${new Date().toLocaleDateString('zh-CN')}。请用中文回答。` },
      ...messages.map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content })),
      { role: 'user', content: apiUserContent },
    ];

    const assistantMsg: ChatMessage = { id: nextId(), role: 'assistant', content: '', time: getNow() };

    try {
      const stream = streamChat(
        apiMessages, conversationId,
        (newConvId) => {
          setConversationId(newConvId);
          navigate(`/?cid=${newConvId}`, { replace: true });
        },
        selectedModelId,
      );
      let firstToken = true;
      for await (const delta of stream) {
        if (firstToken) {
          firstToken = false;
          setLoading(false);
          setStreaming(true);
          setMessages((prev) => [...prev, { ...assistantMsg }]);
        }
        setMessages((prev) => {
          const updated = [...prev];
          const last = updated[updated.length - 1];
          if (last.role === 'assistant') updated[updated.length - 1] = { ...last, content: last.content + delta };
          return updated;
        });
      }
      if (firstToken) {
        setLoading(false);
        Modal.error({ title: 'AI 无响应', content: '没有收到任何内容，请检查模型配置（API Key / 模型 ID）。', okText: '关闭' });
      }
    } catch (err: any) {
      setLoading(false);
      Modal.error({ title: '请求失败', content: err.message || '未知错误，请检查网络或模型配置', okText: '关闭' });
    } finally {
      setStreaming(false);
    }
  }, [input, attachments, loading, streaming, messages, conversationId, navigate, selectedModelId, chatMode]);

  // ── 渲染 ─────────────────────────────────────────────────────────────────
  const color = MODE_COLOR[chatMode];
  const gradient = MODE_GRADIENT[chatMode];
  const welcome = MODE_WELCOME[chatMode];

  return (
    <div
      style={{ display: 'flex', flexDirection: 'column', height: '100%', background: 'transparent', position: 'relative' }}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      {/* 拖放遮罩 */}
      {isDragging && (
        <div style={{
          position: 'absolute', inset: 0, zIndex: 100, pointerEvents: 'none',
          background: 'rgba(99,102,241,0.06)',
          border: '2px dashed rgba(99,102,241,0.50)',
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center', gap: 12,
          backdropFilter: 'blur(4px)',
        }}>
          <PaperClipOutlined style={{ fontSize: 44, color: '#6366f1' }} />
          <div style={{ fontSize: 17, fontWeight: 600, color: '#6366f1' }}>松手即可上传</div>
          <div style={{ fontSize: 13, color: '#8b5cf6' }}>支持图片、视频、音频文件</div>
        </div>
      )}

      {/* ── 顶部工具栏（毛玻璃）── */}
      <div style={{
        height: 56, padding: '0 20px', flexShrink: 0,
        background: 'rgba(255,255,255,0.72)',
        backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
        borderBottom: '1px solid rgba(255,255,255,0.55)',
        boxShadow: '0 1px 12px rgba(99,102,241,0.06)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        {/* 左：模式图标 + 模型名 + 状态 */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 34, height: 34, borderRadius: 10, background: gradient,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: `0 3px 10px ${color}45`,
          }}>
            {chatMode === 'chat'
              ? <MessageOutlined style={{ color: '#fff', fontSize: 15 }} />
              : chatMode === 'image'
              ? <PictureOutlined style={{ color: '#fff', fontSize: 15 }} />
              : <VideoCameraOutlined style={{ color: '#fff', fontSize: 15 }} />}
          </div>
          <div>
            <div style={{ fontWeight: 600, fontSize: 14, color: '#1e293b', lineHeight: 1.3 }}>
              {selectedModel ? selectedModel.name : 'AI Agent'}
            </div>
            <div style={{ fontSize: 11, color: streaming ? '#f59e0b' : loading ? '#f59e0b' : '#22c55e', display: 'flex', alignItems: 'center', gap: 3 }}>
              <span style={{ width: 5, height: 5, borderRadius: '50%', background: 'currentColor', display: 'inline-block' }} />
              {streaming ? '输出中…' : loading ? (chatMode === 'video' ? '生成视频中…' : '生成中…') : '就绪'}
            </div>
          </div>
        </div>

        {/* 右：模型选择 + 新建 */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {modeModels.length > 0 && (
            <Select
              value={selectedModelId}
              onChange={(val) => setSelectedModelId(val)}
              disabled={loading || streaming}
              size="small"
              style={{ width: 160 }}
              placeholder="选择模型"
              options={modeModels.map((m) => ({
                value: m.id,
                label: m.is_default ? `★ ${m.name}` : m.name,
              }))}
            />
          )}
          <Tooltip title="新建对话">
            <Button icon={<PlusOutlined />} size="small" onClick={handleNew}
              disabled={loading || streaming} style={{ borderRadius: 8 }}>
              新建
            </Button>
          </Tooltip>
        </div>
      </div>

      {/* ── 消息区 ── */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '24px 20px 12px' }}>
        <div style={{ maxWidth: 760, margin: '0 auto' }}>

          {initLoading && (
            <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 80 }}>
              <Spin tip="加载对话中…" />
            </div>
          )}

          {/* 欢迎屏 */}
          {!initLoading && messages.length === 0 && !loading && (
            <div style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center',
              justifyContent: 'center', minHeight: '52vh', gap: 22, paddingTop: 20,
            }}>
              <div style={{
                width: 80, height: 80, borderRadius: 24, background: gradient,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: `0 12px 36px ${color}40, 0 4px 12px ${color}30`,
              }}>
                {chatMode === 'chat'
                  ? <MessageOutlined style={{ color: '#fff', fontSize: 36 }} />
                  : chatMode === 'image'
                  ? <PictureOutlined style={{ color: '#fff', fontSize: 36 }} />
                  : <VideoCameraOutlined style={{ color: '#fff', fontSize: 36 }} />}
              </div>

              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 26, fontWeight: 700, color: '#1e293b', marginBottom: 10, letterSpacing: -0.3 }}>
                  {welcome.title}
                </div>
                <div style={{ fontSize: 14, color: '#64748b', lineHeight: 1.85, maxWidth: 440, whiteSpace: 'pre-line' }}>
                  {welcome.desc}
                </div>
              </div>

              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 9, justifyContent: 'center', maxWidth: 560 }}>
                {welcome.examples.map((ex, i) => (
                  <button
                    key={i}
                    onClick={() => setInput(ex)}
                    style={{
                      padding: '9px 17px', borderRadius: 22,
                      background: 'rgba(255,255,255,0.72)',
                      backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)',
                      border: '1px solid rgba(255,255,255,0.55)',
                      boxShadow: '0 2px 10px rgba(99,102,241,0.07)',
                      cursor: 'pointer', fontSize: 13, color: '#475569',
                      transition: 'all 0.18s', outline: 'none', fontFamily: 'inherit',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = color;
                      e.currentTarget.style.color = color;
                      e.currentTarget.style.boxShadow = `0 4px 16px ${color}22`;
                      e.currentTarget.style.background = 'rgba(255,255,255,0.88)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = 'rgba(255,255,255,0.55)';
                      e.currentTarget.style.color = '#475569';
                      e.currentTarget.style.boxShadow = '0 2px 10px rgba(99,102,241,0.07)';
                      e.currentTarget.style.background = 'rgba(255,255,255,0.72)';
                    }}
                  >{ex}</button>
                ))}
              </div>

              {/* 无对应模型时的提醒 */}
              {chatMode === 'image' && availableModels.every((m) => m.model_type !== 'image') && (
                <div style={{
                  padding: '10px 20px', borderRadius: 12,
                  background: 'rgba(255,248,235,0.85)', backdropFilter: 'blur(10px)',
                  border: '1px solid rgba(245,158,11,0.3)', fontSize: 13, color: '#92400e',
                }}>
                  ⚠️ 请先在「模型管理」页添加图片模型（分类选「图片模型」）
                </div>
              )}
              {chatMode === 'video' && availableModels.every((m) => m.model_type !== 'video') && (
                <div style={{
                  padding: '10px 20px', borderRadius: 12,
                  background: 'rgba(245,243,255,0.85)', backdropFilter: 'blur(10px)',
                  border: '1px solid rgba(139,92,246,0.3)', fontSize: 13, color: '#5b21b6',
                }}>
                  ⚠️ 请先在「模型管理」页添加视频模型（分类选「视频模型」，填写 Veo model_id）
                </div>
              )}
            </div>
          )}

          {/* ── 消息列表 ── */}
          {messages.map((msg) => (
            <div key={msg.id} style={{ marginBottom: 28 }}>
              {msg.role === 'user' ? (
                /* 用户消息 — 右对齐，渐变气泡 */
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, alignItems: 'flex-end' }}>
                  <div style={{ maxWidth: '72%' }}>
                    {/* 附件预览 */}
                    {msg.attachments && msg.attachments.length > 0 && (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, justifyContent: 'flex-end', marginBottom: msg.content ? 7 : 0 }}>
                        {msg.attachments.map((att) =>
                          att.type === 'image' ? (
                            <AntImage key={att.id} src={att.dataUrl} alt={att.name}
                              style={{ maxWidth: 220, maxHeight: 160, borderRadius: 12, display: 'block', objectFit: 'cover' }}
                              preview={{ mask: '查看大图' }} />
                          ) : att.type === 'video' ? (
                            <video key={att.id} src={att.dataUrl} controls
                              style={{ maxWidth: 260, maxHeight: 160, borderRadius: 12, display: 'block' }} />
                          ) : (
                            <audio key={att.id} src={att.dataUrl} controls
                              style={{ maxWidth: 260, borderRadius: 12, display: 'block' }} />
                          )
                        )}
                      </div>
                    )}
                    {msg.content && (
                      <div style={{
                        padding: '11px 16px', background: gradient, color: '#fff',
                        borderRadius: '18px 4px 18px 18px',
                        fontSize: 14, lineHeight: 1.68,
                        whiteSpace: 'pre-wrap', wordBreak: 'break-word',
                        boxShadow: `0 4px 16px ${color}35`,
                      }}>
                        {msg.content}
                      </div>
                    )}
                    <div style={{ fontSize: 11, color: '#94a3b8', textAlign: 'right', marginTop: 5, paddingRight: 2 }}>
                      {msg.time}
                    </div>
                  </div>
                  <Avatar size={34} style={{
                    background: 'linear-gradient(135deg, #22c55e, #16a34a)',
                    flexShrink: 0, fontSize: 13, fontWeight: 700,
                    boxShadow: '0 2px 8px rgba(34,197,94,0.35)',
                  }}>
                    {user?.username?.charAt(0).toUpperCase() || <UserOutlined />}
                  </Avatar>
                </div>
              ) : (
                /* AI 消息 — 左对齐，毛玻璃气泡 */
                <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                  <Avatar size={34} icon={<RobotOutlined />}
                    style={{ background: gradient, flexShrink: 0, boxShadow: `0 3px 10px ${color}40` }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{
                      padding: '12px 16px',
                      background: 'rgba(255,255,255,0.78)',
                      backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)',
                      color: '#1e293b',
                      borderRadius: '4px 18px 18px 18px',
                      fontSize: 14, lineHeight: 1.72,
                      boxShadow: '0 2px 14px rgba(0,0,0,0.06)',
                      border: '1px solid rgba(255,255,255,0.65)',
                      wordBreak: 'break-word',
                    }}>
                      {/* 生成的图片（Imagen / Gemini）— 用 AntImage 渲染，绕过 ReactMarkdown 的大 base64 解析崩溃 */}
                      {msg.generatedImages && msg.generatedImages.length > 0 && (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginBottom: msg.content ? 12 : 0 }}>
                          {msg.generatedImages.map((imgUrl, idx) => (
                            <AntImage key={idx} src={imgUrl}
                              style={{ maxWidth: '100%', borderRadius: 12, display: 'block' }}
                              preview={{ mask: '点击查看大图' }} />
                          ))}
                        </div>
                      )}
                      {/* 生成的视频（Veo）— 用原生 <video> 渲染，src 为带 JWT 的 API URL */}
                      {msg.generatedVideos && msg.generatedVideos.length > 0 && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: msg.content ? 12 : 0 }}>
                          {msg.generatedVideos.map((videoUrl, idx) => (
                            <video
                              key={idx}
                              src={videoUrl}        // /api/v1/generate/video/file/{name}?token=xxx
                              controls             // 显示播放控件
                              style={{
                                maxWidth: '100%', width: '100%',
                                borderRadius: 12, display: 'block',
                                background: '#000',  // 视频未加载时显示黑色背景
                                boxShadow: `0 4px 20px ${color}25`,
                              }}
                            />
                          ))}
                        </div>
                      )}
                      {/* 文字内容（Markdown） */}
                      {msg.content && (
                        <ReactMarkdown remarkPlugins={[remarkGfm]} components={MarkdownComponents}>
                          {msg.content}
                        </ReactMarkdown>
                      )}
                      {/* 流式输出光标 */}
                      {streaming && messages[messages.length - 1].id === msg.id && (
                        <span style={{
                          display: 'inline-block', width: 2, height: '1em',
                          background: color, marginLeft: 2, verticalAlign: 'text-bottom',
                          animation: 'cursorBlink 0.8s infinite',
                        }} />
                      )}
                    </div>
                    <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 5, paddingLeft: 2 }}>{msg.time}</div>
                  </div>
                </div>
              )}
            </div>
          ))}

          {/* loading 动画 */}
          {loading && (
            <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start', marginBottom: 28 }}>
              <Avatar size={34} icon={<RobotOutlined />}
                style={{ background: gradient, flexShrink: 0, boxShadow: `0 3px 10px ${color}40` }} />
              <div style={{
                padding: '12px 16px',
                background: 'rgba(255,255,255,0.78)',
                backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)',
                borderRadius: '4px 18px 18px 18px',
                boxShadow: '0 2px 14px rgba(0,0,0,0.06)',
                border: '1px solid rgba(255,255,255,0.65)',
              }}>
                {chatMode === 'video' ? (
                  /* 视频模式显示进度提示（生成较慢，需安抚用户） */
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#64748b', fontSize: 13 }}>
                    <Spin size="small" />
                    <span>正在生成视频，Veo 通常需要 1~5 分钟，请耐心等待…</span>
                  </div>
                ) : chatMode === 'image' ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#64748b', fontSize: 13 }}>
                    <Spin size="small" />
                    <span>正在生成图片，请稍候…</span>
                  </div>
                ) : (
                  <TypingDots />
                )}
              </div>
            </div>
          )}

          <style>{`@keyframes cursorBlink { 0%, 50% { opacity: 1; } 51%, 100% { opacity: 0; } }`}</style>
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* ── 输入区 ── */}
      <div style={{ padding: '0 20px 18px', flexShrink: 0 }}>
        <div style={{ maxWidth: 760, margin: '0 auto' }}>

          {/* 附件预览栏 */}
          {attachments.length > 0 && (
            <div style={{
              display: 'flex', gap: 8, flexWrap: 'wrap',
              padding: '10px 14px 6px',
              background: 'rgba(255,255,255,0.82)',
              backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
              borderRadius: '14px 14px 0 0',
              border: '1px solid rgba(255,255,255,0.60)', borderBottom: 'none',
            }}>
              {attachments.map((att) => (
                <div key={att.id} style={{ position: 'relative', display: 'inline-block' }}>
                  {att.type === 'image' ? (
                    <AntImage src={att.dataUrl} alt={att.name} width={56} height={56}
                      style={{ objectFit: 'cover', borderRadius: 9, border: '1px solid rgba(255,255,255,0.5)', display: 'block' }}
                      preview={{ mask: '预览' }} />
                  ) : (
                    <div style={{
                      width: 56, height: 56, borderRadius: 9,
                      border: '1px solid rgba(255,255,255,0.5)',
                      background: 'rgba(241,245,249,0.80)',
                      display: 'flex', flexDirection: 'column',
                      alignItems: 'center', justifyContent: 'center', gap: 2,
                    }}>
                      <span style={{ fontSize: 18 }}>{att.type === 'video' ? '🎬' : '🎵'}</span>
                      <span style={{ fontSize: 9, color: '#64748b', maxWidth: 50, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {att.name}
                      </span>
                    </div>
                  )}
                  <CloseCircleFilled
                    style={{ position: 'absolute', top: -5, right: -5, color: '#ef4444', fontSize: 15, cursor: 'pointer', background: '#fff', borderRadius: '50%' }}
                    onClick={() => removeAttachment(att.id)}
                  />
                </div>
              ))}
            </div>
          )}

          {/* 模式切换 */}
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 10 }}>
            <Segmented
              value={chatMode}
              onChange={handleModeChange}
              disabled={loading || streaming}
              size="small"
              style={{
                background: 'rgba(255,255,255,0.68)',
                backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)',
                border: '1px solid rgba(255,255,255,0.50)',
                borderRadius: 22,
              }}
              options={[
                { value: 'chat',  label: '对话',    icon: <MessageOutlined /> },
                { value: 'image', label: '图像生成', icon: <PictureOutlined /> },
                { value: 'video', label: '视频生成', icon: <VideoCameraOutlined /> },
              ]}
            />
          </div>

          {/* 输入卡片（毛玻璃） */}
          <div style={{
            background: 'rgba(255,255,255,0.84)',
            backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
            border: '1px solid rgba(255,255,255,0.65)',
            borderRadius: attachments.length > 0 ? '0 0 18px 18px' : 18,
            boxShadow: '0 8px 32px rgba(99,102,241,0.10)',
            padding: '10px 14px',
          }}>
            <input ref={fileInputRef} type="file" accept="image/*,video/*,audio/*" multiple
              style={{ display: 'none' }} onChange={handleFileSelect} />

            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8 }}>
              <Tooltip title="上传图片、视频或音频">
                <Button icon={<PaperClipOutlined />} type="text"
                  style={{ color: '#94a3b8', flexShrink: 0, marginBottom: 1, borderRadius: 8 }}
                  onClick={() => fileInputRef.current?.click()}
                  disabled={loading || streaming} />
              </Tooltip>

              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
                }}
                placeholder={MODE_PLACEHOLDER[chatMode]}
                rows={1}
                disabled={loading || streaming}
                style={{
                  flex: 1, border: 'none', outline: 'none', resize: 'none',
                  fontSize: 14, lineHeight: 1.65, color: '#1e293b',
                  background: 'transparent', padding: '4px 0',
                  minHeight: 26, maxHeight: 160, overflowY: 'auto',
                  fontFamily: 'inherit',
                }}
                onInput={(e) => {
                  const el = e.currentTarget;
                  el.style.height = 'auto';
                  el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
                }}
              />

              <Button
                type="primary"
                icon={<SendOutlined />}
                onClick={handleSend}
                loading={loading}
                disabled={
                  ((chatMode !== 'chat' ? !input.trim() : (!input.trim() && attachments.length === 0)) || streaming)
                }
                style={{
                  flexShrink: 0, borderRadius: 11,
                  background: (input.trim() || attachments.length > 0) && !streaming ? gradient : undefined,
                  border: 'none', height: 35, paddingInline: 18,
                  boxShadow: (input.trim() || attachments.length > 0) && !streaming ? `0 4px 14px ${color}40` : 'none',
                }}
              >
                {chatMode === 'chat' ? '发送' : '生成'}
              </Button>
            </div>
          </div>

          <div style={{ textAlign: 'center', color: '#94a3b8', fontSize: 11, marginTop: 9, letterSpacing: 0.2 }}>
            Enter 发送 &nbsp;·&nbsp; Shift+Enter 换行 &nbsp;·&nbsp; 支持拖放上传文件
          </div>
        </div>
      </div>
    </div>
  );
};

export default Chat;
