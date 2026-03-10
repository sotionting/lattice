import React from 'react';
import { Outlet, Navigate, useLocation } from 'react-router-dom'; // 新增 useLocation
import { Layout } from 'antd';
import Sidebar from './Sidebar';
import Header from './Header';
import { useAuthStore, useUIStore } from '@/store';

const { Content } = Layout;

// 整体布局：固定侧边栏 + 右侧动态内容区（Header + Content）
const AppLayout: React.FC = () => {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated); // 是否已登录
  const collapsed = useUIStore((s) => s.sidebarCollapsed);        // 侧边栏是否折叠
  const location = useLocation();                                  // 获取当前路由

  // 未登录时重定向到登录页
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // 判断当前路由是否有 TabBar（这些路由页面自管布局，不需要外层 padding）
  const noOuterPadding = ['/', '/generate'].includes(location.pathname);

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
          padding: noOuterPadding ? 0 : 20, // TabBar 页面无 padding，其他页面 20px
          height: 'calc(100vh - 64px)',
          overflowY: noOuterPadding ? 'hidden' : 'auto', // TabBar 页面不自动滚动（由页面内部管理）
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
