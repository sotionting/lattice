import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Table, Progress, Button, Select, Typography, Space,
  Badge, Tooltip, Card, Row, Col, Statistic, Tag, message,
} from 'antd';
import {
  ReloadOutlined, CheckCircleOutlined, ClockCircleOutlined,
  SyncOutlined, CloseCircleOutlined, ThunderboltOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { tasksService, type TaskItem } from '@/services/tasks';

const { Text } = Typography;

type TaskStatus = 'running' | 'pending' | 'success' | 'failed';

const statusConfig: Record<TaskStatus, { color: string; icon: React.ReactNode; label: string }> = {
  running: { color: 'processing', icon: <SyncOutlined spin />,  label: '进行中' },
  pending: { color: 'default',    icon: <ClockCircleOutlined />, label: '等待中' },
  success: { color: 'success',    icon: <CheckCircleOutlined />, label: '已完成' },
  failed:  { color: 'error',      icon: <CloseCircleOutlined />, label: '失败' },
};

const Tasks: React.FC = () => {
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [loading, setLoading] = useState(false);
  const timerRef = useRef<number | undefined>(undefined);

  const fetchTasks = useCallback(async () => {
    setLoading(true);
    try {
      const res = await tasksService.list(1, 50, statusFilter === 'all' ? undefined : statusFilter);
      setTasks(res.items);
    } catch (e: any) {
      message.error(e.message || '加载任务列表失败');
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  // 初始加载 & 过滤条件变化时重新加载
  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  // 有进行中任务时每 8 秒自动刷新
  useEffect(() => {
    const hasActive = tasks.some((t: TaskItem) => t.status === 'running' || t.status === 'pending');
    if (hasActive) {
      timerRef.current = window.setInterval(fetchTasks, 8000);
    } else {
      clearInterval(timerRef.current);
    }
    return () => clearInterval(timerRef.current);
  }, [tasks, fetchTasks]);

  const filtered = tasks;

  const stats = {
    running: tasks.filter((t: TaskItem) => t.status === 'running').length,
    pending: tasks.filter((t: TaskItem) => t.status === 'pending').length,
    success: tasks.filter((t: TaskItem) => t.status === 'success').length,
    failed:  tasks.filter((t: TaskItem) => t.status === 'failed').length,
  };

  const columns: ColumnsType<TaskItem> = [
    {
      title: '任务',
      dataIndex: 'name',
      key: 'name',
      render: (name: string, record: TaskItem) => (
        <div>
          <div style={{ fontWeight: 500, marginBottom: 2 }}>{name}</div>
          <Space size={4}>
            <Tag color="blue" style={{ fontSize: 11, margin: 0 }}>{record.type}</Tag>
            <Tag style={{ fontSize: 11, margin: 0 }}>{record.model}</Tag>
          </Space>
        </div>
      ),
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status: TaskStatus) => {
        const cfg = statusConfig[status] ?? statusConfig.pending;
        return <Badge status={cfg.color as 'processing' | 'default' | 'success' | 'error'} text={cfg.label} />;
      },
    },
    {
      title: '进度',
      dataIndex: 'progress',
      key: 'progress',
      width: 180,
      render: (progress: number, record: TaskItem) => (
        <Progress
          percent={progress}
          size="small"
          status={record.status === 'failed' ? 'exception' : record.status === 'success' ? 'success' : 'active'}
          style={{ marginBottom: 0 }}
        />
      ),
    },
    {
      title: '开始时间',
      dataIndex: 'started_at',
      key: 'started_at',
      width: 100,
      render: (v: string) => <Text type="secondary">{v}</Text>,
    },
    {
      title: '耗时',
      dataIndex: 'duration',
      key: 'duration',
      width: 80,
      render: (v: string) => <Text type="secondary">{v}</Text>,
    },
    {
      title: '操作',
      key: 'action',
      width: 80,
      render: (_: unknown, record: TaskItem) => (
        <Space>
          {record.status === 'failed' && (
            <Tooltip title="暂不支持重试">
              <Button size="small" icon={<ReloadOutlined />} disabled />
            </Tooltip>
          )}
        </Space>
      ),
    },
  ];

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 600 }}>任务状态</h2>
          <Text type="secondary" style={{ fontSize: 13 }}>所有 AI 任务的实时执行状态</Text>
        </div>
        <Button icon={<ReloadOutlined />} onClick={fetchTasks} loading={loading} style={{ borderRadius: 8 }}>刷新</Button>
      </div>

      <Row gutter={12}>
        {[
          { label: '进行中', value: stats.running, color: '#1677ff', icon: <SyncOutlined spin /> },
          { label: '等待中', value: stats.pending, color: '#8c8c8c', icon: <ClockCircleOutlined /> },
          { label: '已完成', value: stats.success, color: '#52c41a', icon: <CheckCircleOutlined /> },
          { label: '失败',   value: stats.failed,  color: '#ff4d4f', icon: <CloseCircleOutlined /> },
        ].map((item) => (
          <Col key={item.label} span={6}>
            <Card
              size="small"
              style={{ borderRadius: 10, border: '1px solid #f0f0f0', textAlign: 'center' }}
              styles={{ body: { padding: '16px 12px' } }}
            >
              <Statistic
                title={
                  <Space style={{ color: item.color }}>
                    {React.cloneElement(item.icon as React.ReactElement, { style: { fontSize: 14 } })}
                    <span style={{ fontSize: 13 }}>{item.label}</span>
                  </Space>
                }
                value={item.value}
                valueStyle={{ color: item.color, fontSize: 28, fontWeight: 700 }}
              />
            </Card>
          </Col>
        ))}
      </Row>

      <Card
        style={{ flex: 1, borderRadius: 12, border: '1px solid #f0f0f0' }}
        styles={{ body: { padding: '16px' } }}
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <ThunderboltOutlined style={{ color: '#1677ff' }} />
            <span>任务列表</span>
          </div>
        }
        extra={
          <Select
            value={statusFilter}
            onChange={setStatusFilter}
            style={{ width: 120 }}
            options={[
              { value: 'all',     label: '全部状态' },
              { value: 'running', label: '进行中' },
              { value: 'pending', label: '等待中' },
              { value: 'success', label: '已完成' },
              { value: 'failed',  label: '失败' },
            ]}
          />
        }
      >
        <Table
          rowKey="id"
          columns={columns}
          dataSource={filtered}
          loading={loading}
          size="small"
          pagination={false}
          locale={{ emptyText: '暂无任务记录，Skill 执行后会在这里显示' }}
        />
      </Card>
    </div>
  );
};

export default Tasks;
