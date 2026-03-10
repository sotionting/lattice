import React, { useState, useEffect } from 'react'; // React hooks
import { RobotOutlined, CheckCircleOutlined, LoadingOutlined } from '@ant-design/icons'; // Ant Design 图标
import './ThinkingChain.css'; // 思考链样式

// ── 思考步骤定义 ────────────────────────────────────────────────────────

// 每个思考步骤的配置
interface ThinkingStep {
  icon: string; // emoji 或文字图标
  text: string; // 步骤文本
}

// 思考步骤列表（模拟 Kimi Agent 的风格）
const THINKING_STEPS: ThinkingStep[] = [
  { icon: '🔍', text: '正在理解你的问题…' },
  { icon: '🧠', text: '正在深度思考…' },
  { icon: '📝', text: '正在组织回答…' },
  { icon: '✨', text: '即将输出…' },
];

// ── ThinkingChain 组件 Props ────────────────────────────────────────────

interface ThinkingChainProps {
  visible: boolean; // 是否显示思考链（加载中为 true）
  mode?: 'chat' | 'image' | 'video'; // 聊天模式（决定 AI 头像颜色）
}

// ── ThinkingChain 组件 ──────────────────────────────────────────────────

export const ThinkingChain: React.FC<ThinkingChainProps> = ({ visible, mode = 'chat' }) => {
  // 当前思考步骤索引（0-3）
  const [stepIdx, setStepIdx] = useState(0);

  // 每 1200ms 推进一步，直到最后一步停止
  useEffect(() => {
    // 如果不可见，重置步骤索引
    if (!visible) {
      setStepIdx(0);
      return;
    }

    // 定时器：每 1200ms 推进一步
    const timer = setInterval(() => {
      setStepIdx(idx => {
        // 到达最后一步时停止（不再增长）
        if (idx >= THINKING_STEPS.length - 1) {
          return idx;
        }
        return idx + 1;
      });
    }, 1200);

    // 清理定时器
    return () => clearInterval(timer);
  }, [visible]);

  // 如果不可见，不渲染
  if (!visible) {
    return null;
  }

  // 确定 AI 头像背景色（根据模式）
  const avatarBgColor = {
    chat: '#6366f1', // 对话模式：靛蓝
    image: '#ec4899', // 图像模式：粉色
    video: '#8b5cf6', // 视频模式：紫色
  }[mode] || '#6366f1';

  return (
    <div className="thinking-chain-bubble">
      {/* AI 头像 - 左侧 */}
      <div className="thinking-chain-avatar" style={{ backgroundColor: avatarBgColor }}>
        <RobotOutlined style={{ fontSize: '20px', color: 'white' }} />
      </div>

      {/* 思考步骤卡片 - 右侧 */}
      <div className="thinking-chain-content">
        {/* 已完成的步骤 */}
        {THINKING_STEPS.slice(0, stepIdx).map((step, idx) => (
          <div key={idx} className="thinking-step completed">
            {/* 完成标记 */}
            <div className="step-icon">
              <CheckCircleOutlined style={{ color: '#10b981' }} /> {/* 绿色对勾 */}
            </div>
            {/* 步骤文本 */}
            <span className="step-text">{step.text}</span>
          </div>
        ))}

        {/* 当前步骤（进行中） */}
        {stepIdx < THINKING_STEPS.length && (
          <div className="thinking-step current">
            {/* 旋转加载图标 */}
            <div className="step-icon spinning">
              <LoadingOutlined style={{ color: avatarBgColor, fontSize: '16px' }} />
            </div>
            {/* 步骤文本 + 脉冲动画 */}
            <span className="step-text pulsing">{THINKING_STEPS[stepIdx].text}</span>
          </div>
        )}

        {/* 进度条 - 底部细线 */}
        <div className="thinking-progress-bar">
          <div
            className="thinking-progress-fill"
            style={{
              // 进度百分比：(当前步骤 + 0.5) / 总步骤数（末步时到 100%）
              width: `${((stepIdx + 0.5) / THINKING_STEPS.length) * 100}%`,
              backgroundColor: avatarBgColor,
            }}
          />
        </div>
      </div>
    </div>
  );
};

export default ThinkingChain;
