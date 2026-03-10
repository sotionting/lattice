import React from 'react';
import { Layout, Button, Dropdown, Avatar, Space, Typography } from 'antd';
import {
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  UserOutlined,
  LogoutOutlined,
  SettingOutlined,
  BellOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useAuthStore, useUIStore } from '@/store';

const { Header: AntHeader } = Layout;
const { Text } = Typography;

const Header: React.FC = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();
  const { sidebarCollapsed, toggleSidebar } = useUIStore();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <AntHeader style={{
      height: 60,
      padding: '0 20px',
      background: 'rgba(255, 255, 255, 0.72)',
      backdropFilter: 'blur(24px)',
      WebkitBackdropFilter: 'blur(24px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      borderBottom: '1px solid rgba(255,255,255,0.55)',
      boxShadow: '0 1px 20px rgba(99,102,241,0.07)',
      position: 'sticky',
      top: 0,
      zIndex: 99,
    }}>
      {/* Sidebar toggle */}
      <Button
        type="text"
        icon={sidebarCollapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
        onClick={toggleSidebar}
        style={{
          fontSize: 17, width: 40, height: 40,
          color: '#64748b', borderRadius: 10,
        }}
      />

      <Space size={4}>
        {/* Notification bell */}
        <Button
          type="text"
          icon={<BellOutlined style={{ fontSize: 16 }} />}
          style={{ width: 40, height: 40, color: '#64748b', borderRadius: 10 }}
        />

        {/* User dropdown */}
        <Dropdown
          menu={{
            items: [
              {
                key: 'userinfo',
                label: (
                  <div style={{ padding: '4px 0' }}>
                    <div style={{ fontWeight: 600, color: '#1e293b' }}>{user?.username}</div>
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      {user?.role === 'admin' ? '管理员' : '普通用户'}
                    </Text>
                  </div>
                ),
                disabled: true,
              },
              { type: 'divider' },
              {
                key: 'profile',
                icon: <SettingOutlined />,
                label: '个人设置',
                onClick: () => navigate('/settings/profile'),
              },
              { type: 'divider' },
              {
                key: 'logout',
                icon: <LogoutOutlined />,
                label: '退出登录',
                danger: true,
                onClick: handleLogout,
              },
            ],
          }}
          trigger={['click']}
          placement="bottomRight"
        >
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8,
            cursor: 'pointer', padding: '5px 10px', borderRadius: 10,
            transition: 'background 0.15s',
          }}
            onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(99,102,241,0.07)')}
            onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
          >
            <Avatar
              size={32}
              style={{
                background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                fontSize: 13, fontWeight: 600,
                boxShadow: '0 2px 8px rgba(99,102,241,0.35)',
              }}
            >
              {user?.username?.charAt(0).toUpperCase() || <UserOutlined />}
            </Avatar>
            <span style={{ fontSize: 14, fontWeight: 500, color: '#1e293b' }}>
              {user?.username || '用户'}
            </span>
          </div>
        </Dropdown>
      </Space>
    </AntHeader>
  );
};

export default Header;
