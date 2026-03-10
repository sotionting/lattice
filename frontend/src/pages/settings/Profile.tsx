import React from 'react';
import {
  Card, Form, Input, Button, message, Avatar, Tag, Descriptions, Divider,
} from 'antd';
import { UserOutlined, LockOutlined, MailOutlined, SafetyCertificateOutlined } from '@ant-design/icons';
import { useAuthStore } from '@/store';
import { authService } from '@/services/auth';

// 个人设置页：展示用户基本信息 + 修改密码功能
const Profile: React.FC = () => {
  const user = useAuthStore((s) => s.user); // 获取当前登录用户信息
  const [passwordForm] = Form.useForm();

  // 修改密码：调用 authService，成功后清空表单
  const handleChangePassword = async (values: { old_password: string; new_password: string }) => {
    try {
      await authService.changePassword(values);
      message.success('密码修改成功');
      passwordForm.resetFields(); // 清空表单，避免旧密码留存
    } catch (err: unknown) {
      message.error(err instanceof Error ? err.message : '修改失败，请检查旧密码是否正确');
    }
  };

  return (
    <div style={{ maxWidth: 700 }}>
      {/* 用户信息卡片 */}
      <Card
        style={{ borderRadius: 12, marginBottom: 20, border: '1px solid #f0f0f0' }}
        bodyStyle={{ padding: '24px 28px' }}
      >
        {/* 头部：大头像 + 用户名 + 角色标签 */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 20, marginBottom: 24 }}>
          {/* 头像：显示用户名首字母，蓝色渐变背景 */}
          <Avatar
            size={72}
            style={{
              background: 'linear-gradient(135deg, #1677ff, #0958d9)',
              fontSize: 28, fontWeight: 700, flexShrink: 0,
            }}
          >
            {user?.username?.charAt(0).toUpperCase() || <UserOutlined />}
          </Avatar>
          <div>
            <div style={{ fontSize: 20, fontWeight: 600, marginBottom: 6 }}>
              {user?.username || '未知用户'}
            </div>
            {/* 角色标签：管理员蓝色，普通用户默认色 */}
            <Tag
              color={user?.role === 'admin' ? 'blue' : 'default'}
              icon={<SafetyCertificateOutlined />}
              style={{ fontSize: 13 }}
            >
              {user?.role === 'admin' ? '管理员' : '普通用户'}
            </Tag>
          </div>
        </div>

        <Divider style={{ margin: '0 0 20px' }} />

        {/* 用户详细信息展示（只读，使用 Descriptions 组件） */}
        <Descriptions column={1} labelStyle={{ color: '#8c8c8c', width: 90 }}>
          <Descriptions.Item
            label={<span><UserOutlined style={{ marginRight: 6 }} />用户名</span>}
          >
            <span style={{ fontWeight: 500 }}>{user?.username || '-'}</span>
          </Descriptions.Item>
          <Descriptions.Item
            label={<span><MailOutlined style={{ marginRight: 6 }} />邮箱</span>}
          >
            {user?.email || <span style={{ color: '#bfbfbf' }}>未设置</span>}
          </Descriptions.Item>
          <Descriptions.Item
            label={<span><SafetyCertificateOutlined style={{ marginRight: 6 }} />角色</span>}
          >
            {user?.role === 'admin' ? '管理员' : '普通用户'}
          </Descriptions.Item>
        </Descriptions>
      </Card>

      {/* 修改密码卡片 */}
      <Card
        title={
          // 卡片标题：图标 + 文字
          <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <LockOutlined style={{ color: '#1677ff' }} />
            修改密码
          </span>
        }
        style={{ borderRadius: 12, border: '1px solid #f0f0f0' }}
        bodyStyle={{ padding: '24px 28px' }}
      >
        <Form
          form={passwordForm}
          layout="vertical"
          onFinish={handleChangePassword}
          style={{ maxWidth: 380 }}
        >
          {/* 旧密码输入 */}
          <Form.Item
            name="old_password"
            label="当前密码"
            rules={[{ required: true, message: '请输入当前密码' }]}
          >
            <Input.Password
              prefix={<LockOutlined style={{ color: '#bfbfbf' }} />}
              placeholder="请输入当前密码"
              style={{ borderRadius: 8 }}
            />
          </Form.Item>

          {/* 新密码输入 */}
          <Form.Item
            name="new_password"
            label="新密码"
            rules={[
              { required: true, message: '请输入新密码' },
              { min: 6, message: '密码至少 6 位' },
            ]}
          >
            <Input.Password
              prefix={<LockOutlined style={{ color: '#bfbfbf' }} />}
              placeholder="至少 6 位字符"
              style={{ borderRadius: 8 }}
            />
          </Form.Item>

          {/* 确认新密码：使用自定义验证器校验两次输入一致 */}
          <Form.Item
            name="confirm_password"
            label="确认新密码"
            dependencies={['new_password']} // 依赖 new_password，当其变化时重新验证
            rules={[
              { required: true, message: '请再次输入新密码' },
              ({ getFieldValue }) => ({
                validator(_, value) {
                  // 比较两次密码是否一致
                  if (!value || getFieldValue('new_password') === value) {
                    return Promise.resolve();
                  }
                  return Promise.reject(new Error('两次输入的密码不一致'));
                },
              }),
            ]}
          >
            <Input.Password
              prefix={<LockOutlined style={{ color: '#bfbfbf' }} />}
              placeholder="再次输入新密码"
              style={{ borderRadius: 8 }}
            />
          </Form.Item>

          <Form.Item style={{ marginBottom: 0 }}>
            <Button
              type="primary"
              htmlType="submit"
              style={{ borderRadius: 8, paddingLeft: 24, paddingRight: 24 }}
            >
              确认修改
            </Button>
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
};

export default Profile;
