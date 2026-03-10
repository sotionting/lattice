import React, { useState, useEffect } from 'react';
import {
  Input, Button, Select, Card, Typography, Space, Empty,
  Row, Col, Dropdown, Tooltip, Popconfirm, message, Spin,
} from 'antd';
import {
  SearchOutlined, UploadOutlined, FileTextOutlined,
  FileImageOutlined, FilePdfOutlined, FileExcelOutlined,
  DownloadOutlined, DeleteOutlined, EllipsisOutlined,
  FolderOpenOutlined, InboxOutlined,
} from '@ant-design/icons';
import type { UploadProps } from 'antd';
import { Upload } from 'antd';
import { resourcesService, type ResourceItem } from '@/services/resources';

const { Text } = Typography;
const { Dragger } = Upload;

type FileType = 'document' | 'image' | 'pdf' | 'spreadsheet' | 'other';

const fileIconMap: Record<FileType, { icon: React.ReactNode; color: string; bg: string }> = {
  document:    { icon: <FileTextOutlined />,  color: '#1677ff', bg: '#e6f4ff' },
  image:       { icon: <FileImageOutlined />, color: '#52c41a', bg: '#f6ffed' },
  pdf:         { icon: <FilePdfOutlined />,   color: '#ff4d4f', bg: '#fff1f0' },
  spreadsheet: { icon: <FileExcelOutlined />, color: '#389e0d', bg: '#f6ffed' },
  other:       { icon: <FileTextOutlined />,  color: '#8c8c8c', bg: '#f5f5f5' },
};

const Resources: React.FC = () => {
  const [resources, setResources] = useState<ResourceItem[]>([]);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);

  const fetchResources = async () => {
    setLoading(true);
    try {
      const res = await resourcesService.list();
      setResources(res.items);
    } catch (e: any) {
      message.error(e.message || '加载资源列表失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchResources(); }, []);

  const handleUpload = async (file: File) => {
    setUploading(true);
    try {
      const item = await resourcesService.upload(file);
      setResources((prev: ResourceItem[]) => [item, ...prev]);
      message.success(`「${file.name}」上传成功`);
    } catch (e: any) {
      message.error(e.message || '上传失败');
    } finally {
      setUploading(false);
    }
    return false; // 阻止 antd Upload 默认行为
  };

  const handleDelete = async (id: string, name: string) => {
    try {
      await resourcesService.remove(id);
      setResources((prev: ResourceItem[]) => prev.filter((r: ResourceItem) => r.id !== id));
      message.success(`「${name}」已删除`);
    } catch (e: any) {
      message.error(e.message || '删除失败');
    }
  };

  const uploadProps: UploadProps = {
    multiple: true,
    showUploadList: false,
    beforeUpload: (file) => handleUpload(file),
  };

  const filtered = resources.filter((r: ResourceItem) => {
    const matchSearch = r.name.toLowerCase().includes(search.toLowerCase());
    const matchType = typeFilter === 'all' || r.type === typeFilter;
    return matchSearch && matchType;
  });

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* 页面头部 */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 600 }}>资源库</h2>
          <Text type="secondary" style={{ fontSize: 13 }}>共 {resources.length} 个文件</Text>
        </div>
        <Upload {...uploadProps}>
          <Button type="primary" icon={<UploadOutlined />} loading={uploading} style={{ borderRadius: 8 }}>
            上传文件
          </Button>
        </Upload>
      </div>

      {/* 过滤区域 */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
        <Input
          prefix={<SearchOutlined style={{ color: '#bfbfbf' }} />}
          placeholder="搜索文件名..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ flex: 1, borderRadius: 8 }}
          allowClear
        />
        <Select
          value={typeFilter}
          onChange={setTypeFilter}
          style={{ width: 140 }}
          options={[
            { value: 'all',         label: '全部类型' },
            { value: 'document',    label: '文档' },
            { value: 'image',       label: '图片' },
            { value: 'pdf',         label: 'PDF' },
            { value: 'spreadsheet', label: '表格' },
            { value: 'other',       label: '其他' },
          ]}
        />
      </div>

      {/* 文件网格 */}
      <div style={{ flex: 1, overflowY: 'auto' }}>
        <Spin spinning={loading}>
          {!loading && resources.length === 0 ? (
            /* 空状态：拖放上传区 */
            <Dragger {...uploadProps} style={{ borderRadius: 12, padding: '20px 0' }}>
              <p className="ant-upload-drag-icon">
                <InboxOutlined style={{ color: '#1677ff', fontSize: 48 }} />
              </p>
              <p style={{ fontSize: 15, color: '#1a1a1a' }}>点击或拖拽文件到此处上传</p>
              <p style={{ fontSize: 13, color: '#8c8c8c' }}>支持任意格式，AI 生成的文件也会自动出现在这里</p>
            </Dragger>
          ) : filtered.length === 0 ? (
            <div style={{ background: '#fff', borderRadius: 12, padding: '60px 0', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
              <Empty
                image={<FolderOpenOutlined style={{ fontSize: 64, color: '#d9d9d9' }} />}
                imageStyle={{ height: 80, marginTop: 20 }}
                description={<span style={{ color: '#8c8c8c' }}>未找到匹配的文件</span>}
              />
            </div>
          ) : (
            <Row gutter={[16, 16]}>
              {filtered.map((item: ResourceItem) => {
                const { icon, color, bg } = fileIconMap[item.type] ?? fileIconMap.other;
                return (
                  <Col key={item.id} xs={24} sm={12} lg={8}>
                    <Card
                      size="small"
                      style={{ borderRadius: 10, border: '1px solid #f0f0f0', cursor: 'default' }}
                      hoverable
                      extra={
                        <Dropdown
                          menu={{
                            items: [
                              {
                                key: 'download', icon: <DownloadOutlined />, label: '下载',
                                onClick: () => resourcesService.download(item.id, item.name),
                              },
                              {
                                key: 'delete', icon: <DeleteOutlined />, label: (
                                  <Popconfirm
                                    title={`确认删除「${item.name}」？`}
                                    onConfirm={() => handleDelete(item.id, item.name)}
                                    okText="删除" cancelText="取消" okButtonProps={{ danger: true }}
                                  >
                                    <span>删除</span>
                                  </Popconfirm>
                                ), danger: true,
                              },
                            ],
                          }}
                          trigger={['click']}
                        >
                          <Button type="text" icon={<EllipsisOutlined />} size="small" />
                        </Dropdown>
                      }
                    >
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                        <div style={{
                          width: 44, height: 44, borderRadius: 10,
                          background: bg, color, display: 'flex',
                          alignItems: 'center', justifyContent: 'center',
                          fontSize: 20, flexShrink: 0,
                        }}>
                          {icon}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <Tooltip title={item.name}>
                            <div style={{ fontWeight: 500, fontSize: 14, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {item.name}
                            </div>
                          </Tooltip>
                          <Text type="secondary" style={{ fontSize: 12 }}>
                            {item.size} · {item.source}
                          </Text>
                        </div>
                      </div>
                      <div style={{ marginTop: 10, display: 'flex', justifyContent: 'flex-end' }}>
                        <Text type="secondary" style={{ fontSize: 11 }}>{item.created_at}</Text>
                      </div>
                    </Card>
                  </Col>
                );
              })}
            </Row>
          )}
        </Spin>
      </div>
    </div>
  );
};

export default Resources;
