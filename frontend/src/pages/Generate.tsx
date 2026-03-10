import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { Button, Select, Spin, Modal, Avatar, Segmented, Space, message, Image as AntImage } from 'antd';
import { SendOutlined, RobotOutlined, ClearOutlined, PictureOutlined, PlusOutlined, PaperClipOutlined, CloseCircleFilled } from '@ant-design/icons';
import { useAuthStore, useTabStore } from '@/store';
import { generateImage, getGeneration } from '@/services/generate'; // 图片生成服务
import { modelsService, type ActiveModel } from '@/services/models';
import TabBar from '@/components/common/TabBar';

interface GenerateTab {
  id: string;
  title: string;
  prompt: string;
  mode: 'image' | 'video';
  selectedModelId?: string;
  generatedImages?: string[];
  generatedVideos?: string[];
  loading: boolean;
}

const Generate: React.FC = () => {
  const {
    generateTabs,
    activeGenerateTabId,
    openGenerateTab,
    closeGenerateTab,
    setActiveGenerateTab,
    updateGenerateTabPrompt,
    updateGenerateTabMode,
    updateGenerateTabModelId,
    updateGenerateTabResult,
    updateGenerateTabLoading,
  } = useTabStore();

  const user = useAuthStore((s) => s.user);
  const [availableModels, setAvailableModels] = useState<ActiveModel[]>([]);
  const [imageModels, setImageModels] = useState<ActiveModel[]>([]);
  const [videoModels, setVideoModels] = useState<ActiveModel[]>([]);
  const [referenceImage, setReferenceImage] = useState<string | undefined>(undefined);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const activeTab = useMemo(() => {
    return generateTabs.find((t) => t.id === activeGenerateTabId);
  }, [generateTabs, activeGenerateTabId]);

  if (!activeTab) {
    return (
      <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Spin size="large" />
      </div>
    );
  }

  // 加载模型列表
  useEffect(() => {
    modelsService
      .getActive()
      .then((models) => {
        setAvailableModels(models);
        setImageModels(models.filter((m) => m.model_type === 'image'));
        setVideoModels(models.filter((m) => m.model_type === 'video'));
      })
      .catch(() => {});
  }, []);

  // 获取当前模式可用的模型
  const currentModeModels = activeTab.mode === 'image' ? imageModels : videoModels;

  // 模式切换时自动选择该模式的默认模型
  useEffect(() => {
    if (currentModeModels.length > 0 && !activeTab.selectedModelId) {
      // 优先选择标记为默认的模型，否则选第一个
      const defaultModel = currentModeModels.find((m) => m.is_default) || currentModeModels[0];
      updateGenerateTabModelId(activeTab.id, defaultModel.id);
    }
  }, [activeTab.mode, currentModeModels.length, currentModeModels, activeTab.id, updateGenerateTabModelId]);

  // 加载生成记录（当 tab 有 generationId 时）
  useEffect(() => {
    if (activeTab?.generationId && !activeTab.prompt) {
      getGeneration(activeTab.generationId)
        .then((gen) => {
          updateGenerateTabPrompt(activeTab.id, gen.prompt);
          updateGenerateTabMode(activeTab.id, gen.type);
          // 如果生成记录有 URL，加载为结果
          if (gen.url) {
            if (gen.type === 'image') {
              updateGenerateTabResult(activeTab.id, [gen.url], undefined);
            } else {
              updateGenerateTabResult(activeTab.id, undefined, [gen.url]);
            }
          }
        })
        .catch((err) => {
          Modal.error({
            title: '加载生成记录失败',
            content: err.message || '无法加载该生成记录',
            okText: '关闭',
          });
        });
    }
  }, [activeTab?.generationId, activeTab?.id, activeTab?.prompt, updateGenerateTabPrompt, updateGenerateTabMode, updateGenerateTabResult]);

  // 发送生成请求
  const handleGenerate = useCallback(async () => {
    const prompt = activeTab.prompt.trim();
    if (!prompt || !activeTab.selectedModelId) {
      message.warning('请输入提示词并选择模型');
      return;
    }

    updateGenerateTabLoading(activeTab.id, true);

    try {
      const result = await generateImage(prompt, activeTab.selectedModelId, referenceImage);
      updateGenerateTabResult(activeTab.id, result.images);
      message.success('生成成功');
    } catch (err: any) {
      Modal.error({
        title: '生成失败',
        content: err.message || '未知错误',
        okText: '关闭',
      });
    } finally {
      updateGenerateTabLoading(activeTab.id, false);
    }
  }, [activeTab, updateGenerateTabLoading, updateGenerateTabResult, referenceImage]);

  // 处理文件选择
  const handleFileSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    e.target.value = '';
    if (files.length === 0) return;

    const file = files[0];
    if (!file.type.startsWith('image/')) {
      message.error('请选择图片文件');
      return;
    }

    const reader = new FileReader();
    reader.onload = (ev) => {
      setReferenceImage(ev.target?.result as string);
    };
    reader.readAsDataURL(file);
  }, []);

  const clearReferenceImage = useCallback(() => {
    setReferenceImage(undefined);
  }, []);

  const handleTabClick = (tabId: string) => {
    setActiveGenerateTab(tabId);
  };

  const handleTabClose = (tabId: string) => {
    closeGenerateTab(tabId);
  };

  const handleNewTab = () => {
    openGenerateTab();
  };

  const handleClear = () => {
    updateGenerateTabPrompt(activeTab.id, '');
    updateGenerateTabResult(activeTab.id, undefined, undefined);
    clearReferenceImage();
  };

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* 标签栏 */}
      <TabBar
        tabs={generateTabs.map((t) => ({ id: t.id, title: t.title }))}
        activeTabId={activeGenerateTabId}
        onTabClick={handleTabClick}
        onTabClose={handleTabClose}
        onNewTab={handleNewTab}
      />

      {/* 主内容区 */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        {/* 左侧面板：提示词和控制 */}
        <div
          style={{
            width: 320,
            borderRight: '1px solid rgba(0,0,0,0.06)',
            background: 'rgba(248,250,252,0.80)',
            backdropFilter: 'blur(20px)',
            padding: 16,
            display: 'flex',
            flexDirection: 'column',
            gap: 12,
            overflowY: 'auto',
          }}
        >
          {/* 模式选择 */}
          <div>
            <div style={{ fontSize: 12, fontWeight: 600, color: '#64748b', marginBottom: 8 }}>生成模式</div>
            <Segmented
              value={activeTab.mode}
              onChange={(val) => updateGenerateTabMode(activeTab.id, val as 'image' | 'video')}
              options={[
                { label: '图像', value: 'image', icon: <PictureOutlined /> },
                { label: '视频', value: 'video' },
              ]}
              block
            />
          </div>

          {/* 模型选择 */}
          <div>
            <div style={{ fontSize: 12, fontWeight: 600, color: '#64748b', marginBottom: 8 }}>选择模型</div>
            <Select
              value={activeTab.selectedModelId || undefined}
              onChange={(val) => updateGenerateTabModelId(activeTab.id, val)}
              placeholder="选择模型"
              style={{ width: '100%' }}
              disabled={currentModeModels.length === 0}
              options={Array.isArray(currentModeModels) ? currentModeModels.map((m) => ({
                value: m.id,
                label: m.name,
              })) : []}
            />
          </div>

          {/* 参考图上传 */}
          <div>
            <div style={{ fontSize: 12, fontWeight: 600, color: '#64748b', marginBottom: 8 }}>参考图（可选）</div>
            {referenceImage ? (
              <div style={{ position: 'relative', display: 'inline-block', marginBottom: 12 }}>
                <AntImage src={referenceImage} alt="Reference" width={56} height={56}
                  style={{ objectFit: 'cover', borderRadius: 9, border: '1px solid rgba(0,0,0,0.06)', display: 'block' }}
                  preview={{ mask: '预览' }} />
                <CloseCircleFilled
                  style={{ position: 'absolute', top: -5, right: -5, color: '#ef4444', fontSize: 15, cursor: 'pointer', background: '#fff', borderRadius: '50%' }}
                  onClick={clearReferenceImage}
                />
              </div>
            ) : (
              <Button
                icon={<PaperClipOutlined />}
                onClick={() => fileInputRef.current?.click()}
                style={{ width: '100%', marginBottom: 12 }}
              >
                上传参考图
              </Button>
            )}
            <input ref={fileInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleFileSelect} />
          </div>

          {/* 提示词输入 */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: '#64748b', marginBottom: 8 }}>提示词</div>
            <textarea
              value={activeTab.prompt}
              onChange={(e) => updateGenerateTabPrompt(activeTab.id, e.target.value)}
              placeholder={
                activeTab.mode === 'image' ? '描述你想生成的图像…' : '描述你想生成的视频…'
              }
              style={{
                flex: 1,
                padding: 10,
                border: '1px solid rgba(0,0,0,0.06)',
                borderRadius: 8,
                fontSize: 13,
                fontFamily: 'inherit',
                resize: 'none',
              }}
            />
          </div>

          {/* 生成和清空按钮 */}
          <Space.Compact style={{ width: '100%' }}>
            <Button
              type="primary"
              icon={<SendOutlined />}
              onClick={handleGenerate}
              loading={activeTab.loading}
              disabled={!activeTab.prompt.trim() || !activeTab.selectedModelId}
              block
              style={{ borderRadius: '8px 0 0 8px' }}
            >
              生成
            </Button>
            <Button
              icon={<ClearOutlined />}
              onClick={handleClear}
              disabled={!activeTab.prompt.trim() && !activeTab.generatedImages?.length}
              style={{ borderRadius: '0 8px 8px 0' }}
            >
              清空
            </Button>
          </Space.Compact>
        </div>

        {/* 右侧面板：内容展示 */}
        <div
          style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 24,
            overflowY: 'auto',
            backgroundColor: '#f7f7f8',
          }}
        >
          {/* 欢迎屏 */}
          {!activeTab.generatedImages?.length && !activeTab.generatedVideos?.length && !activeTab.loading && (
            <div style={{ textAlign: 'center', color: '#64748b' }}>
              <div style={{ fontSize: 48, marginBottom: 16 }}>✨</div>
              <div style={{ fontSize: 18, fontWeight: 600, marginBottom: 8 }}>等待生成</div>
              <div style={{ fontSize: 14 }}>输入提示词并点击"生成"按钮开始</div>
            </div>
          )}

          {/* 加载动画 */}
          {activeTab.loading && (
            <div style={{ textAlign: 'center' }}>
              <Spin size="large" />
              <div style={{ marginTop: 16, color: '#64748b' }}>正在生成，请稍候…</div>
            </div>
          )}

          {/* 生成的图片 */}
          {activeTab.generatedImages && activeTab.generatedImages.length > 0 && (
            <div style={{ maxWidth: '100%', maxHeight: '100%' }}>
              {activeTab.generatedImages.map((img, idx) => (
                <img
                  key={idx}
                  src={img}
                  alt={`Generated ${idx + 1}`}
                  style={{
                    maxWidth: '100%',
                    maxHeight: 'calc(100vh - 40px - 64px - 48px)',
                    borderRadius: 16,
                    boxShadow: '0 8px 40px rgba(0,0,0,0.15)',
                  }}
                />
              ))}
            </div>
          )}

          {/* 生成的视频 */}
          {activeTab.generatedVideos && activeTab.generatedVideos.length > 0 && (
            <video
              src={activeTab.generatedVideos[0]}
              controls
              style={{
                maxWidth: '100%',
                maxHeight: 'calc(100vh - 40px - 64px - 48px)',
                borderRadius: 16,
              }}
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default Generate;
