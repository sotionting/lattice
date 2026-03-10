import React, { useState, useEffect, useRef } from 'react';
import {
  Select, Button, Card, Typography, Space, Alert, Spin,
  Row, Col, Tag, Input, Empty, Divider, message,
} from 'antd';
import {
  RobotOutlined, SendOutlined, SearchOutlined, CodeOutlined,
  MessageOutlined, FileTextOutlined, ThunderboltOutlined,
  ClearOutlined,
} from '@ant-design/icons';
import { agentService, type AgentType, type AgentModel } from '@/services/agent';

const { TextArea } = Input;
const { Text, Title } = Typography;

const agentIcons: Record<string, React.ReactNode> = {
  search: <SearchOutlined />,
  repl:   <CodeOutlined />,
  chat:   <MessageOutlined />,
  csv:    <FileTextOutlined />,
};

const agentColors: Record<string, string> = {
  search: '#1677ff',
  repl:   '#52c41a',
  chat:   '#722ed1',
  csv:    '#fa8c16',
};

interface HistoryItem {
  id: number;
  agentType: string;
  agentName: string;
  modelName: string;
  prompt: string;
  result: string;
  time: string;
}

const Agent: React.FC = () => {
  const [agentTypes, setAgentTypes] = useState<AgentType[]>([]);
  const [models, setModels] = useState<AgentModel[]>([]);
  const [selectedType, setSelectedType] = useState<string>('search');
  const [selectedModel, setSelectedModel] = useState<string | undefined>(undefined);
  const [prompt, setPrompt] = useState('');
  const [running, setRunning] = useState(false);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [loadingInit, setLoadingInit] = useState(true);
  const historyRef = useRef<HTMLDivElement>(null);
  const idRef = useRef(0);

  useEffect(() => {
    Promise.all([agentService.getTypes(), agentService.getModels()])
      .then(([typesRes, modelsRes]) => {
        const types: AgentType[] = typesRes.data?.data ?? [];
        const mods: AgentModel[] = modelsRes.data?.data ?? [];
        setAgentTypes(types);
        setModels(mods);
        if (types.length > 0) setSelectedType(types[0].type);
        const def = mods.find((m) => m.is_default) ?? mods[0];
        if (def) setSelectedModel(def.id);
      })
      .catch((e: Error) => message.error(e.message || '加载 Agent 配置失败'))
      .finally(() => setLoadingInit(false));
  }, []);

  useEffect(() => {
    if (historyRef.current) {
      historyRef.current.scrollTop = historyRef.current.scrollHeight;
    }
  }, [history]);

  const handleRun = async () => {
    if (!prompt.trim()) {
      message.warning('请输入任务描述');
      return;
    }
    if (models.length === 0) {
      message.error('没有可用的 LLM 模型，请先在「模型管理」添加并启用一个 LLM 模型');
      return;
    }

    setRunning(true);
    const currentType = selectedType;
    const currentPrompt = prompt;
    setPrompt('');

    try {
      const res = await agentService.run({
        agent_type: currentType,
        prompt: currentPrompt,
        model_id: selectedModel,
      });
      const data = res.data?.data;
      const typeMeta = agentTypes.find((t) => t.type === currentType);
      idRef.current += 1;
      setHistory((prev) => [
        ...prev,
        {
          id: idRef.current,
          agentType: currentType,
          agentName: typeMeta?.name ?? currentType,
          modelName: data?.model_name ?? '',
          prompt: currentPrompt,
          result: data?.result ?? '',
          time: new Date().toLocaleTimeString('zh-CN'),
        },
      ]);
    } catch (e: any) {
      const detail = e.response?.data?.detail || e.message || 'Agent 执行失败';
      message.error(detail);
    } finally {
      setRunning(false);
    }
  };

  const currentTypeMeta = agentTypes.find((t) => t.type === selectedType);

  if (loadingInit) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
        <Spin size="large" tip="加载 Agent 配置中…" />
      </div>
    );
  }

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{
          width: 40, height: 40, borderRadius: 12,
          background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 4px 12px rgba(99,102,241,0.35)',
        }}>
          <ThunderboltOutlined style={{ color: '#fff', fontSize: 18 }} />
        </div>
        <div>
          <Title level={4} style={{ margin: 0, fontWeight: 700 }}>AI Agent</Title>
          <Text type="secondary" style={{ fontSize: 13 }}>选择 Agent 类型 + 模型，输入任务描述</Text>
        </div>
      </div>

      <Row gutter={16} style={{ flex: 1, minHeight: 0 }}>
        {/* Left: Config + Input */}
        <Col span={10} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {/* Agent type selection */}
          <Card
            size="small"
            title={<Space><RobotOutlined style={{ color: '#6366f1' }} /><span>Agent 类型</span></Space>}
            style={{ borderRadius: 12, border: '1px solid #f0f0f0' }}
          >
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              {agentTypes.map((t) => (
                <div
                  key={t.type}
                  onClick={() => setSelectedType(t.type)}
                  style={{
                    padding: '10px 12px',
                    borderRadius: 10,
                    border: `2px solid ${selectedType === t.type ? agentColors[t.type] ?? '#6366f1' : '#f0f0f0'}`,
                    background: selectedType === t.type ? `${agentColors[t.type] ?? '#6366f1'}10` : '#fff',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                  }}
                >
                  <Space>
                    <span style={{ color: agentColors[t.type] ?? '#6366f1', fontSize: 16 }}>
                      {agentIcons[t.type] ?? <RobotOutlined />}
                    </span>
                    <span style={{ fontWeight: 600, fontSize: 13 }}>{t.name}</span>
                  </Space>
                  <div style={{ color: '#8c8c8c', fontSize: 11, marginTop: 4, lineHeight: 1.4 }}>{t.desc}</div>
                </div>
              ))}
            </div>
          </Card>

          {/* Model selection */}
          <Card
            size="small"
            title={<Space><ThunderboltOutlined style={{ color: '#52c41a' }} /><span>大脑模型</span></Space>}
            style={{ borderRadius: 12, border: '1px solid #f0f0f0' }}
          >
            {models.length === 0 ? (
              <Alert
                message="没有可用的 LLM 模型"
                description={<span>请先在 <a href="/admin/models">模型管理</a> 中添加并启用一个 LLM 模型</span>}
                type="warning"
                showIcon
              />
            ) : (
              <Select
                value={selectedModel}
                onChange={setSelectedModel}
                style={{ width: '100%' }}
                optionLabelProp="label"
              >
                {models.map((m) => (
                  <Select.Option key={m.id} value={m.id} label={m.name}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontWeight: 500 }}>{m.name}</span>
                      <Space size={4}>
                        <Tag color="blue" style={{ fontSize: 11, margin: 0 }}>{m.provider}</Tag>
                        {m.is_default && <Tag color="gold" style={{ fontSize: 11, margin: 0 }}>默认</Tag>}
                      </Space>
                    </div>
                    <div style={{ fontSize: 11, color: '#8c8c8c' }}>{m.model_id}</div>
                  </Select.Option>
                ))}
              </Select>
            )}
          </Card>

          {/* Input area */}
          <Card
            size="small"
            title={
              <Space>
                <span style={{ color: agentColors[selectedType] ?? '#6366f1', fontSize: 15 }}>
                  {agentIcons[selectedType] ?? <RobotOutlined />}
                </span>
                <span>{currentTypeMeta?.name ?? 'Agent'} 任务描述</span>
              </Space>
            }
            style={{ borderRadius: 12, border: '1px solid #f0f0f0', flex: 1 }}
            styles={{ body: { display: 'flex', flexDirection: 'column', height: 'calc(100% - 46px)', gap: 10 } }}
          >
            <TextArea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder={
                selectedType === 'search' ? '例如：搜索最新的 AI 发展新闻并总结' :
                selectedType === 'repl'   ? '例如：生成一个斐波那契数列，计算前 20 项之和' :
                selectedType === 'chat'   ? '例如：请帮我用英文写一封商务邮件，主题是…' :
                                            '例如：分析这份 CSV 数据的主要趋势'
              }
              autoSize={{ minRows: 6, maxRows: 12 }}
              style={{ flex: 1, resize: 'none', borderRadius: 8 }}
              onPressEnter={(e) => { if (e.ctrlKey || e.metaKey) handleRun(); }}
              disabled={running}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text type="secondary" style={{ fontSize: 12 }}>Ctrl+Enter 发送</Text>
              <Space>
                <Button
                  icon={<ClearOutlined />}
                  onClick={() => setHistory([])}
                  disabled={history.length === 0}
                  size="small"
                >
                  清空记录
                </Button>
                <Button
                  type="primary"
                  icon={<SendOutlined />}
                  loading={running}
                  onClick={handleRun}
                  disabled={!prompt.trim() || models.length === 0}
                  style={{ borderRadius: 8 }}
                >
                  {running ? '执行中…' : '运行'}
                </Button>
              </Space>
            </div>
          </Card>
        </Col>

        {/* Right: Result history */}
        <Col span={14} style={{ display: 'flex', flexDirection: 'column' }}>
          <Card
            title={
              <Space>
                <ThunderboltOutlined style={{ color: '#6366f1' }} />
                <span>执行结果</span>
                {history.length > 0 && <Tag>{history.length} 条</Tag>}
              </Space>
            }
            style={{ flex: 1, borderRadius: 12, border: '1px solid #f0f0f0', display: 'flex', flexDirection: 'column' }}
            styles={{ body: { flex: 1, overflowY: 'auto', padding: '12px 16px' } }}
          >
            {running && (
              <div style={{
                display: 'flex', alignItems: 'center', gap: 12, padding: '16px',
                background: '#f8f9ff', borderRadius: 10, marginBottom: 12,
                border: '1px solid #e6ebff',
              }}>
                <Spin size="small" />
                <div>
                  <div style={{ fontWeight: 500, fontSize: 13 }}>Agent 正在执行…</div>
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    {currentTypeMeta?.desc ?? '处理中，请稍候'}
                  </Text>
                </div>
              </div>
            )}

            <div ref={historyRef} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {history.length === 0 && !running ? (
                <Empty
                  image={<ThunderboltOutlined style={{ fontSize: 56, color: '#d9d9d9' }} />}
                  imageStyle={{ height: 70, marginTop: 40 }}
                  description={<span style={{ color: '#8c8c8c' }}>选择 Agent 类型，输入任务描述，点击运行</span>}
                  style={{ padding: '40px 0' }}
                />
              ) : (
                history.map((item) => (
                  <div key={item.id} style={{ borderRadius: 10, border: '1px solid #f0f0f0', overflow: 'hidden' }}>
                    {/* Question header */}
                    <div style={{
                      padding: '10px 14px',
                      background: `${agentColors[item.agentType] ?? '#6366f1'}08`,
                      borderBottom: '1px solid #f0f0f0',
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    }}>
                      <Space size={6}>
                        <span style={{ color: agentColors[item.agentType] ?? '#6366f1' }}>
                          {agentIcons[item.agentType] ?? <RobotOutlined />}
                        </span>
                        <Tag color={agentColors[item.agentType] ?? 'blue'} style={{ margin: 0 }}>
                          {item.agentName}
                        </Tag>
                        <Tag style={{ margin: 0 }}>{item.modelName}</Tag>
                      </Space>
                      <Text type="secondary" style={{ fontSize: 11 }}>{item.time}</Text>
                    </div>
                    {/* Prompt */}
                    <div style={{ padding: '10px 14px', background: '#fafafa', borderBottom: '1px solid #f5f5f5' }}>
                      <Text style={{ fontSize: 13 }}>Q: {item.prompt}</Text>
                    </div>
                    {/* Result */}
                    <div style={{ padding: '12px 14px' }}>
                      <pre style={{
                        fontSize: 13, lineHeight: 1.7, margin: 0,
                        whiteSpace: 'pre-wrap', wordBreak: 'break-word',
                        fontFamily: 'inherit',
                      }}>
                        {item.result}
                      </pre>
                    </div>
                  </div>
                ))
              )}
            </div>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default Agent;
