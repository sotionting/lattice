import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Layout, Menu } from 'antd';
import {
  MessageOutlined,
  HistoryOutlined,
  FolderOutlined,
  ThunderboltOutlined,
  TeamOutlined,
  ApiOutlined,
  ToolOutlined,
  ClusterOutlined,
  BarChartOutlined,
  RobotOutlined,
} from '@ant-design/icons';
import { useUIStore } from '@/store';
import { useAuthStore } from '@/store/authStore';

const { Sider } = Layout;

const userMenuItems = [
  { key: '/',              icon: <MessageOutlined />,     label: '对话' },
  { key: '/conversations', icon: <HistoryOutlined />,     label: '对话历史' },
  { key: '/agent',         icon: <RobotOutlined />,       label: 'AI Agent' },
  { key: '/resources',     icon: <FolderOutlined />,      label: '资源库' },
  { key: '/tasks',         icon: <ThunderboltOutlined />, label: '任务状态' },
];

const adminMenuItems = [
  { key: '/admin/users',  icon: <TeamOutlined />,     label: '用户管理' },
  { key: '/admin/models', icon: <ApiOutlined />,      label: '模型管理' },
  { key: '/admin/skills', icon: <ToolOutlined />,     label: 'Skill 管理' },
  { key: '/admin/mcp',    icon: <ClusterOutlined />,  label: 'MCP 管理' },
  { key: '/admin/quota',  icon: <BarChartOutlined />, label: '额度管理' },
];

const Sidebar: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const collapsed = useUIStore((s) => s.sidebarCollapsed);
  const user = useAuthStore((s) => s.user);
  const isAdmin = user?.role === 'admin';

  const allItems = isAdmin
    ? [
        { type: 'group' as const, label: '功能', children: userMenuItems },
        { type: 'group' as const, label: '管理', children: adminMenuItems },
      ]
    : userMenuItems;

  const selectedKey =
    location.pathname === '/'
      ? '/'
      : [...userMenuItems, ...adminMenuItems]
          .filter((item) => location.pathname.startsWith(item.key) && item.key !== '/')
          .sort((a, b) => b.key.length - a.key.length)[0]?.key || '/';

  return (
    <Sider
      trigger={null}
      collapsible
      collapsed={collapsed}
      width={220}
      collapsedWidth={72}
      style={{
        height: '100vh',
        position: 'fixed',
        left: 0, top: 0, bottom: 0,
        zIndex: 100,
        background: 'rgba(13, 17, 38, 0.80)',
        backdropFilter: 'blur(24px)',
        WebkitBackdropFilter: 'blur(24px)',
        borderRight: '1px solid rgba(255,255,255,0.08)',
        boxShadow: '2px 0 24px rgba(0,0,0,0.18)',
      }}
    >
      {/* Logo */}
      <div
        style={{
          height: 64,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: collapsed ? 0 : 10,
          padding: '0 16px',
          borderBottom: '1px solid rgba(255,255,255,0.07)',
          cursor: 'pointer',
          transition: 'all 0.2s',
        }}
        onClick={() => navigate('/')}
      >
        {/* Icon with glowing gradient */}
        <div style={{
          width: 36, height: 36, borderRadius: 11, flexShrink: 0,
          background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 4px 16px rgba(99,102,241,0.50)',
        }}>
          <RobotOutlined style={{ color: '#fff', fontSize: 18 }} />
        </div>
        {!collapsed && (
          <span style={{
            color: '#f1f5f9', fontWeight: 700, fontSize: 15,
            letterSpacing: 0.3, whiteSpace: 'nowrap',
          }}>
            AI Agent
          </span>
        )}
      </div>

      {/* Navigation */}
      <Menu
        theme="dark"
        mode="inline"
        selectedKeys={[selectedKey]}
        items={allItems}
        onClick={({ key }) => navigate(key)}
        style={{
          background: 'transparent',
          border: 'none',
          marginTop: 8,
        }}
      />

      {/* Version tag */}
      {!collapsed && (
        <div style={{
          position: 'absolute', bottom: 16, left: 0, right: 0,
          textAlign: 'center',
          color: 'rgba(255,255,255,0.18)',
          fontSize: 11,
          letterSpacing: 0.5,
        }}>
          v1.0.0
        </div>
      )}
    </Sider>
  );
};

export default Sidebar;
