import React, { useState, useEffect, useMemo } from 'react';
import { Segmented, Select, Empty, Spin } from 'antd';
import { useTabStore } from '@/store';
import { useNavigate } from 'react-router-dom';
import GenerationCard from '@/components/common/GenerationCard';
import { listGenerations, type GenerationRecord } from '@/services/generate';

const Generations: React.FC = () => {
  const navigate = useNavigate();
  const { openGenerateTab } = useTabStore();
  const [generations, setGenerations] = useState<GenerationRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [typeFilter, setTypeFilter] = useState<'all' | 'image' | 'video'>('all');
  const [modelFilter, setModelFilter] = useState<string | undefined>(undefined);

  // 加载生成记录列表
  useEffect(() => {
    setLoading(true);
    listGenerations()
      .then((data) => setGenerations(data))
      .catch(() => setGenerations([]))
      .finally(() => setLoading(false));
  }, []);

  // 获取可用的模型列表
  const availableModels = useMemo(() => {
    const models = new Set(generations.map((g) => g.model_name));
    return Array.from(models).map((name) => ({ label: name, value: name }));
  }, [generations]);

  // 过滤生成记录
  const filtered = useMemo(() => {
    return generations.filter((g) => {
      if (typeFilter !== 'all' && g.type !== typeFilter) return false;
      if (modelFilter && g.model_name !== modelFilter) return false;
      return true;
    });
  }, [generations, typeFilter, modelFilter]);

  // 打开生成记录（新标签）
  const handleOpen = (id: string) => {
    openGenerateTab(id, `生成任务 ${id.slice(0, 8)}`);
    navigate('/generate');
  };

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', padding: '24px' }}>
      {/* 筛选栏 */}
      <div style={{ display: 'flex', gap: 16, marginBottom: 24 }}>
        <Segmented
          value={typeFilter}
          onChange={(val) => setTypeFilter(val as 'all' | 'image' | 'video')}
          options={[
            { label: '全部', value: 'all' },
            { label: '图像', value: 'image' },
            { label: '视频', value: 'video' },
          ]}
        />
        <Select
          value={modelFilter || undefined}
          onChange={setModelFilter}
          placeholder="按模型筛选"
          style={{ width: 160 }}
          allowClear
          options={Array.isArray(availableModels) ? availableModels : []}
        />
      </div>

      {/* 瀑布流区 */}
      <Spin spinning={loading}>
        {filtered.length === 0 ? (
          <Empty description="暂无生成记录" />
        ) : (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
              gap: 12,
              overflowY: 'auto',
            }}
          >
            {filtered.map((gen) => (
              <GenerationCard key={gen.id} generation={gen} onOpen={() => handleOpen(gen.id)} />
            ))}
          </div>
        )}
      </Spin>
    </div>
  );
};

export default Generations;
