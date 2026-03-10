import React, { useState, useEffect } from 'react';
import {
  Table, Button, Tag, Space, Modal, Form, Input, Switch,
  message, Popconfirm, Typography, Tooltip, Select, Spin,
} from 'antd';
import {
  PlusOutlined, EditOutlined, DeleteOutlined, ToolOutlined,
  CodeOutlined, GlobalOutlined, RobotOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { skillsService, SkillItem } from '../../services/skills';

const { Text } = Typography;

const typeConfig: Record<string, { icon: React.ReactNode; color: string; label: string }> = {
  api:    { icon: <GlobalOutlined />, color: 'cyan',   label: 'API 调用' },
  code:   { icon: <CodeOutlined />,  color: 'blue',   label: '代码执行' },
  prompt: { icon: <RobotOutlined />, color: 'purple', label: '提示词' },
};

const DEFAULT_CONFIGS: Record<string, string> = {
  api: JSON.stringify({ method: 'POST', url: 'https://api.example.com/endpoint', headers: {}, body_template: '{"input": "{{input}}"}' }, null, 2),
  code: '{"code": "def run(input: str) -> str:\\n    # 在这里编写处理逻辑\\n    return input.upper()"}',
  prompt: JSON.stringify({ system_prompt: '你是一个专业的翻译助手，请将用户的输入翻译成英文。' }, null, 2),
};

const Skills: React.FC = () => {
  const [skills, setSkills] = useState<SkillItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editItem, setEditItem] = useState<SkillItem | null>(null);
  const [selectedType, setSelectedType] = useState<string>('api');
  const [form] = Form.useForm();

  const load = async () => {
    setLoading(true);
    try {
      const res = await skillsService.list();
      setSkills(res.data?.items ?? []);
    } catch {
      message.error('加载 Skill 列表失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const openCreate = () => {
    setEditItem(null);
    setSelectedType('api');
    form.resetFields();
    form.setFieldsValue({ skill_type: 'api', is_active: true, config: DEFAULT_CONFIGS.api });
    setModalOpen(true);
  };

  const openEdit = (item: SkillItem) => {
    setEditItem(item);
    setSelectedType(item.skill_type);
    form.setFieldsValue({
      name: item.name,
      description: item.description,
      skill_type: item.skill_type,
      config: JSON.stringify(item.config, null, 2),
      is_active: item.is_active,
    });
    setModalOpen(true);
  };

  const handleTypeChange = (val: string) => {
    setSelectedType(val);
    form.setFieldValue('config', DEFAULT_CONFIGS[val] ?? '{}');
  };

  const handleSubmit = async () => {
    let values: Record<string, unknown>;
    try { values = await form.validateFields(); } catch { return; }

    let parsedConfig: Record<string, unknown> = {};
    try { parsedConfig = JSON.parse(values.config as string); } catch {
      message.error('配置参数不是合法的 JSON 格式');
      return;
    }

    setSaving(true);
    try {
      const payload = { ...values, config: parsedConfig };
      if (editItem) {
        await skillsService.update(editItem.id, payload as Parameters<typeof skillsService.update>[1]);
        message.success('Skill 已更新');
      } else {
        await skillsService.create(payload as Parameters<typeof skillsService.create>[0]);
        message.success('Skill 已创建');
      }
      setModalOpen(false);
      load();
    } catch { message.error('保存失败'); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id: string) => {
    try { await skillsService.delete(id); message.success('已删除'); load(); }
    catch { message.error('删除失败'); }
  };

  const handleToggle = async (item: SkillItem, active: boolean) => {
    try {
      await skillsService.update(item.id, { is_active: active });
      setSkills(prev => prev.map(s => s.id === item.id ? { ...s, is_active: active } : s));
    } catch { message.error('更新失败'); }
  };

  const columns: ColumnsType<SkillItem> = [
    {
      title: 'Skill 名称', dataIndex: 'name', key: 'name',
      render: (name: string, record) => {
        const cfg = typeConfig[record.skill_type] || typeConfig.api;
        return <Space><span style={{ color: '#1677ff' }}>{cfg.icon}</span><Text strong>{name}</Text></Space>;
      },
    },
    {
      title: '类型', dataIndex: 'skill_type', key: 'skill_type', width: 110,
      render: (type: string) => {
        const cfg = typeConfig[type] || typeConfig.api;
        return <Tag color={cfg.color}>{cfg.label}</Tag>;
      },
    },
    {
      title: '描述（LLM 根据此描述决定何时调用）', dataIndex: 'description', key: 'description',
      render: (v: string) => <Tooltip title={v}><Text ellipsis style={{ maxWidth: 360 }}>{v}</Text></Tooltip>,
    },
    {
      title: '状态', key: 'is_active', width: 90,
      render: (_, record) => (
        <Switch checked={record.is_active} onChange={v => handleToggle(record, v)}
          size="small" checkedChildren="启用" unCheckedChildren="禁用" />
      ),
    },
    {
      title: '操作', key: 'action', width: 100,
      render: (_, record) => (
        <Space>
          <Tooltip title="编辑"><Button size="small" icon={<EditOutlined />} onClick={() => openEdit(record)} /></Tooltip>
          <Popconfirm title="确认删除此 Skill？" onConfirm={() => handleDelete(record.id)} okText="删除" cancelText="取消">
            <Tooltip title="删除"><Button size="small" danger icon={<DeleteOutlined />} /></Tooltip>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 600 }}>Skill 管理</h2>
          <Text type="secondary" style={{ fontSize: 13 }}>配置 Agent 可调用的能力插件（API 调用 / 代码执行 / 提示词）</Text>
        </div>
        <Button type="primary" icon={<PlusOutlined />} onClick={openCreate} style={{ borderRadius: 8 }}>添加 Skill</Button>
      </div>

      <div style={{ background: '#fff', borderRadius: 12, boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
        <Spin spinning={loading}>
          <Table rowKey="id" columns={columns} dataSource={skills}
            pagination={{ pageSize: 20, showSizeChanger: false }}
            locale={{ emptyText: '暂无 Skill，点击「添加 Skill」创建第一个' }} />
        </Spin>
      </div>

      <Modal
        title={<Space><ToolOutlined style={{ color: '#1677ff' }} />{editItem ? '编辑 Skill' : '添加 Skill'}</Space>}
        open={modalOpen} onOk={handleSubmit} onCancel={() => setModalOpen(false)}
        okText="保存" cancelText="取消" confirmLoading={saving} width={560}
      >
        <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item name="name" label="Skill 名称（唯一标识）" rules={[{ required: true }]}>
            <Input placeholder="如：translate_text、send_email" style={{ borderRadius: 8 }} />
          </Form.Item>
          <Form.Item name="skill_type" label="类型" rules={[{ required: true }]}>
            <Select onChange={handleTypeChange} options={[
              { value: 'api',    label: 'API 调用 — 调用外部 HTTP 接口' },
              { value: 'code',   label: '代码执行 — 运行预定义 Python 代码（需定义 run(input) 函数）' },
              { value: 'prompt', label: '提示词 — 以特定 system_prompt 调用 LLM' },
            ]} />
          </Form.Item>
          <Form.Item name="description" label="描述（重要：LLM 根据描述判断何时调用此 Skill）" rules={[{ required: true }]}>
            <Input.TextArea rows={2} placeholder="详细描述此 Skill 的能力和使用场景..." style={{ borderRadius: 8 }} />
          </Form.Item>
          <Form.Item name="config"
            label={selectedType === 'api' ? '配置（{{input}} 会替换为用户输入）' :
                   selectedType === 'code' ? '配置（在 run 函数中编写逻辑）' : '配置（system_prompt 字段）'}
            rules={[{ required: true }]}
          >
            <Input.TextArea rows={6} style={{ borderRadius: 8, fontFamily: 'monospace', fontSize: 12 }} />
          </Form.Item>
          <Form.Item name="is_active" label="启用" valuePropName="checked">
            <Switch />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default Skills;
