import React, { useState, useEffect } from 'react';
import {
  Card, Table, Tag, Select, Row, Col, Statistic, Progress,
  Typography, Space, Button, Segmented, Tooltip, Badge, Spin, Empty,
} from 'antd';
import {
  BarChartOutlined, UserOutlined, ThunderboltOutlined,
  DollarOutlined, ReloadOutlined, InfoCircleOutlined, RocketOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { quotaService, UsageRecord, UserUsage, ModelUsage } from '../../services/quota';

const { Text } = Typography;

// 知名模型定价表（每百万 token 单价）- 静态参考，实际计费请对接提供商官方
const KNOWN_PRICING: Record<string, { cny: { input: number; cachedInput: number; output: number }; usd: { input: number; cachedInput: number; output: number } }> = {
  'gpt-4o':         { cny: { input: 17.5, cachedInput: 8.75, output: 70   }, usd: { input: 2.5, cachedInput: 1.25, output: 10  } },
  'gpt-4o-mini':    { cny: { input: 1.05, cachedInput: 0.53, output: 4.2  }, usd: { input: 0.15, cachedInput: 0.075, output: 0.6 } },
  'gemini-2.5-flash': { cny: { input: 0.5, cachedInput: 0.1,  output: 2.5 }, usd: { input: 0.075, cachedInput: 0.015, output: 0.3 } },
  'mimo-v2-flash':  { cny: { input: 0.7,  cachedInput: 0.07, output: 2.1  }, usd: { input: 0.1, cachedInput: 0.01, output: 0.3 } },
};

function calcTokenCost(input: number, cached: number, output: number, modelId: string, currency: 'cny' | 'usd'): number {
  const p = KNOWN_PRICING[modelId]?.[currency];
  if (!p) return 0;
  return (input * p.input + cached * p.cachedInput + output * p.output) / 1e6;
}

const Quota: React.FC = () => {
  const [currency, setCurrency] = useState<'cny' | 'usd'>('cny');
  const [viewMode, setViewMode] = useState<'combined' | 'per-model'>('combined');
  const [userFilter, setUserFilter] = useState('all');
  const [days, setDays] = useState(7);
  const [loading, setLoading] = useState(true);

  const [summary, setSummary] = useState({ total_requests: 0, total_tokens: 0, active_users: 0 });
  const [records, setRecords] = useState<UsageRecord[]>([]);
  const [recordsTotal, setRecordsTotal] = useState(0);
  const [recordsPage, setRecordsPage] = useState(1);
  const [byUser, setByUser] = useState<UserUsage[]>([]);
  const [byModel, setByModel] = useState<ModelUsage[]>([]);

  const currSymbol = currency === 'cny' ? '¥' : '$';

  const loadAll = async () => {
    setLoading(true);
    try {
      const [sumRes, byUserRes, byModelRes] = await Promise.all([
        quotaService.getSummary(days),
        quotaService.getByUser(days),
        quotaService.getByModel(days),
      ]);
      setSummary(sumRes.data?.data ?? { total_requests: 0, total_tokens: 0, active_users: 0 });
      setByUser(byUserRes.data?.data ?? []);
      setByModel(byModelRes.data?.data ?? []);
    } catch { /* 静默处理 */ }
    finally { setLoading(false); }
  };

  const loadRecords = async (page = 1) => {
    const uid = userFilter !== 'all' ? byUser.find(u => u.username === userFilter)?.user_id : undefined;
    const res = await quotaService.getRecords({ page, page_size: 10, user_id: uid, days });
    setRecords(res.data?.data?.items ?? []);
    setRecordsTotal(res.data?.data?.total ?? 0);
    setRecordsPage(page);
  };

  useEffect(() => { loadAll(); }, [days]);
  useEffect(() => { loadRecords(1); }, [userFilter, days]);

  const globalCost = records.reduce((s, r) => s + calcTokenCost(r.input_tokens, r.cached_input_tokens, r.output_tokens, r.model_id, currency), 0);

  const columns: ColumnsType<UsageRecord> = [
    {
      title: '用户', dataIndex: 'username', key: 'username',
      render: (v: string) => <Space><UserOutlined style={{ color: '#1677ff' }} />{v}</Space>,
    },
    {
      title: '模型', dataIndex: 'model_name', key: 'model_name',
      render: (v: string, r) => <><Tag color="blue">{v}</Tag><Tag color="default" style={{ fontSize: 11 }}>{r.provider}</Tag></>,
    },
    {
      title: <Tooltip title="输入：普通输入 | 缓存：命中缓存（更便宜）| 输出：模型生成">Token 用量 <InfoCircleOutlined style={{ color: '#8c8c8c', fontSize: 12 }} /></Tooltip>,
      key: 'tokens',
      render: (_: unknown, r: UsageRecord) => (
        <Space size={4} wrap>
          <Tag color="blue" style={{ margin: 0 }}>输入 {r.input_tokens.toLocaleString()}</Tag>
          {r.cached_input_tokens > 0 && <Tag color="cyan" style={{ margin: 0 }}>缓存 {r.cached_input_tokens.toLocaleString()}</Tag>}
          <Tag color="orange" style={{ margin: 0 }}>输出 {r.output_tokens.toLocaleString()}</Tag>
        </Space>
      ),
    },
    {
      title: `费用（${currSymbol}）`, key: 'cost', align: 'right' as const,
      render: (_: unknown, r: UsageRecord) => {
        const cost = calcTokenCost(r.input_tokens, r.cached_input_tokens, r.output_tokens, r.model_id, currency);
        return <Text style={{ fontWeight: 500, color: cost > 0.001 ? '#fa8c16' : 'inherit' }}>{currSymbol}{cost.toFixed(5)}</Text>;
      },
    },
    {
      title: '时间', dataIndex: 'created_at', key: 'created_at',
      render: (v: string) => <Text type="secondary">{new Date(v).toLocaleString('zh-CN')}</Text>,
    },
  ];

  return (
    <Spin spinning={loading}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

        {/* 页头 */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h2 style={{ margin: 0, fontSize: 18, fontWeight: 600 }}>额度管理</h2>
            <Text type="secondary" style={{ fontSize: 13 }}>查看真实 Token 用量与费用统计</Text>
          </div>
          <Space>
            <Select value={days} onChange={setDays} size="small" style={{ width: 110 }}
              options={[{ value: 7, label: '最近 7 天' }, { value: 30, label: '最近 30 天' }, { value: 90, label: '最近 90 天' }]} />
            <Segmented value={currency} onChange={v => setCurrency(v as 'cny' | 'usd')}
              options={[{ label: '人民币 ¥', value: 'cny' }, { label: '美元 $', value: 'usd' }]} />
            <Button icon={<ReloadOutlined />} onClick={loadAll} style={{ borderRadius: 8 }}>刷新</Button>
          </Space>
        </div>

        {/* 统计卡片 */}
        <Card style={{ borderRadius: 12, border: '1px solid #f0f0f0' }}
          title={
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Space><BarChartOutlined style={{ color: '#1677ff' }} /><span>用量统计</span></Space>
              <Segmented size="small" value={viewMode} onChange={v => setViewMode(v as 'combined' | 'per-model')}
                options={[{ label: '合并视图', value: 'combined' }, { label: '分模型视图', value: 'per-model' }]} />
            </div>
          }
          styles={{ body: { padding: '16px 20px' } }}
        >
          {viewMode === 'combined' ? (
            <Row gutter={12}>
              {[
                { title: `近 ${days} 天请求`, value: summary.total_requests, suffix: '次', icon: <ThunderboltOutlined />, color: '#1677ff' },
                { title: '总 Token', value: summary.total_tokens.toLocaleString(), suffix: '', icon: <BarChartOutlined />, color: '#52c41a' },
                { title: '估算费用', value: `${currSymbol}${globalCost.toFixed(4)}`, suffix: '', icon: <DollarOutlined />, color: '#fa8c16' },
                { title: '活跃用户', value: summary.active_users, suffix: '人', icon: <UserOutlined />, color: '#722ed1' },
              ].map(item => (
                <Col key={item.title} span={6}>
                  <div style={{ padding: 16, borderRadius: 10, border: '1px solid #f0f0f0', background: '#fafafa', display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ width: 40, height: 40, borderRadius: 10, background: `${item.color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: item.color, fontSize: 18, flexShrink: 0 }}>{item.icon}</div>
                    <Statistic title={<span style={{ fontSize: 12, color: '#8c8c8c' }}>{item.title}</span>} value={item.value} suffix={item.suffix} valueStyle={{ color: item.color, fontSize: 20, fontWeight: 700 }} />
                  </div>
                </Col>
              ))}
            </Row>
          ) : (
            byModel.length === 0 ? <Empty description="暂无用量数据" /> : (
              <Row gutter={12}>
                {byModel.map(m => (
                  <Col key={m.model_id} xs={24} sm={12} md={8}>
                    <div style={{ padding: 16, borderRadius: 10, border: '1px solid #e6f4ff', background: '#f0f7ff' }}>
                      <div style={{ marginBottom: 10 }}>
                        <Tag color="blue">{m.model_name}</Tag>
                        <Tag color="default" style={{ fontSize: 11 }}>{m.provider}</Tag>
                      </div>
                      <Row gutter={8}>
                        <Col span={8}><Statistic title={<span style={{ fontSize: 11, color: '#8c8c8c' }}>请求次数</span>} value={m.requests} suffix="次" valueStyle={{ fontSize: 18, color: '#1677ff', fontWeight: 700 }} /></Col>
                        <Col span={8}><Statistic title={<span style={{ fontSize: 11, color: '#8c8c8c' }}>总 Token</span>} value={m.total_tokens.toLocaleString()} valueStyle={{ fontSize: 16, color: '#52c41a', fontWeight: 700 }} /></Col>
                        <Col span={8}><Statistic title={<span style={{ fontSize: 11, color: '#8c8c8c' }}>估算费用</span>} value={`${currSymbol}${calcTokenCost(m.input_tokens, m.cached_input_tokens, m.output_tokens, m.model_id, currency).toFixed(4)}`} valueStyle={{ fontSize: 16, color: '#fa8c16', fontWeight: 700 }} /></Col>
                      </Row>
                    </div>
                  </Col>
                ))}
              </Row>
            )
          )}
        </Card>

        {/* 用户用量进度条 */}
        <Card title={<Space><UserOutlined style={{ color: '#1677ff' }} />用户用量排行</Space>}
          style={{ borderRadius: 12, border: '1px solid #f0f0f0' }} styles={{ body: { padding: '16px 20px' } }}
        >
          {byUser.length === 0 ? <Empty description="暂无用量数据" /> : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {byUser.sort((a, b) => b.total_tokens - a.total_tokens).map(u => {
                const maxTokens = byUser[0]?.total_tokens || 1;
                const percent = Math.round(u.total_tokens / maxTokens * 100);
                const cost = calcTokenCost(u.input_tokens, u.cached_input_tokens, u.output_tokens, byModel[0]?.model_id ?? '', currency);
                return (
                  <div key={u.user_id}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                      <Space>
                        <Text strong>{u.username}</Text>
                        <Text type="secondary" style={{ fontSize: 12 }}>{u.total_tokens.toLocaleString()} tokens · {u.requests} 次请求</Text>
                      </Space>
                      <Tag style={{ margin: 0 }}>≈{currSymbol}{cost.toFixed(4)}</Tag>
                    </div>
                    <Progress percent={percent} size="small" showInfo={false}
                      strokeColor={percent > 80 ? '#ff4d4f' : percent > 60 ? '#fa8c16' : '#52c41a'} />
                  </div>
                );
              })}
            </div>
          )}
        </Card>

        {/* 用量明细表格 */}
        <Card title={<Space><BarChartOutlined style={{ color: '#1677ff' }} />用量明细</Space>}
          style={{ borderRadius: 12, border: '1px solid #f0f0f0' }} styles={{ body: { padding: '0 0 8px' } }}
          extra={
            <Select value={userFilter} onChange={v => setUserFilter(v)} size="small" style={{ width: 130 }}
              options={[{ value: 'all', label: '所有用户' }, ...byUser.map(u => ({ value: u.username, label: u.username }))]} />
          }
        >
          <Table rowKey="id" columns={columns} dataSource={records} size="small"
            pagination={{
              current: recordsPage, total: recordsTotal, pageSize: 10, showSizeChanger: false,
              onChange: p => loadRecords(p),
            }}
            locale={{ emptyText: <Empty description="暂无用量记录（聊天产生用量后会在此显示）" /> }}
          />
        </Card>

      </div>
    </Spin>
  );
};

export default Quota;
