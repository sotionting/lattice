import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Button, Select, Spin, Modal, Avatar } from 'antd';
import {
  SendOutlined, RobotOutlined, UserOutlined,
  ClearOutlined,
} from '@ant-design/icons';
import { useAuthStore } from '@/store/authStore';
import { streamChat, type ChatMessage as ApiChatMessage } from '@/services/chat';
import { modelsService, type ActiveModel } from '@/services/models';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  time: string;
}

let _msgIdCounter = 0;
const nextId = () => `msg-${++_msgIdCounter}`;

const getNow = () => {
  const d = new Date();
  return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
};

const Conversations: React.FC = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [streaming, setStreaming] = useState(false);
  const [availableModels, setAvailableModels] = useState<ActiveModel[]>([]);
  const [selectedModelId, setSelectedModelId] = useState<string | undefined>(undefined);

  const user = useAuthStore((s) => s.user);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // 加载 LLM 模型
  useEffect(() => {
    modelsService.getActive()
      .then((models) => {
        const llmModels = models.filter((m) => m.model_type === 'llm');
        setAvailableModels(llmModels);
        const def = llmModels.find((m) => m.is_default) ?? llmModels[0];
        if (def) setSelectedModelId(def.id);
      })
      .catch(() => {});
  }, []);

  // 滚动到最后
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'auto' });
  }, [messages, loading]);

  // 发送消息
  const handleSend = useCallback(async () => {
    const userContent = input.trim();
    if (!userContent || loading || streaming) return;

    const userMsg: ChatMessage = {
      id: nextId(),
      role: 'user',
      content: userContent,
      time: getNow(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    const apiMessages: ApiChatMessage[] = [
      { role: 'system', content: `你是一个AI智能助手。今天是 ${new Date().toLocaleDateString('zh-CN')}。请用中文回答。` },
      ...messages.map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content })),
      { role: 'user', content: userContent },
    ];

    const assistantMsg: ChatMessage = { id: nextId(), role: 'assistant', content: '', time: getNow() };

    try {
      const stream = streamChat(apiMessages, undefined, undefined, selectedModelId);
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
        Modal.error({ title: 'AI 无响应', content: '没有收到任何内容，请检查模型配置。', okText: '关闭' });
      }
    } catch (err: any) {
      setLoading(false);
      Modal.error({ title: '请求失败', content: err.message || '未知错误', okText: '关闭' });
    } finally {
      setStreaming(false);
    }
  }, [input, loading, streaming, messages, selectedModelId]);

  const handleClear = () => {
    setMessages([]);
    setInput('');
  };

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* 顶部工具栏 */}
      <div style={{
        height: 56,
        padding: '0 20px',
        flexShrink: 0,
        background: 'rgba(255,255,255,0.72)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        borderBottom: '1px solid rgba(255,255,255,0.55)',
        boxShadow: '0 1px 12px rgba(99,102,241,0.06)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}>
        {/* 左：标题 */}
        <div>
          <div style={{ fontWeight: 600, fontSize: 14, color: '#1e293b' }}>AI 对话</div>
          <div style={{ fontSize: 11, color: '#94a3b8' }}>智能助手对话</div>
        </div>

        {/* 右：模型选择 + 清空 */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {availableModels.length > 0 && (
            <Select
              value={selectedModelId}
              onChange={(val) => setSelectedModelId(val)}
              disabled={loading || streaming}
              size="small"
              style={{ width: 160 }}
              placeholder="选择模型"
              options={availableModels.map((m) => ({
                value: m.id,
                label: m.is_default ? `★ ${m.name}` : m.name,
              }))}
            />
          )}
          <Button
            icon={<ClearOutlined />}
            size="small"
            onClick={handleClear}
            disabled={messages.length === 0}
            style={{ borderRadius: 8 }}
          >
            清空
          </Button>
        </div>
      </div>

      {/* 消息区 */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '24px 20px 12px' }}>
        <div style={{ maxWidth: 760, margin: '0 auto' }}>
          {messages.length === 0 && !loading && (
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              minHeight: '52vh',
              gap: 16,
            }}>
              <div style={{
                width: 80,
                height: 80,
                borderRadius: 24,
                background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 12px 36px rgba(99,102,241,0.40)',
              }}>
                <RobotOutlined style={{ color: '#fff', fontSize: 36 }} />
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 26, fontWeight: 700, color: '#1e293b', marginBottom: 8 }}>
                  有什么可以帮你的？
                </div>
                <div style={{ fontSize: 14, color: '#64748b', lineHeight: 1.6 }}>
                  我是你的 AI 助手，可以回答问题、提供建议、帮助写作等。
                </div>
              </div>
            </div>
          )}

          {/* 消息列表 */}
          {messages.map((msg) => (
            <div key={msg.id} style={{ marginBottom: 20 }}>
              {msg.role === 'user' ? (
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, alignItems: 'flex-end' }}>
                  <div style={{ maxWidth: '72%' }}>
                    <div style={{
                      padding: '11px 16px',
                      background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                      color: '#fff',
                      borderRadius: '18px 4px 18px 18px',
                      fontSize: 14,
                      lineHeight: 1.6,
                      whiteSpace: 'pre-wrap',
                      wordBreak: 'break-word',
                      boxShadow: '0 4px 16px rgba(99,102,241,0.35)',
                    }}>
                      {msg.content}
                    </div>
                    <div style={{ fontSize: 11, color: '#94a3b8', textAlign: 'right', marginTop: 4 }}>
                      {msg.time}
                    </div>
                  </div>
                  <Avatar size={34} style={{
                    background: 'linear-gradient(135deg, #22c55e, #16a34a)',
                    flexShrink: 0,
                    fontSize: 13,
                    fontWeight: 700,
                  }}>
                    {user?.username?.charAt(0).toUpperCase() || <UserOutlined />}
                  </Avatar>
                </div>
              ) : (
                <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                  <Avatar size={34} icon={<RobotOutlined />}
                    style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', flexShrink: 0 }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{
                      padding: '12px 16px',
                      background: 'rgba(255,255,255,0.78)',
                      backdropFilter: 'blur(16px)',
                      WebkitBackdropFilter: 'blur(16px)',
                      color: '#1e293b',
                      borderRadius: '4px 18px 18px 18px',
                      fontSize: 14,
                      lineHeight: 1.6,
                      boxShadow: '0 2px 14px rgba(0,0,0,0.06)',
                      border: '1px solid rgba(255,255,255,0.65)',
                      wordBreak: 'break-word',
                      whiteSpace: 'pre-wrap',
                    }}>
                      {msg.content}
                    </div>
                    <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 4 }}>
                      {msg.time}
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}

          {/* Loading 动画 */}
          {loading && (
            <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
              <Avatar size={34} icon={<RobotOutlined />}
                style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', flexShrink: 0 }} />
              <div style={{
                padding: '12px 16px',
                background: 'rgba(255,255,255,0.78)',
                backdropFilter: 'blur(16px)',
                WebkitBackdropFilter: 'blur(16px)',
                borderRadius: '4px 18px 18px 18px',
                boxShadow: '0 2px 14px rgba(0,0,0,0.06)',
                border: '1px solid rgba(255,255,255,0.65)',
              }}>
                <Spin size="small" />
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* 输入区 */}
      <div style={{ padding: '0 20px 18px', flexShrink: 0 }}>
        <div style={{ maxWidth: 760, margin: '0 auto' }}>
          <div style={{
            background: 'rgba(255,255,255,0.84)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            border: '1px solid rgba(255,255,255,0.65)',
            borderRadius: 18,
            boxShadow: '0 8px 32px rgba(99,102,241,0.10)',
            padding: '10px 14px',
          }}>
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8 }}>
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
                }}
                placeholder="输入消息… (Enter 发送，Shift+Enter 换行)"
                rows={1}
                disabled={loading || streaming}
                style={{
                  flex: 1,
                  border: 'none',
                  outline: 'none',
                  resize: 'none',
                  fontSize: 14,
                  lineHeight: 1.65,
                  color: '#1e293b',
                  background: 'transparent',
                  padding: '4px 0',
                  minHeight: 26,
                  maxHeight: 160,
                  overflowY: 'auto',
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
                disabled={!input.trim() || streaming}
                style={{
                  flexShrink: 0,
                  borderRadius: 11,
                  background: input.trim() && !streaming ? 'linear-gradient(135deg, #6366f1, #8b5cf6)' : undefined,
                  border: 'none',
                  height: 35,
                  paddingInline: 18,
                  boxShadow: input.trim() && !streaming ? '0 4px 14px rgba(99,102,241,0.40)' : 'none',
                }}
              >
                发送
              </Button>
            </div>
          </div>
          <div style={{ textAlign: 'center', color: '#94a3b8', fontSize: 11, marginTop: 9 }}>
            Enter 发送 &nbsp;·&nbsp; Shift+Enter 换行
          </div>
        </div>
      </div>
    </div>
  );
};

export default Conversations;
