import React, { useState, useEffect } from 'react';
import {
  Table, Button, Tag, Space, Modal, Form, Input,
  Switch, Select, message, Popconfirm, Typography, Tooltip, Spin,
} from 'antd';
import {
  PlusOutlined, EditOutlined, DeleteOutlined, ApiOutlined,
  StarOutlined, StarFilled, EyeInvisibleOutlined, EyeOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { modelsService, type ModelConfig, type ModelConfigForm } from '@/services/models';

const { Text } = Typography;

// 提供商配置：颜色标签 + 中文名称 + 默认 Base URL + 模型示例
// 管理员选择提供商后，前端自动填入提示，后端按 provider 选择对应的默认 base_url
const PROVIDERS: {
  value: string;
  label: string;
  color: string;
  defaultBaseUrl: string;      // 该提供商的默认 base_url（留空时后端使用）
  modelHint: string;           // 模型 ID 输入框的提示文字
  baseUrlRequired: boolean;    // 是否必须填写 base_url（自定义提供商需要）
}[] = [
  {
    value: 'google',
    label: 'Google Gemini',
    color: '#1677ff',
    defaultBaseUrl: 'https://generativelanguage.googleapis.com/v1beta/openai',
    modelHint: 'gemini-2.0-flash / gemini-1.5-pro / gemini-1.5-flash',
    baseUrlRequired: false,
  },
  {
    value: 'openai',
    label: 'OpenAI',
    color: '#52c41a',
    defaultBaseUrl: 'https://api.openai.com/v1',
    modelHint: 'gpt-4o / gpt-4o-mini / gpt-4-turbo / o1-mini',
    baseUrlRequired: false,
  },
  {
    value: 'doubao',
    label: '字节跳动（豆包）',
    color: '#fa8c16',
    defaultBaseUrl: 'https://ark.cn-beijing.volces.com/api/v3',
    modelHint: '填写豆包 ARK 平台的接入点 ID（ep-xxxxxxxx）',
    baseUrlRequired: false,
  },
  {
    value: 'custom',
    label: '第三方（自定义）',
    color: '#722ed1',
    defaultBaseUrl: '',
    modelHint: '填写该接口要求的模型 ID（如 deepseek-chat）',
    baseUrlRequired: true,  // 自定义提供商必须填写 base_url
  },
];

// 按 value 快速索引提供商配置
const PROVIDER_MAP = Object.fromEntries(PROVIDERS.map((p) => [p.value, p]));

// 模型类型配置：分类标签颜色 + 中文名称
// llm=大语言模型（对话）、image=图片生成、video=视频生成
const MODEL_TYPES: { value: string; label: string; color: string }[] = [
  { value: 'llm',   label: '大语言模型', color: '#1677ff' },   // 蓝色：LLM 对话模型
  { value: 'image', label: '图片模型',   color: '#eb2f96' },   // 粉色：图片生成模型
  { value: 'video', label: '视频模型',   color: '#722ed1' },   // 紫色：视频生成模型
];

// 按 value 快速索引模型类型配置
const MODEL_TYPE_MAP = Object.fromEntries(MODEL_TYPES.map((t) => [t.value, t]));

const Models: React.FC = () => {
  const [models, setModels] = useState<ModelConfig[]>([]);   // 从后端加载的模型列表
  const [loading, setLoading] = useState(false);              // 列表加载状态
  const [modalOpen, setModalOpen] = useState(false);          // 新建/编辑弹窗
  const [saving, setSaving] = useState(false);                // 保存按钮加载状态
  const [editItem, setEditItem] = useState<ModelConfig | null>(null); // null=新建，有值=编辑
  const [showKey, setShowKey] = useState<Record<string, boolean>>({});  // 控制 Key 显示/隐藏
  const [selectedProvider, setSelectedProvider] = useState('google');  // 表单中当前选择的提供商
  const [form] = Form.useForm();

  // 组件挂载时拉取模型列表
  useEffect(() => { fetchModels(); }, []);

  /** 从后端拉取所有模型配置 */
  const fetchModels = async () => {
    setLoading(true);
    try {
      setModels(await modelsService.list());
    } catch (err: any) {
      message.error(err.message || '加载失败');
    } finally {
      setLoading(false);
    }
  };

  /** 打开新建弹窗，默认选 Google */
  const openCreate = () => {
    setEditItem(null);
    setSelectedProvider('google');  // 重置提供商选择
    form.resetFields();
    // 默认值：Google 提供商、大语言模型类型、启用、非默认
    form.setFieldsValue({ provider: 'google', model_type: 'llm', is_active: true, is_default: false });
    setModalOpen(true);
  };

  /** 打开编辑弹窗，回填数据（API Key 不回填） */
  const openEdit = (item: ModelConfig) => {
    setEditItem(item);
    setSelectedProvider(item.provider || 'custom');  // 同步提供商选择，用于动态显示 base_url
    form.setFieldsValue({
      name:        item.name,
      provider:    item.provider,
      model_id:    item.model_id,
      api_key:     '',                           // 安全起见不回填
      base_url:    item.base_url,
      model_type:  item.model_type || 'llm',    // 回填模型类型，默认 llm
      is_active:   item.is_active,
      is_default:  item.is_default,
    });
    setModalOpen(true);
  };

  /** 提交表单：新建或更新 */
  const handleSubmit = async () => {
    const values = await form.validateFields() as ModelConfigForm;
    setSaving(true);
    try {
      if (editItem) {
        // 编辑时：api_key 为空则不传，保留原有 Key
        const updateData: Partial<ModelConfigForm> = { ...values };
        if (!updateData.api_key) delete updateData.api_key;
        const updated = await modelsService.update(editItem.id, updateData);
        setModels((prev) => prev.map((m) => m.id === editItem.id ? updated : m));
        message.success('已更新');
      } else {
        const created = await modelsService.create(values);
        // 设为默认时需要重新拉列表（后端已清掉其他模型的 is_default）
        if (values.is_default) {
          await fetchModels();
        } else {
          setModels((prev) => [created, ...prev]);  // 新建的排在最前
        }
        message.success('已添加');
      }
      setModalOpen(false);
    } catch (err: any) {
      message.error(err.message || '保存失败');
    } finally {
      setSaving(false);
    }
  };

  /** 删除指定模型配置 */
  const handleDelete = async (id: string) => {
    try {
      await modelsService.delete(id);
      setModels((prev) => prev.filter((m) => m.id !== id));
      message.success('已删除');
    } catch (err: any) {
      message.error(err.message || '删除失败');
    }
  };

  /** 将某个模型设为默认（后端保证唯一性） */
  const handleSetDefault = async (id: string) => {
    try {
      await modelsService.setDefault(id);
      setModels((prev) => prev.map((m) => ({ ...m, is_default: m.id === id })));
      message.success('已设为默认');
    } catch (err: any) {
      message.error(err.message || '操作失败');
    }
  };

  /** 切换启用/禁用状态 */
  const handleToggleActive = async (id: string, active: boolean) => {
    try {
      await modelsService.update(id, { is_active: active });
      setModels((prev) => prev.map((m) => m.id === id ? { ...m, is_active: active } : m));
    } catch (err: any) {
      message.error(err.message || '操作失败');
    }
  };

  // 当前选中的提供商配置（用于动态显示模型 ID 提示和 base_url 字段）
  const currentProvider = PROVIDER_MAP[selectedProvider] ?? PROVIDER_MAP['custom'];

  // ── 表格列定义 ───────────────────────────────────────────────────────────────
  const columns: ColumnsType<ModelConfig> = [
    {
      title: '模型名称',
      dataIndex: 'name',
      render: (name: string, record) => (
        <Space>
          <span style={{ fontWeight: 500 }}>{name}</span>
          {record.is_default && <Tag color="gold">默认</Tag>}  {/* 默认模型加金色标签 */}
        </Space>
      ),
    },
    {
      title: '分类',
      dataIndex: 'model_type',
      render: (type: string) => {
        const cfg = MODEL_TYPE_MAP[type] ?? { color: 'default', label: type || 'llm' };
        return <Tag color={cfg.color}>{cfg.label}</Tag>;  // 按模型类型显示颜色分类标签
      },
    },
    {
      title: '提供商',
      dataIndex: 'provider',
      render: (provider: string) => {
        const cfg = PROVIDER_MAP[provider] ?? { color: 'default', label: provider };
        return <Tag color={cfg.color}>{cfg.label}</Tag>;  // 按提供商显示颜色标签
      },
    },
    {
      title: '模型 ID',
      dataIndex: 'model_id',
      render: (v: string) => <Text code>{v}</Text>,  // 代码样式更直观
    },
    {
      title: 'API Key',
      dataIndex: 'api_key',
      render: (key: string, record) => {
        if (!key) return <Text type="secondary">未填写</Text>;
        const visible = showKey[record.id];  // 是否显示明文
        return (
          <Space>
            <Text code>{visible ? key : '••••••••'}</Text>
            {/* 点击眼睛图标切换显示/隐藏 */}
            <Button
              type="text" size="small"
              icon={visible ? <EyeInvisibleOutlined /> : <EyeOutlined />}
              onClick={() => setShowKey((prev: Record<string, boolean>) => ({ ...prev, [record.id]: !prev[record.id] }))}
            />
          </Space>
        );
      },
    },
    {
      title: '状态',
      render: (_, record) => (
        // 开关直接触发后端更新，无需额外保存
        <Switch
          checked={record.is_active}
          onChange={(v) => handleToggleActive(record.id, v)}
          checkedChildren="启用" unCheckedChildren="禁用"
          size="small"
        />
      ),
    },
    {
      title: '操作',
      render: (_, record) => (
        <Space>
          {/* 设为默认：已是默认则显示实心星并禁用 */}
          <Tooltip title={record.is_default ? '当前默认' : '设为默认'}>
            <Button
              type="text" size="small"
              icon={record.is_default
                ? <StarFilled style={{ color: '#faad14' }} />
                : <StarOutlined />}
              onClick={() => !record.is_default && handleSetDefault(record.id)}
              disabled={record.is_default}
            />
          </Tooltip>
          <Tooltip title="编辑">
            <Button size="small" icon={<EditOutlined />} onClick={() => openEdit(record)} />
          </Tooltip>
          <Popconfirm
            title="确认删除？" description="删除后将无法使用此模型"
            onConfirm={() => handleDelete(record.id)}
            okText="删除" cancelText="取消"
          >
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
      {/* 页头 */}
      <div style={{
        display: 'flex', justifyContent: 'space-between',
        alignItems: 'center', marginBottom: 16,
      }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 600 }}>模型 API 管理</h2>
          <Text type="secondary" style={{ fontSize: 13 }}>
            支持 Google Gemini、OpenAI、字节豆包、第三方 OpenAI 兼容接口。配置后即可在聊天界面选用。
          </Text>
        </div>
        <Button type="primary" icon={<PlusOutlined />} onClick={openCreate} style={{ borderRadius: 8 }}>
          添加模型
        </Button>
      </div>

      {/* 模型配置表格 */}
      <div style={{ background: '#fff', borderRadius: 12, boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
        <Spin spinning={loading}>
          <Table
            rowKey="id"
            columns={columns}
            dataSource={models}
            pagination={false}
            locale={{ emptyText: '暂无配置，点击右上角"添加模型"开始' }}
          />
        </Spin>
      </div>

      {/* 新建/编辑弹窗 */}
      <Modal
        title={
          <Space>
            <ApiOutlined style={{ color: '#1677ff' }} />
            {editItem ? '编辑模型配置' : '添加模型配置'}
          </Space>
        }
        open={modalOpen}
        onOk={handleSubmit}
        onCancel={() => setModalOpen(false)}
        okText="保存" cancelText="取消"
        confirmLoading={saving}
        width={520}
      >
        <Form form={form} layout="vertical" style={{ marginTop: 16 }}>

          {/* 模型类型：决定这个模型用于对话、图片生成还是视频生成 */}
          <Form.Item name="model_type" label="模型分类" rules={[{ required: true, message: '请选择分类' }]}>
            <Select
              options={MODEL_TYPES.map((t) => ({ value: t.value, label: t.label }))}
              style={{ borderRadius: 8 }}
            />
          </Form.Item>

          {/* 提供商选择：决定 base_url 默认值和模型 ID 格式 */}
          <Form.Item name="provider" label="提供商" rules={[{ required: true }]}>
            <Select
              options={PROVIDERS.map((p) => ({ value: p.value, label: p.label }))}
              style={{ borderRadius: 8 }}
              onChange={(val: string) => setSelectedProvider(val)}  // 切换时更新 state，用于动态显示
            />
          </Form.Item>

          {/* 显示名称：仅用于 UI 展示 */}
          <Form.Item name="name" label="显示名称" rules={[{ required: true, message: '请输入名称' }]}>
            <Input placeholder={`如：${currentProvider.label} 模型`} style={{ borderRadius: 8 }} />
          </Form.Item>

          {/* 模型 ID：直接传给 AI API，不同提供商格式不同 */}
          <Form.Item
            name="model_id"
            label="模型 ID"
            rules={[{ required: true, message: '请输入模型 ID' }]}
            extra={currentProvider.modelHint}  // 根据提供商动态显示提示
          >
            <Input placeholder="请输入模型 ID" style={{ borderRadius: 8 }} />
          </Form.Item>

          {/* API Key */}
          <Form.Item
            name="api_key"
            label="API Key"
            rules={editItem ? [] : [{ required: true, message: '请输入 API Key' }]}
            extra={editItem ? '留空保留原有 Key；填入新值则覆盖' : undefined}
          >
            <Input.Password placeholder="输入 API Key" style={{ borderRadius: 8 }} />
          </Form.Item>

          {/* Base URL：自定义提供商必填，其他留空则用默认值 */}
          <Form.Item
            name="base_url"
            label="Base URL"
            rules={currentProvider.baseUrlRequired
              ? [{ required: true, message: '自定义提供商必须填写 Base URL' }]
              : []}
            extra={currentProvider.baseUrlRequired
              ? '填写 OpenAI 兼容接口的完整地址（含 /v1）'
              : `留空使用默认：${currentProvider.defaultBaseUrl || '（未设置）'}`}
          >
            <Input
              placeholder={currentProvider.defaultBaseUrl || 'https://your-api.com/v1'}
              style={{ borderRadius: 8 }}
            />
          </Form.Item>

          {/* 启用状态 */}
          <Form.Item name="is_active" label="启用此模型" valuePropName="checked">
            <Switch />
          </Form.Item>

          {/* 设为默认模型 */}
          <Form.Item name="is_default" label="设为默认模型（聊天时自动使用）" valuePropName="checked">
            <Switch />
          </Form.Item>

        </Form>
      </Modal>
    </div>
  );
};

export default Models;
