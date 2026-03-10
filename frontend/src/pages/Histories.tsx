import React, { useState, useEffect } from 'react';
import { List, Empty, Button, Spin, Modal, Space } from 'antd';
import { DeleteOutlined, EditOutlined, FolderOpenOutlined, ReloadOutlined } from '@ant-design/icons';
import { conversationService } from '@/services/conversation';
import { useTabStore } from '@/store';
import { useNavigate, useLocation } from 'react-router-dom';

interface Conversation {
  id: string;
  title: string;
  created_at: string;
}

const Histories: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { openChatTab } = useTabStore();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(false);

  // 加载对话列表
  const loadConversations = () => {
    setLoading(true);
    conversationService
      .list()
      .then((data) => {
        // 后端返回分页格式 { items, total, page, page_size }
        // 提取 items 数组，若格式异常则返回空数组
        if (data && data.items && Array.isArray(data.items)) {
          setConversations(data.items);
        } else {
          setConversations([]);
        }
      })
      .catch((err) => {
        console.error('加载对话历史失败:', err);
        Modal.error({
          title: '加载失败',
          content: err?.message || '无法加载对话历史，请稍后重试',
          okText: '关闭',
        });
      })
      .finally(() => setLoading(false));
  };

  // 每次进入这个页面时自动重新加载对话列表
  useEffect(() => {
    loadConversations();
  }, [location.pathname]);

  // 打开对话（新标签）
  const handleOpen = (id: string, title: string) => {
    openChatTab(id, title);
    navigate('/');
  };

  // 删除对话
  const handleDelete = (id: string) => {
    Modal.confirm({
      title: '删除对话',
      content: '确定要删除这个对话吗？',
      okText: '删除',
      cancelText: '取消',
      onOk: async () => {
        try {
          await conversationService.remove(id);
          setConversations(conversations.filter((c) => c.id !== id));
        } catch (err) {
          Modal.error({ title: '删除失败', okText: '关闭' });
        }
      },
    });
  };

  return (
    <div style={{ height: '100%', overflowY: 'auto', padding: '24px' }}>
      <div style={{ maxWidth: 600, margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <h2 style={{ margin: 0 }}>对话历史</h2>
          <Button icon={<ReloadOutlined />} onClick={loadConversations} loading={loading}>
            刷新
          </Button>
        </div>

        <Spin spinning={loading}>
          {conversations.length === 0 ? (
            <Empty description="暂无对话历史" />
          ) : (
            <List
              dataSource={conversations}
              renderItem={(conv) => (
                <List.Item
                  actions={[
                    <Button
                      type="primary"
                      size="small"
                      icon={<FolderOpenOutlined />}
                      onClick={() => handleOpen(conv.id, conv.title)}
                    >
                      打开
                    </Button>,
                    <Button
                      danger
                      size="small"
                      icon={<DeleteOutlined />}
                      onClick={() => handleDelete(conv.id)}
                    >
                      删除
                    </Button>,
                  ]}
                >
                  <List.Item.Meta
                    title={conv.title}
                    description={new Date(conv.created_at).toLocaleString()}
                  />
                </List.Item>
              )}
            />
          )}
        </Spin>
      </div>
    </div>
  );
};

export default Histories;
