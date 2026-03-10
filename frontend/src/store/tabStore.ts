import { create } from 'zustand'; // Zustand 状态管理库
import { ChatMessage } from '@/types'; // 导入消息类型

// 生成唯一 ID（使用浏览器原生 crypto API）
const generateId = () => crypto.randomUUID();

// ── Tab 类型定义 ────────────────────────────────────────────────────────────

// 对话标签接口 - 存储每个对话 tab 的信息和状态
export interface ChatTab {
  id: string; // tab 唯一 ID（前端 UUID，用于标识不同 tab）
  type: 'chat'; // 标签类型为对话
  title: string; // 显示标题，默认"新对话"，有数据后用对话标题
  conversationId?: string; // 绑定的后端 conversation id（新对话时为空，发消息后填入）
  messages: ChatMessage[]; // 这个 tab 的消息列表（每 tab 独立，切换 tab 时不互串）
  loading: boolean; // 等待第一个 token 时为 true
  streaming: boolean; // 文字流式输出中为 true
  input: string; // 输入框当前文本
  selectedModelId?: string; // 选中的模型 ID（前端获取可用模型后初始化）
}

// 生成标签接口 - 存储每个生成任务 tab 的信息和状态
export interface GenerateTab {
  id: string; // tab 唯一 ID
  type: 'generate'; // 标签类型为生成
  title: string; // 显示标题，默认"新任务"，生成后改为 prompt 前 20 字
  generationId?: string; // 从历史页打开生成记录时使用（用于回溯）
  prompt: string; // 提示词文本
  mode: 'image' | 'video'; // 生成模式：图像或视频
  selectedModelId?: string; // 选中的模型配置 UUID
  generatedImages?: string[]; // 生成的图片 DataURL 列表
  generatedVideos?: string[]; // 生成的视频 URL 列表
  loading: boolean; // 生成中为 true
}

// ── Store State 定义 ───────────────────────────────────────────────────────

interface TabState {
  // ── 对话页相关状态 ──────────────────────────────────────────────────────

  // 对话 tab 列表
  chatTabs: ChatTab[];

  // 当前活跃的对话 tab ID（可能为空，不应该发生，但为防守）
  activeChatTabId: string | null;

  // ── 生成页相关状态 ──────────────────────────────────────────────────────

  // 生成 tab 列表
  generateTabs: GenerateTab[];

  // 当前活跃的生成 tab ID
  activeGenerateTabId: string | null;

  // ── Chat Tab 操作方法 ──────────────────────────────────────────────────

  // 打开或激活一个对话 tab
  // conversationId 为空 => 新对话
  // conversationId 已存在 => 直接激活已有 tab，避免重复
  // 返回 tab id
  openChatTab: (conversationId?: string, title?: string) => string;

  // 关闭指定对话 tab
  // 如果关闭的是最后一个 tab，自动创建新空 tab（保证页面不空白）
  closeChatTab: (tabId: string) => void;

  // 激活指定对话 tab（用户点击 tab 时调用）
  setActiveChatTab: (tabId: string) => void;

  // 更新指定 tab 的标题（例如对话有标题后更新）
  updateChatTabTitle: (tabId: string, title: string) => void;

  // 发送第一条消息后，后端返回 conversation_id，写入 tab
  updateChatTabConversationId: (tabId: string, conversationId: string) => void;

  // 更新对话 tab 的消息列表
  updateChatTabMessages: (tabId: string, messages: ChatMessage[]) => void;

  // 更新对话 tab 的加载状态
  updateChatTabLoading: (tabId: string, loading: boolean) => void;

  // 更新对话 tab 的流式输出状态
  updateChatTabStreaming: (tabId: string, streaming: boolean) => void;

  // 更新对话 tab 的输入框文本
  updateChatTabInput: (tabId: string, input: string) => void;

  // 更新对话 tab 的选中模型 ID
  updateChatTabModelId: (tabId: string, modelId: string) => void;

  // ── Generate Tab 操作方法 ──────────────────────────────────────────────

  // 打开或激活一个生成 tab
  openGenerateTab: (generationId?: string, title?: string) => string;

  // 关闭指定生成 tab
  closeGenerateTab: (tabId: string) => void;

  // 激活指定生成 tab
  setActiveGenerateTab: (tabId: string) => void;

  // 更新指定生成 tab 的提示词
  updateGenerateTabPrompt: (tabId: string, prompt: string) => void;

  // 更新指定生成 tab 的模式
  updateGenerateTabMode: (tabId: string, mode: 'image' | 'video') => void;

  // 更新指定生成 tab 的模型 ID
  updateGenerateTabModelId: (tabId: string, modelId: string) => void;

  // 更新指定生成 tab 的加载状态
  updateGenerateTabLoading: (tabId: string, loading: boolean) => void;

  // 更新指定生成 tab 的生成结果（图片或视频）
  updateGenerateTabResult: (tabId: string, images?: string[], videos?: string[]) => void;

  // 更新指定生成 tab 的标题（根据 prompt 或生成完成后自动更新）
  updateGenerateTabTitle: (tabId: string, title: string) => void;
}

// ── Zustand Store 实现 ───────────────────────────────────────────────────────

export const useTabStore = create<TabState>((set, get) => {
  // 创建初始对话 tab（默认"新对话"）
  const defaultChatTab: ChatTab = {
    id: generateId(),
    type: 'chat',
    title: '新对话',
    messages: [],
    loading: false,
    streaming: false,
    input: '',
  };

  // 创建初始生成 tab（默认"新任务"）
  const defaultGenerateTab: GenerateTab = {
    id: generateId(),
    type: 'generate',
    title: '新任务',
    prompt: '',
    mode: 'image',
    loading: false,
  };

  return {
    // 初始状态
    chatTabs: [defaultChatTab],
    activeChatTabId: defaultChatTab.id,
    generateTabs: [defaultGenerateTab],
    activeGenerateTabId: defaultGenerateTab.id,

    // ── Chat Tab 实现 ──────────────────────────────────────────────────────

    openChatTab: (conversationId, title) => {
      // 如果传入了 conversationId 且已存在该对话的 tab，直接激活
      if (conversationId) {
        const existing = get().chatTabs.find(t => t.conversationId === conversationId);
        if (existing) {
          set({ activeChatTabId: existing.id });
          return existing.id;
        }
      }

      // 创建新 tab
      const newTab: ChatTab = {
        id: generateId(),
        type: 'chat',
        title: title ?? '新对话',
        conversationId,
        messages: [],
        loading: false,
        streaming: false,
        input: '',
      };

      set(state => ({
        chatTabs: [...state.chatTabs, newTab],
        activeChatTabId: newTab.id,
      }));

      return newTab.id;
    },

    closeChatTab: (tabId: string) => {
      set(state => {
        // 过滤掉要关闭的 tab
        const tabs = state.chatTabs.filter(t => t.id !== tabId);

        // 如果删除后没有 tab 了，创建一个默认 tab（保证页面不空白）
        if (tabs.length === 0) {
          const fallback: ChatTab = {
            id: generateId(),
            type: 'chat',
            title: '新对话',
            messages: [],
            loading: false,
            streaming: false,
            input: '',
          };
          return {
            chatTabs: [fallback],
            activeChatTabId: fallback.id,
          };
        }

        // 如果关闭的 tab 是当前活跃的，切换到最后一个 tab
        const newActive = state.activeChatTabId === tabId ? tabs[tabs.length - 1].id : state.activeChatTabId;

        return {
          chatTabs: tabs,
          activeChatTabId: newActive,
        };
      });
    },

    setActiveChatTab: (tabId: string) => {
      set({ activeChatTabId: tabId });
    },

    updateChatTabTitle: (tabId: string, title: string) => {
      set(state => ({
        chatTabs: state.chatTabs.map(t => (t.id === tabId ? { ...t, title } : t)),
      }));
    },

    updateChatTabConversationId: (tabId: string, conversationId: string) => {
      set(state => ({
        chatTabs: state.chatTabs.map(t => (t.id === tabId ? { ...t, conversationId } : t)),
      }));
    },

    updateChatTabMessages: (tabId: string, messages: ChatMessage[]) => {
      set(state => ({
        chatTabs: state.chatTabs.map(t => (t.id === tabId ? { ...t, messages } : t)),
      }));
    },

    updateChatTabLoading: (tabId: string, loading: boolean) => {
      set(state => ({
        chatTabs: state.chatTabs.map(t => (t.id === tabId ? { ...t, loading } : t)),
      }));
    },

    updateChatTabStreaming: (tabId: string, streaming: boolean) => {
      set(state => ({
        chatTabs: state.chatTabs.map(t => (t.id === tabId ? { ...t, streaming } : t)),
      }));
    },

    updateChatTabInput: (tabId: string, input: string) => {
      set(state => ({
        chatTabs: state.chatTabs.map(t => (t.id === tabId ? { ...t, input } : t)),
      }));
    },

    updateChatTabModelId: (tabId: string, modelId: string) => {
      set(state => ({
        chatTabs: state.chatTabs.map(t => (t.id === tabId ? { ...t, selectedModelId: modelId } : t)),
      }));
    },

    // ── Generate Tab 实现 ─────────────────────────────────────────────────

    openGenerateTab: (generationId, title) => {
      // 如果传入了 generationId 且已存在该生成的 tab，直接激活
      if (generationId) {
        const existing = get().generateTabs.find(t => t.generationId === generationId);
        if (existing) {
          set({ activeGenerateTabId: existing.id });
          return existing.id;
        }
      }

      // 创建新 tab
      const newTab: GenerateTab = {
        id: generateId(),
        type: 'generate',
        title: title ?? '新任务',
        generationId,
        prompt: '',
        mode: 'image',
        loading: false,
      };

      set(state => ({
        generateTabs: [...state.generateTabs, newTab],
        activeGenerateTabId: newTab.id,
      }));

      return newTab.id;
    },

    closeGenerateTab: (tabId: string) => {
      set(state => {
        const tabs = state.generateTabs.filter(t => t.id !== tabId);

        if (tabs.length === 0) {
          const fallback: GenerateTab = {
            id: generateId(),
            type: 'generate',
            title: '新任务',
            prompt: '',
            mode: 'image',
            loading: false,
          };
          return {
            generateTabs: [fallback],
            activeGenerateTabId: fallback.id,
          };
        }

        const newActive = state.activeGenerateTabId === tabId ? tabs[tabs.length - 1].id : state.activeGenerateTabId;

        return {
          generateTabs: tabs,
          activeGenerateTabId: newActive,
        };
      });
    },

    setActiveGenerateTab: (tabId: string) => {
      set({ activeGenerateTabId: tabId });
    },

    updateGenerateTabPrompt: (tabId: string, prompt: string) => {
      set(state => ({
        generateTabs: state.generateTabs.map(t => (t.id === tabId ? { ...t, prompt } : t)),
      }));
    },

    updateGenerateTabMode: (tabId: string, mode: 'image' | 'video') => {
      set(state => ({
        generateTabs: state.generateTabs.map(t => (t.id === tabId ? { ...t, mode } : t)),
      }));
    },

    updateGenerateTabModelId: (tabId: string, modelId: string) => {
      set(state => ({
        generateTabs: state.generateTabs.map(t => (t.id === tabId ? { ...t, selectedModelId: modelId } : t)),
      }));
    },

    updateGenerateTabLoading: (tabId: string, loading: boolean) => {
      set(state => ({
        generateTabs: state.generateTabs.map(t => (t.id === tabId ? { ...t, loading } : t)),
      }));
    },

    updateGenerateTabResult: (tabId: string, images, videos) => {
      set(state => ({
        generateTabs: state.generateTabs.map(t =>
          t.id === tabId ? { ...t, generatedImages: images, generatedVideos: videos } : t,
        ),
      }));
    },

    updateGenerateTabTitle: (tabId: string, title: string) => {
      set(state => ({
        generateTabs: state.generateTabs.map(t => (t.id === tabId ? { ...t, title } : t)),
      }));
    },
  };
});
