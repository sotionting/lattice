import React, { useState, useEffect } from 'react';
import {
  Input, Button, List, Avatar, Tag, Empty, Typography, Space,
  Dropdown, Modal, Popconfirm, message, Spin,
} from 'antd';
import {
  SearchOutlined, MessageOutlined, RobotOutlined,
  PlusOutlined, EllipsisOutlined, DeleteOutlined, EditOutlined,
} from '@ant-design/icons';
import { useNavigate, useLocation } from 'react-router-dom';
import { conversationService, type ConversationItem } from '@/services/conversation';

const { Text } = Typography;

const Conversations: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [conversations, setConversations] = useState<ConversationItem[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  // 重命名 Modal 状态
  const [renameTarget, setRenameTarget] = useState<ConversationItem | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [renaming, setRenaming] = useState(false);

  // location.key 每次导航到本页都会变化，确保每次进入都重新拉取最新数据
  useEffect(() => {
    setLoading(true);
    conversationService.list()
      .then((res) => setConversations(res.items))
      .catch((e: Error) => message.error(e.message || '加载对话列表失败'))
      .finally(() => setLoading(false));
  }, [location.key]);

  const handleRename = async () => {
    if (!renameTarget || !renameValue.trim()) return;
    setRenaming(true);
    try {
      await conversationService.rename(renameTarget.id, renameValue.trim());
      setConversations((prev: ConversationItem[]) =>
        prev.map((c: ConversationItem) => c.id === renameTarget.id ? { ...c, title: renameValue.trim() } : c)
      );
      setRenameTarget(null);
      message.success('重命名成功');
    } catch (e: any) {
      message.error(e.message || '重命名失败');
    } finally {
      setRenaming(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await conversationService.remove(id);
      setConversations((prev: ConversationItem[]) => prev.filter((c: ConversationItem) => c.id !== id));
      message.success('对话已删除');
    } catch (e: any) {
      message.error(e.message || '删除失败');
    }
  };

  const filtered = conversations.filter((c: ConversationItem) =>
    c.title.includes(search) || (c.last_message ?? '').includes(search)
  );

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* 页面头部 */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 600 }}>对话历史</h2>
          <Text type="secondary" style={{ fontSize: 13 }}>共 {conversations.length} 条对话记录</Text>
        </div>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => navigate('/')} style={{ borderRadius: 8 }}>
          新建对话
        </Button>
      </div>

      <Input
        prefix={<SearchOutlined style={{ color: '#bfbfbf' }} />}
        placeholder="搜索对话标题或内容..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        style={{ marginBottom: 16, borderRadius: 8 }}
        allowClear
      />

      <div style={{ flex: 1, overflowY: 'auto', background: '#fff', borderRadius: 12, boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
        <Spin spinning={loading}>
          {!loading && filtered.length === 0 ? (
            <Empty
              image={<MessageOutlined style={{ fontSize: 64, color: '#d9d9d9' }} />}
              imageStyle={{ height: 80, marginTop: 40 }}
              description={<span style={{ color: '#8c8c8c' }}>{search ? '未找到匹配的对话' : '还没有对话记录'}</span>}
              style={{ padding: '60px 0' }}
            >
              {!search && (
                <Button type="primary" icon={<PlusOutlined />} onClick={() => navigate('/')}>
                  开始第一次对话
                </Button>
              )}
            </Empty>
          ) : (
            <List
              dataSource={filtered}
              renderItem={(item: ConversationItem) => (
                <List.Item
                  key={item.id}
                  style={{ padding: '14px 20px', cursor: 'pointer', transition: 'background 0.15s', borderBottom: '1px solid #f5f5f5' }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = '#f8f9ff')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                  onClick={() => navigate(`/?cid=${item.id}`)}
                  actions={[
                    <Dropdown
                      key="actions"
                      menu={{
                        items: [
                          {
                            key: 'rename', icon: <EditOutlined />, label: '重命名',
                            onClick: ({ domEvent }) => {
                              domEvent.stopPropagation();
                              setRenameTarget(item);
                              setRenameValue(item.title);
                            },
                          },
                          {
                            key: 'delete', icon: <DeleteOutlined />, danger: true,
                            label: (
                              <Popconfirm
                                title="确认删除这条对话？"
                                description="对话内所有消息将一并删除，无法恢复。"
                                onConfirm={(e) => { e?.stopPropagation(); handleDelete(item.id); }}
                                okText="删除" cancelText="取消" okButtonProps={{ danger: true }}
                              >
                                <span onClick={(e) => e.stopPropagation()}>删除</span>
                              </Popconfirm>
                            ),
                          },
                        ],
                      }}
                      trigger={['click']}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Button type="text" icon={<EllipsisOutlined />} size="small" onClick={(e) => e.stopPropagation()} />
                    </Dropdown>,
                  ]}
                >
                  <List.Item.Meta
                    avatar={<Avatar icon={<RobotOutlined />} style={{ background: 'linear-gradient(135deg, #1677ff, #0958d9)' }} />}
                    title={
                      <Space>
                        <span style={{ fontWeight: 500, fontSize: 14 }}>{item.title}</span>
                        {item.model_id && <Tag color="blue" style={{ fontSize: 11, marginLeft: 4 }}>{item.model_id}</Tag>}
                      </Space>
                    }
                    description={
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Text type="secondary" ellipsis style={{ maxWidth: 420, fontSize: 13 }}>
                          {item.last_message ?? '（暂无消息）'}
                        </Text>
                        <Space size={8} style={{ flexShrink: 0, marginLeft: 12 }}>
                          <Text type="secondary" style={{ fontSize: 12 }}>
                            {new Date(item.updated_at).toLocaleString('zh-CN', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                          </Text>
                          <Tag style={{ margin: 0, fontSize: 11 }}>{item.message_count} 条</Tag>
                        </Space>
                      </div>
                    }
                  />
                </List.Item>
              )}
            />
          )}
        </Spin>
      </div>

      {/* 重命名 Modal */}
      <Modal
        title="重命名对话"
        open={!!renameTarget}
        onOk={handleRename}
        onCancel={() => setRenameTarget(null)}
        confirmLoading={renaming}
        okText="保存" cancelText="取消"
      >
        <Input
          value={renameValue}
          onChange={(e) => setRenameValue(e.target.value)}
          onPressEnter={handleRename}
          placeholder="输入新标题"
          maxLength={100}
          style={{ marginTop: 8 }}
        />
      </Modal>
    </div>
  );
};

export default Conversations;
