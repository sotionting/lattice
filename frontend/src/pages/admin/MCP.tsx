import React, { useState, useEffect } from 'react';
import {
  Table, Button, Tag, Space, Modal, Form, Input, Switch,
  message, Popconfirm, Typography, Tooltip, Badge, Spin,
} from 'antd';
import {
  PlusOutlined, EditOutlined, DeleteOutlined, ClusterOutlined,
  LinkOutlined, ReloadOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { mcpService, MCPServerItem } from '../../services/mcp';

const { Text } = Typography;

const statusConfig: Record<MCPServerItem['status'], { badge: 'success' | 'error' | 'default'; label: string }> = {
  online:  { badge: 'success', label: '在线' },
  offline: { badge: 'error',   label: '离线' },
  unknown: { badge: 'default', label: '未知' },
};

const MCP: React.FC = () => {
  const [servers, setServers] = useState<MCPServerItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [testing, setTesting] = useState<string | null>(null); // 正在测试的服务器 ID
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editItem, setEditItem] = useState<MCPServerItem | null>(null);
  const [form] = Form.useForm();

  const load = async () => {
    setLoading(true);
    try {
      const res = await mcpService.list();
      setServers(res.data?.items ?? []);
    } catch {
      message.error('加载 MCP 服务器列表失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const openCreate = () => {
    setEditItem(null);
    form.resetFields();
    form.setFieldsValue({ is_active: true });
    setModalOpen(true);
  };

  const openEdit = (item: MCPServerItem) => {
    setEditItem(item);
    form.setFieldsValue({ name: item.name, url: item.url, description: item.description, is_active: item.is_active });
    setModalOpen(true);
  };

  const handleSubmit = async () => {
    let values: Record<string, unknown>;
    try { values = await form.validateFields(); } catch { return; }

    setSaving(true);
    try {
      if (editItem) {
        await mcpService.update(editItem.id, values as Parameters<typeof mcpService.update>[1]);
        message.success('MCP 服务器已更新');
      } else {
        await mcpService.create(values as Parameters<typeof mcpService.create>[0]);
        message.success('MCP 服务器已添加');
      }
      setModalOpen(false);
      load();
    } catch { message.error('保存失败'); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id: string) => {
    try { await mcpService.delete(id); message.success('已删除'); load(); }
    catch { message.error('删除失败'); }
  };

  const handleToggle = async (item: MCPServerItem, active: boolean) => {
    try {
      await mcpService.update(item.id, { is_active: active });
      setServers(prev => prev.map(s => s.id === item.id ? { ...s, is_active: active } : s));
    } catch { message.error('更新失败'); }
  };

  // 调用后端真实 HTTP 探测，更新 status
  const handleTest = async (item: MCPServerItem) => {
    setTesting(item.id);
    message.loading({ content: `正在测试 ${item.name} 连接...`, key: item.id, duration: 0 });
    try {
      const res = await mcpService.testConnection(item.id);
      const { connected, status } = res.data;
      setServers(prev => prev.map(s => s.id === item.id ? { ...s, status } : s));
      message.destroy(item.id);
      if (connected) message.success(`${item.name} 连接成功`);
      else message.error(`${item.name} 连接失败`);
    } catch {
      message.destroy(item.id);
      message.error('测试请求失败');
    } finally {
      setTesting(null);
    }
  };

  const columns: ColumnsType<MCPServerItem> = [
    {
      title: '服务器名称', dataIndex: 'name', key: 'name',
      render: (name: string, record) => (
        <div>
          <div style={{ fontWeight: 500, marginBottom: 2 }}>{name}</div>
          <Text type="secondary" style={{ fontSize: 12 }}>
            <LinkOutlined style={{ marginRight: 4 }} />{record.url}
          </Text>
        </div>
      ),
    },
    {
      title: '功能描述', dataIndex: 'description', key: 'description',
      render: (v: string) => <Tooltip title={v}><Text ellipsis style={{ maxWidth: 280 }}>{v || '—'}</Text></Tooltip>,
    },
    {
      title: '工具数', dataIndex: 'tool_count', key: 'tool_count', width: 90,
      render: (v: number) => <Tag color="blue">{v} 个工具</Tag>,
    },
    {
      title: '连接状态', dataIndex: 'status', key: 'status', width: 100,
      render: (status: MCPServerItem['status']) => {
        const cfg = statusConfig[status];
        return <Badge status={cfg.badge} text={cfg.label} />;
      },
    },
    {
      title: '启用', key: 'is_active', width: 80,
      render: (_, record) => (
        <Switch checked={record.is_active} onChange={v => handleToggle(record, v)} size="small" />
      ),
    },
    {
      title: '操作', key: 'action', width: 130,
      render: (_, record) => (
        <Space>
          <Tooltip title="测试连接">
            <Button size="small" icon={<ReloadOutlined />} loading={testing === record.id}
              onClick={() => handleTest(record)} />
          </Tooltip>
          <Tooltip title="编辑">
            <Button size="small" icon={<EditOutlined />} onClick={() => openEdit(record)} />
          </Tooltip>
          <Popconfirm title="确认删除？" onConfirm={() => handleDelete(record.id)} okText="删除" cancelText="取消">
            <Tooltip title="删除">
              <Button size="small" danger icon={<DeleteOutlined />} />
            </Tooltip>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 600 }}>MCP 服务器管理</h2>
          <Text type="secondary" style={{ fontSize: 13 }}>
            配置 Model Context Protocol 服务器，扩展 Agent 工具调用能力（SSE 协议）
          </Text>
        </div>
        <Button type="primary" icon={<PlusOutlined />} onClick={openCreate} style={{ borderRadius: 8 }}>
          添加服务器
        </Button>
      </div>

      <div style={{ background: '#fff', borderRadius: 12, boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
        <Spin spinning={loading}>
          <Table rowKey="id" columns={columns} dataSource={servers}
            pagination={false}
            locale={{ emptyText: '暂无 MCP 服务器配置，点击「添加服务器」开始配置' }} />
        </Spin>
      </div>

      <Modal
        title={<Space><ClusterOutlined style={{ color: '#1677ff' }} />{editItem ? '编辑 MCP 服务器' : '添加 MCP 服务器'}</Space>}
        open={modalOpen} onOk={handleSubmit} onCancel={() => setModalOpen(false)}
        okText="保存" cancelText="取消" confirmLoading={saving} width={480}
      >
        <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item name="name" label="服务器名称" rules={[{ required: true }]}>
            <Input placeholder="如：Filesystem MCP" style={{ borderRadius: 8 }} />
          </Form.Item>
          <Form.Item name="url" label="SSE 连接地址"
            rules={[{ required: true }, { type: 'url', message: '请输入有效的 URL' }]}
          >
            <Input placeholder="http://localhost:3100/sse" style={{ borderRadius: 8 }} />
          </Form.Item>
          <Form.Item name="description" label="功能描述">
            <Input.TextArea rows={2} placeholder="描述该服务器提供的工具能力..." style={{ borderRadius: 8 }} />
          </Form.Item>
          <Form.Item name="is_active" label="启用" valuePropName="checked">
            <Switch />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default MCP;
