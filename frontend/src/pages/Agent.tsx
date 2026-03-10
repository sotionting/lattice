import React, { useState, useEffect, useRef } from 'react';
import {
  Select, Button, Card, Typography, Space, Alert, Spin,
  Row, Col, Input, message,
} from 'antd';
import {
  RobotOutlined, SendOutlined, ThunderboltOutlined,
  ClearOutlined,
} from '@ant-design/icons';
import { agentService, type AgentModel } from '@/services/agent';

const { TextArea } = Input;
const { Text, Title } = Typography;

interface HistoryItem {
  id: number;
  prompt: string;
  result: string;
  time: string;
}

const Agent: React.FC = () => {
  const [models, setModels] = useState<AgentModel[]>([]);
  const [selectedModel, setSelectedModel] = useState<string | undefined>(undefined);
  const [selectedAgentType, setSelectedAgentType] = useState<string>('search');
  const [prompt, setPrompt] = useState('');
  const [running, setRunning] = useState(false);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [loadingInit, setLoadingInit] = useState(true);
  const historyRef = useRef<HTMLDivElement>(null);
  const idRef = useRef(0);

  // 加载模型列表
  useEffect(() => {
    agentService.getModels()
      .then((res) => {
        const mods: AgentModel[] = res.data?.data ?? [];
        setModels(mods);
        const def = mods.find((m) => m.is_default) ?? mods[0];
        if (def) setSelectedModel(def.id);
      })
      .catch((e: Error) => message.error(e.message || '加载模型列表失败'))
      .finally(() => setLoadingInit(false));
  }, []);

  // 执行结果滚动
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
    const currentPrompt = prompt;
    setPrompt('');

    try {
      const res = await agentService.run({
        agent_type: selectedAgentType,
        prompt: currentPrompt,
        model_id: selectedModel,
      });
      const data = res.data?.data;
      idRef.current += 1;
      setHistory((prev) => [
        ...prev,
        {
          id: idRef.current,
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

  if (loadingInit) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
        <Spin size="large" tip="加载 Agent 配置中…" />
      </div>
    );
  }

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* 头部 */}
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
          <Title level={4} style={{ margin: 0, fontWeight: 700 }}>全能 AI Agent</Title>
          <Text type="secondary" style={{ fontSize: 13 }}>选择 LLM 大脑，输入任务描述，支持所有已启用的 Skills</Text>
        </div>
      </div>

      <Row gutter={16} style={{ flex: 1, minHeight: 0 }}>
        {/* 左：输入区 */}
        <Col span={10} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {/* Agent 类型选择 */}
          <Card
            size="small"
            title={<Space><ThunderboltOutlined style={{ color: '#6366f1' }} /><span>Agent 类型</span></Space>}
            style={{ borderRadius: 12, border: '1px solid #f0f0f0' }}
          >
            <Select
              value={selectedAgentType}
              onChange={setSelectedAgentType}
              style={{ width: '100%' }}
              optionLabelProp="label"
            >
              <Select.Option value="search" label="搜索 Agent">
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>搜索 Agent</span>
                  <span style={{ fontSize: 11, color: '#8c8c8c' }}>联网搜索 + 工具调用</span>
                </div>
              </Select.Option>
              <Select.Option value="repl" label="代码 Agent">
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>代码 Agent</span>
                  <span style={{ fontSize: 11, color: '#8c8c8c' }}>Python 代码执行</span>
                </div>
              </Select.Option>
              <Select.Option value="chat" label="对话 Agent">
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>对话 Agent</span>
                  <span style={{ fontSize: 11, color: '#8c8c8c' }}>纯对话，语言任务</span>
                </div>
              </Select.Option>
              <Select.Option value="csv" label="CSV Agent">
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>CSV Agent</span>
                  <span style={{ fontSize: 11, color: '#8c8c8c' }}>数据分析</span>
                </div>
              </Select.Option>
            </Select>
          </Card>

          {/* 模型选择 */}
          <Card
            size="small"
            title={<Space><RobotOutlined style={{ color: '#6366f1' }} /><span>大脑模型</span></Space>}
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
                      {m.is_default && <span style={{ fontSize: 11, color: '#faad14' }}>★ 默认</span>}
                    </div>
                    <div style={{ fontSize: 11, color: '#8c8c8c' }}>{m.model_id}</div>
                  </Select.Option>
                ))}
              </Select>
            )}
          </Card>

          {/* 输入框 */}
          <Card
            size="small"
            title={<Space><SendOutlined style={{ color: '#6366f1' }} /><span>任务描述</span></Space>}
            style={{ borderRadius: 12, border: '1px solid #f0f0f0', flex: 1 }}
            styles={{ body: { display: 'flex', flexDirection: 'column', height: 'calc(100% - 46px)', gap: 10 } }}
          >
            <TextArea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="输入任务描述，支持所有已配置的 Skills…"
              autoSize={{ minRows: 8, maxRows: 16 }}
              style={{ flex: 1, resize: 'none', borderRadius: 8 }}
              onPressEnter={(e) => { if (e.ctrlKey || e.metaKey) handleRun(); }}
              disabled={running}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text type="secondary" style={{ fontSize: 12 }}>Ctrl+Enter 执行</Text>
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
                  {running ? '执行中…' : '执行'}
                </Button>
              </Space>
            </div>
          </Card>
        </Col>

        {/* 右：结果展示区 */}
        <Col span={14} style={{ display: 'flex', flexDirection: 'column' }}>
          <Card
            title={<Space><ThunderboltOutlined style={{ color: '#6366f1' }} /><span>执行结果</span></Space>}
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
                  <Text type="secondary" style={{ fontSize: 12 }}>处理中，请稍候</Text>
                </div>
              </div>
            )}

            <div ref={historyRef} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {history.length === 0 && !running ? (
                <div style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  minHeight: '200px',
                  color: '#8c8c8c',
                  gap: 8,
                }}>
                  <ThunderboltOutlined style={{ fontSize: 48, color: '#d9d9d9' }} />
                  <span style={{ fontSize: 14 }}>输入任务描述，点击"执行"查看结果</span>
                </div>
              ) : (
                history.map((item) => (
                  <div key={item.id} style={{ borderRadius: 10, border: '1px solid #f0f0f0', overflow: 'hidden' }}>
                    {/* 任务头 */}
                    <div style={{
                      padding: '10px 14px',
                      background: '#f0f2ff',
                      borderBottom: '1px solid #f0f0f0',
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    }}>
                      <span style={{ fontWeight: 500, fontSize: 13 }}>任务 #{item.id}</span>
                      <Text type="secondary" style={{ fontSize: 11 }}>{item.time}</Text>
                    </div>
                    {/* 任务描述 */}
                    <div style={{ padding: '10px 14px', background: '#fafafa', borderBottom: '1px solid #f5f5f5' }}>
                      <Text style={{ fontSize: 13 }}>📝 {item.prompt}</Text>
                    </div>
                    {/* 结果 */}
                    <div style={{ padding: '12px 14px' }}>
                      <pre style={{
                        fontSize: 13, lineHeight: 1.7, margin: 0,
                        whiteSpace: 'pre-wrap', wordBreak: 'break-word',
                        fontFamily: 'inherit',
                        color: '#1e293b',
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
