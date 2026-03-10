import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react'; // React hooks
import { Button, Select, Spin, Modal, Avatar } from 'antd'; // Ant Design 组件
import { SendOutlined, RobotOutlined, UserOutlined, ClearOutlined } from '@ant-design/icons'; // 图标
import { useAuthStore } from '@/store/authStore'; // 用户认证 store
import { useTabStore } from '@/store'; // Tab 管理 store
import { streamChat, type ChatMessage as ApiChatMessage } from '@/services/chat'; // SSE 聊天服务
import { modelsService, type ActiveModel } from '@/services/models'; // 模型服务
import TabBar from '@/components/common/TabBar'; // 标签栏组件
import ThinkingChain from '@/components/common/ThinkingChain'; // 思考链组件

// ── 本地消息类型（用于显示） ──────────────────────────────────────────────

interface ChatMessage {
  id: string; // 唯一消息 ID
  role: 'user' | 'assistant'; // 消息角色：用户或助手
  content: string; // 消息内容
  time: string; // 消息时间戳
}

// 消息 ID 生成器（全局计数器）
let _msgIdCounter = 0;
const nextId = () => `msg-${++_msgIdCounter}`;

// 获取当前时间字符串（HH:MM 格式）
const getNow = () => {
  const d = new Date();
  return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
};

// ── NewChat 组件（对话页，含多标签） ────────────────────────────────────

const NewChat: React.FC = () => {
  // ── Store 状态 ──────────────────────────────────────────────────────────

  // Tab 管理 store
  const {
    chatTabs,
    activeChatTabId,
    openChatTab,
    closeChatTab,
    setActiveChatTab,
    updateChatTabMessages,
    updateChatTabLoading,
    updateChatTabStreaming,
    updateChatTabInput,
    updateChatTabModelId,
  } = useTabStore();

  // 用户认证状态
  const user = useAuthStore((s) => s.user);

  // ── 局部状态 ────────────────────────────────────────────────────────────

  // 可用的 LLM 模型列表
  const [availableModels, setAvailableModels] = useState<ActiveModel[]>([]);

  // 消息滚动 ref
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // ── 计算当前活跃 tab ────────────────────────────────────────────────────

  // 获取当前活跃的 tab 对象
  const activeTab = useMemo(() => {
    return chatTabs.find((t) => t.id === activeChatTabId);
  }, [chatTabs, activeChatTabId]);

  // 若没有活跃 tab（异常情况），显示加载状态
  if (!activeTab) {
    return (
      <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Spin size="large" />
      </div>
    );
  }

  // ── 副作用：初始化模型列表 ────────────────────────────────────────────────

  // 页面挂载时，加载可用的 LLM 模型
  useEffect(() => {
    modelsService
      .getActive()
      .then((models) => {
        // 只保留 LLM 模型（过滤掉图像/视频模型）
        const llmModels = models.filter((m) => m.model_type === 'llm');
        setAvailableModels(llmModels);

        // 若当前 tab 未选择模型，自动设置为默认模型
        if (activeTab && !activeTab.selectedModelId && llmModels.length > 0) {
          const defaultModel = llmModels.find((m) => m.is_default) || llmModels[0];
          updateChatTabModelId(activeTab.id, defaultModel.id);
        }
      })
      .catch(() => {}); // 失败时静默处理
  }, [activeTab?.id, updateChatTabModelId, activeTab]);

  // ── 副作用：自动滚动到消息末尾 ────────────────────────────────────────

  // 当消息列表或加载状态变化时，自动滚动到最后
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'auto' });
  }, [activeTab.messages, activeTab.loading]);

  // ── 事件处理器 ──────────────────────────────────────────────────────────

  // 发送消息
  const handleSend = useCallback(async () => {
    // 校验：输入框有内容，且未加载中
    const userContent = activeTab.input.trim();
    if (!userContent || activeTab.loading || activeTab.streaming) return;

    // 创建用户消息
    const userMsg: ChatMessage = {
      id: nextId(),
      role: 'user',
      content: userContent,
      time: getNow(),
    };

    // 添加用户消息到列表，清空输入框，开始加载
    updateChatTabMessages(activeTab.id, [...activeTab.messages, userMsg]);
    updateChatTabInput(activeTab.id, '');
    updateChatTabLoading(activeTab.id, true);

    // 构建 API 调用的消息列表（包含 system prompt + 历史消息）
    const apiMessages: ApiChatMessage[] = [
      { role: 'system', content: `你是一个AI智能助手。今天是 ${new Date().toLocaleDateString('zh-CN')}。请用中文回答。` },
      ...activeTab.messages.map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content })),
      { role: 'user', content: userContent },
    ];

    // 创建 AI 消息对象（初始为空，会逐步填充）
    const assistantMsg: ChatMessage = { id: nextId(), role: 'assistant', content: '', time: getNow() };

    try {
      // 调用 SSE 流式聊天服务
      const stream = streamChat(apiMessages, undefined, undefined, activeTab.selectedModelId);
      let firstToken = true;

      // 迭代 SSE 流，逐个处理 token
      for await (const delta of stream) {
        if (firstToken) {
          // 第一个 token 到达，结束加载，开始流式输出
          firstToken = false;
          updateChatTabLoading(activeTab.id, false);
          updateChatTabStreaming(activeTab.id, true);
          // 把 AI 消息添加到列表
          updateChatTabMessages(activeTab.id, [...activeTab.messages, userMsg, assistantMsg]);
        } else {
          // 追加 token 内容到 AI 消息
          const currentMessages = useTabStore.getState().chatTabs.find((t) => t.id === activeTab.id)?.messages || [];
          if (currentMessages.length > 0 && currentMessages[currentMessages.length - 1].role === 'assistant') {
            const updated = [...currentMessages];
            const last = updated[updated.length - 1];
            updated[updated.length - 1] = { ...last, content: last.content + delta };
            updateChatTabMessages(activeTab.id, updated);
          }
        }
      }

      // 如果没有接收到任何 token，说明 AI 无响应
      if (firstToken) {
        updateChatTabLoading(activeTab.id, false);
        Modal.error({
          title: 'AI 无响应',
          content: '没有收到任何内容，请检查模型配置。',
          okText: '关闭',
        });
      }
    } catch (err: any) {
      // 发生错误，显示错误提示
      updateChatTabLoading(activeTab.id, false);
      Modal.error({
        title: '请求失败',
        content: err.message || '未知错误',
        okText: '关闭',
      });
    } finally {
      // 流式输出结束
      updateChatTabStreaming(activeTab.id, false);
    }
  }, [activeTab, updateChatTabMessages, updateChatTabInput, updateChatTabLoading, updateChatTabStreaming]);

  // 清空当前对话
  const handleClear = useCallback(() => {
    updateChatTabMessages(activeTab.id, []);
    updateChatTabInput(activeTab.id, '');
  }, [activeTab.id, updateChatTabMessages, updateChatTabInput]);

  // 切换 tab 时的处理（来自 TabBar）
  const handleTabClick = (tabId: string) => {
    setActiveChatTab(tabId);
  };

  // 关闭 tab 时的处理（来自 TabBar）
  const handleTabClose = (tabId: string) => {
    closeChatTab(tabId);
  };

  // 新建 tab（来自 TabBar）
  const handleNewTab = () => {
    openChatTab();
  };

  // ── 渲染 ────────────────────────────────────────────────────────────────

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* 标签栏 - 可多开对话 */}
      <TabBar
        tabs={chatTabs.map((t) => ({ id: t.id, title: t.title }))}
        activeTabId={activeChatTabId}
        onTabClick={handleTabClick}
        onTabClose={handleTabClose}
        onNewTab={handleNewTab}
      />

      {/* 顶部工具栏 - 模型选择 + 清空 */}
      <div
        style={{
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
        }}
      >
        {/* 左：标题 */}
        <div>
          <div style={{ fontWeight: 600, fontSize: 14, color: '#1e293b' }}>AI 对话</div>
          <div style={{ fontSize: 11, color: '#94a3b8' }}>智能助手对话</div>
        </div>

        {/* 右：模型选择 + 清空 */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {availableModels.length > 0 && (
            <Select
              value={activeTab.selectedModelId}
              onChange={(val) => {
                updateChatTabModelId(activeTab.id, val);
              }}
              disabled={activeTab.loading || activeTab.streaming}
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
            disabled={activeTab.messages.length === 0}
            style={{ borderRadius: 8 }}
          >
            清空
          </Button>
        </div>
      </div>

      {/* 消息区 - 可滚动 */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '24px 20px 12px', backgroundColor: '#f7f7f8' }}>
        <div style={{ maxWidth: 760, margin: '0 auto' }}>
          {/* 欢迎屏：无消息时显示 */}
          {activeTab.messages.length === 0 && !activeTab.loading && (
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                minHeight: '52vh',
                gap: 16,
              }}
            >
              <div
                style={{
                  width: 80,
                  height: 80,
                  borderRadius: 24,
                  background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 12px 36px rgba(99,102,241,0.40)',
                }}
              >
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
          {activeTab.messages.map((msg) => (
            <div key={msg.id} style={{ marginBottom: 20 }}>
              {msg.role === 'user' ? (
                // 用户消息：右对齐，蓝色背景
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, alignItems: 'flex-end' }}>
                  <div style={{ maxWidth: '72%' }}>
                    <div
                      style={{
                        padding: '11px 16px',
                        background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                        color: '#fff',
                        borderRadius: '18px 4px 18px 18px',
                        fontSize: 14,
                        lineHeight: 1.6,
                        whiteSpace: 'pre-wrap',
                        wordBreak: 'break-word',
                        boxShadow: '0 4px 16px rgba(99,102,241,0.35)',
                      }}
                    >
                      {msg.content}
                    </div>
                    <div style={{ fontSize: 11, color: '#94a3b8', textAlign: 'right', marginTop: 4 }}>
                      {msg.time}
                    </div>
                  </div>
                  {/* 用户头像 */}
                  <Avatar
                    size={34}
                    style={{
                      background: 'linear-gradient(135deg, #22c55e, #16a34a)',
                      flexShrink: 0,
                      fontSize: 13,
                      fontWeight: 700,
                    }}
                  >
                    {user?.username?.charAt(0).toUpperCase() || <UserOutlined />}
                  </Avatar>
                </div>
              ) : (
                // AI 消息：左对齐，白色背景
                <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                  {/* AI 头像 */}
                  <Avatar
                    size={34}
                    icon={<RobotOutlined />}
                    style={{
                      background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                      flexShrink: 0,
                    }}
                  />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
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
                      }}
                    >
                      {msg.content}
                    </div>
                    <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 4 }}>{msg.time}</div>
                  </div>
                </div>
              )}
            </div>
          ))}

          {/* 思考链动画 - 加载中时显示 */}
          <ThinkingChain visible={activeTab.loading} mode="chat" />

          {/* 加载动画 - 正在流式输出时显示 */}
          {activeTab.streaming && (
            <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
              <Avatar
                size={34}
                icon={<RobotOutlined />}
                style={{
                  background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                  flexShrink: 0,
                }}
              />
              <div
                style={{
                  padding: '12px 16px',
                  background: 'rgba(255,255,255,0.78)',
                  backdropFilter: 'blur(16px)',
                  WebkitBackdropFilter: 'blur(16px)',
                  borderRadius: '4px 18px 18px 18px',
                  boxShadow: '0 2px 14px rgba(0,0,0,0.06)',
                  border: '1px solid rgba(255,255,255,0.65)',
                }}
              >
                <Spin size="small" />
              </div>
            </div>
          )}

          {/* 消息末尾 ref - 用于自动滚动 */}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* 输入区 - 固定在底部 */}
      <div style={{ padding: '0 20px 18px', flexShrink: 0, backgroundColor: '#f7f7f8' }}>
        <div style={{ maxWidth: 760, margin: '0 auto' }}>
          <div
            style={{
              background: 'rgba(255,255,255,0.84)',
              backdropFilter: 'blur(20px)',
              WebkitBackdropFilter: 'blur(20px)',
              border: '1px solid rgba(255,255,255,0.65)',
              borderRadius: 18,
              boxShadow: '0 8px 32px rgba(99,102,241,0.10)',
              padding: '10px 14px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8 }}>
              {/* 文本输入框 */}
              <textarea
                value={activeTab.input}
                onChange={(e) => updateChatTabInput(activeTab.id, e.target.value)}
                onKeyDown={(e) => {
                  // Enter 发送，Shift+Enter 换行
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
                placeholder="输入消息… (Enter 发送，Shift+Enter 换行)"
                rows={1}
                disabled={activeTab.loading || activeTab.streaming}
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
                  // 自动调整 textarea 高度
                  const el = e.currentTarget;
                  el.style.height = 'auto';
                  el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
                }}
              />
              {/* 发送按钮 */}
              <Button
                type="primary"
                icon={<SendOutlined />}
                onClick={handleSend}
                loading={activeTab.loading}
                disabled={!activeTab.input.trim() || activeTab.streaming}
                style={{
                  flexShrink: 0,
                  borderRadius: 11,
                  background:
                    activeTab.input.trim() && !activeTab.streaming
                      ? 'linear-gradient(135deg, #6366f1, #8b5cf6)'
                      : undefined,
                  border: 'none',
                  height: 35,
                  paddingInline: 18,
                  boxShadow:
                    activeTab.input.trim() && !activeTab.streaming
                      ? '0 4px 14px rgba(99,102,241,0.40)'
                      : 'none',
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

export default NewChat;
