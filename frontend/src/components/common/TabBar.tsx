import React, { useRef, useEffect, useState } from 'react'; // React hooks
import { CloseOutlined, PlusOutlined } from '@ant-design/icons'; // Ant Design 图标：关闭和新增
import './TabBar.css'; // 标签栏样式（单独的 CSS 文件）

// ── TabBar 组件 Props 接口 ────────────────────────────────────────────────

interface Tab {
  id: string; // tab 唯一 ID
  title: string; // 显示的标题
}

interface TabBarProps {
  tabs: Tab[]; // tabs 数组
  activeTabId: string | null; // 当前活跃 tab 的 ID
  onTabClick: (tabId: string) => void; // 点击 tab 时的回调
  onTabClose: (tabId: string) => void; // 关闭 tab 时的回调
  onNewTab: () => void; // 点击"新建"按钮时的回调
}

// ── TabBar 组件 ────────────────────────────────────────────────────────────

export const TabBar: React.FC<TabBarProps> = ({ tabs, activeTabId, onTabClick, onTabClose, onNewTab }) => {
  // 用于自动滚动到活跃 tab（使用 ref 定位对应 DOM 元素）
  const containerRef = useRef<HTMLDivElement>(null);
  const activeTabRef = useRef<HTMLDivElement>(null);

  // 当活跃 tab 变化时，自动滚动使其可见
  useEffect(() => {
    // 等待 DOM 更新后再滚动
    setTimeout(() => {
      if (activeTabRef.current && containerRef.current) {
        // 获取活跃 tab 和容器的位置
        const activeRect = activeTabRef.current.getBoundingClientRect();
        const containerRect = containerRef.current.getBoundingClientRect();

        // 如果活跃 tab 在容器左边界外，向左滚动使其可见
        if (activeRect.left < containerRect.left) {
          containerRef.current.scrollLeft -= containerRect.left - activeRect.left + 10; // 10px 缓冲
        }

        // 如果活跃 tab 在容器右边界外，向右滚动使其可见
        if (activeRect.right > containerRect.right) {
          containerRef.current.scrollLeft += activeRect.right - containerRect.right + 10;
        }
      }
    }, 0);
  }, [activeTabId]);

  return (
    <div className="tab-bar">
      {/* 标签容器 - 水平滚动，所有标签在这里显示 */}
      <div className="tab-bar-container" ref={containerRef}>
        {tabs.map(tab => (
          <div
            key={tab.id}
            ref={tab.id === activeTabId ? activeTabRef : null} // 如果是活跃 tab，绑定 ref 用于自动滚动
            className={`tab ${tab.id === activeTabId ? 'active' : ''}`} // active 类名控制样式
            onClick={() => onTabClick(tab.id)} // 点击 tab 切换
          >
            {/* Tab 标题 - 超长时省略号 */}
            <span className="tab-title">{tab.title}</span>

            {/* 关闭按钮 - × 号，hover 时显示 */}
            <button
              className="tab-close"
              onClick={e => {
                // 阻止事件冒泡（否则点击关闭也会触发 onClick 切换 tab）
                e.stopPropagation();
                // 调用关闭回调
                onTabClose(tab.id);
              }}
              aria-label="关闭标签" // 无障碍标签
            >
              <CloseOutlined style={{ fontSize: '11px' }} />
            </button>
          </div>
        ))}
      </div>

      {/* 新建 Tab 按钮 - 固定在右侧 */}
      <button className="tab-new" onClick={onNewTab} aria-label="新建标签">
        <PlusOutlined style={{ fontSize: '14px' }} />
      </button>
    </div>
  );
};

export default TabBar;
