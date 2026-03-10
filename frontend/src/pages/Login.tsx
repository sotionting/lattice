import React, { useState } from 'react';
import { Form, Input, Button, message } from 'antd';
import { UserOutlined, LockOutlined, RobotOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/store';

// 登录页面：全屏渐变背景 + 居中卡片，简洁现代风格
const Login: React.FC = () => {
  const navigate = useNavigate();
  const login = useAuthStore((s) => s.login); // 从全局状态获取 login 方法
  const [loading, setLoading] = useState(false); // 控制按钮 loading 状态

  // 表单提交：调用 login 方法，成功后跳转到首页
  const onFinish = async (values: { username: string; password: string }) => {
    setLoading(true);
    try {
      await login(values);
      message.success('登录成功');
      navigate('/');
    } catch (err: unknown) {
      message.error(err instanceof Error ? err.message : '用户名或密码错误');
    } finally {
      setLoading(false);
    }
  };

  return (
    // 外层容器：全屏高度，渐变背景，内容水平垂直居中
    <div style={{
      height: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)',
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* 背景装饰圆圈（纯 CSS 制造层次感） */}
      <div style={{
        position: 'absolute', top: -100, right: -100,
        width: 400, height: 400, borderRadius: '50%',
        background: 'rgba(22, 119, 255, 0.08)',
        pointerEvents: 'none',
      }} />
      <div style={{
        position: 'absolute', bottom: -150, left: -150,
        width: 500, height: 500, borderRadius: '50%',
        background: 'rgba(82, 196, 26, 0.05)',
        pointerEvents: 'none',
      }} />

      {/* 登录卡片 */}
      <div style={{
        width: 420,
        background: 'rgba(255,255,255,0.97)',
        borderRadius: 16,
        padding: '48px 40px 40px',
        boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
        position: 'relative',
        zIndex: 1,
      }}>
        {/* Logo 区域：机器人图标 + 标题 */}
        <div style={{ textAlign: 'center', marginBottom: 36 }}>
          <div style={{
            width: 64, height: 64, borderRadius: 16,
            background: 'linear-gradient(135deg, #1677ff 0%, #0958d9 100%)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 16px',
            boxShadow: '0 8px 24px rgba(22, 119, 255, 0.35)',
          }}>
            {/* 机器人图标，代表 AI Agent */}
            <RobotOutlined style={{ fontSize: 32, color: '#fff' }} />
          </div>
          <h1 style={{ fontSize: 24, fontWeight: 700, margin: '0 0 6px', color: '#1a1a2e' }}>
            AI Agent 对话平台
          </h1>
          <p style={{ color: '#8c8c8c', margin: 0, fontSize: 14 }}>
            登录后开始与 AI Agent 对话
          </p>
        </div>

        {/* 登录表单 */}
        <Form onFinish={onFinish} size="large" autoComplete="off">
          <Form.Item name="username" rules={[{ required: true, message: '请输入用户名' }]}>
            <Input
              prefix={<UserOutlined style={{ color: '#bfbfbf' }} />}
              placeholder="用户名"
              style={{ borderRadius: 8 }}
            />
          </Form.Item>
          <Form.Item name="password" rules={[{ required: true, message: '请输入密码' }]}>
            <Input.Password
              prefix={<LockOutlined style={{ color: '#bfbfbf' }} />}
              placeholder="密码"
              style={{ borderRadius: 8 }}
            />
          </Form.Item>
          <Form.Item style={{ marginBottom: 0 }}>
            <Button
              type="primary"
              htmlType="submit"
              block
              loading={loading}
              style={{
                height: 46, borderRadius: 8, fontSize: 16, fontWeight: 500,
                background: 'linear-gradient(90deg, #1677ff 0%, #0958d9 100%)',
                border: 'none',
              }}
            >
              {loading ? '登录中...' : '登 录'}
            </Button>
          </Form.Item>
        </Form>

        {/* 底部提示 */}
        <div style={{ textAlign: 'center', marginTop: 20, color: '#bfbfbf', fontSize: 12 }}>
          默认管理员账号：admin / admin123456
        </div>
      </div>
    </div>
  );
};

export default Login;
