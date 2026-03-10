import React, { useEffect } from 'react';
import { RouterProvider } from 'react-router-dom';
import { ConfigProvider, Spin } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import router from '@/router';
import { useAuthStore } from '@/store';

const App: React.FC = () => {
  const init = useAuthStore((s) => s.init);
  const initialized = useAuthStore((s) => s.initialized); // ← 获取初始化状态

  useEffect(() => {
    init();
  }, [init]);

  // 在初始化完成前显示加载状态，防止路由错误重定向
  if (!initialized) {
    return (
      <ConfigProvider locale={zhCN}>
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          height: '100vh',
          background: '#f5f5f5',
        }}>
          <Spin size="large" tip="加载中..." />
        </div>
      </ConfigProvider>
    );
  }

  return (
    <ConfigProvider
      locale={zhCN}
      theme={{
        token: {
          colorPrimary: '#6366f1',
          borderRadius: 10,
          fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
        },
      }}
    >
      <RouterProvider router={router} />
    </ConfigProvider>
  );
};

export default App;
