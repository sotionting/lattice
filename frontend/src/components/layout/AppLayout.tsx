import React from 'react';
import { Outlet, Navigate } from 'react-router-dom';
import { Layout } from 'antd';
import Sidebar from './Sidebar';
import Header from './Header';
import { useAuthStore, useUIStore } from '@/store';

const { Content } = Layout;

// 整体布局：固定侧边栏 + 右侧动态内容区（Header + Content）
const AppLayout: React.FC = () => {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated); // 是否已登录
  const collapsed = useUIStore((s) => s.sidebarCollapsed);        // 侧边栏是否折叠

  // 未登录时重定向到登录页
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return (
    <Layout style={{ minHeight: '100vh' }}>
      {/* 固定定位的侧边栏（宽度 220px，折叠后 72px） */}
      <Sidebar />
      {/* 右侧主内容区：marginLeft 随侧边栏状态动态变化 */}
      <Layout style={{
        marginLeft: collapsed ? 72 : 220,
        transition: 'margin-left 0.2s', // 与 Sider 折叠动画同步
      }}>
        {/* 顶部导航栏 */}
        <Header />
        {/* 页面内容区：高度 = 视口高度 - Header 64px */}
        <Content style={{
          padding: 20,
          height: 'calc(100vh - 64px)',
          overflowY: 'auto',
          background: 'transparent',
          display: 'flex',
          flexDirection: 'column',
        }}>
          {/* Outlet 渲染当前路由对应的页面组件 */}
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  );
};

export default AppLayout;
