import React from 'react';
import { Button } from 'antd';
import { FolderOpenOutlined } from '@ant-design/icons';
import type { GenerationRecord } from '@/services/generate';

interface GenerationCardProps {
  generation: GenerationRecord;
  onOpen: () => void;
}

const GenerationCard: React.FC<GenerationCardProps> = ({ generation, onOpen }) => {
  return (
    <div
      style={{
        borderRadius: 12,
        overflow: 'hidden',
        cursor: 'pointer',
        boxShadow: '0 2px 12px rgba(0,0,0,0.08)',
        transition: 'all 0.3s ease',
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLDivElement).style.boxShadow = '0 8px 24px rgba(0,0,0,0.16)';
        (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-4px)';
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLDivElement).style.boxShadow = '0 2px 12px rgba(0,0,0,0.08)';
        (e.currentTarget as HTMLDivElement).style.transform = 'translateY(0)';
      }}
    >
      {/* 缩略图 */}
      {generation.type === 'image' ? (
        <img
          src={generation.url}
          alt={generation.prompt}
          style={{
            width: '100%',
            height: 'auto',
            display: 'block',
            aspectRatio: '1',
            objectFit: 'cover',
          }}
        />
      ) : (
        <video
          src={generation.url}
          style={{
            width: '100%',
            height: 'auto',
            display: 'block',
            aspectRatio: '16/9',
            objectFit: 'cover',
          }}
        />
      )}

      {/* 信息栏 */}
      <div style={{ padding: '8px 10px', background: 'white' }}>
        <div
          style={{
            fontSize: 12,
            color: '#64748b',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            marginBottom: 6,
          }}
        >
          {generation.prompt}
        </div>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: 8,
          }}
        >
          <span style={{ fontSize: 11, color: '#94a3b8' }}>{generation.model_name}</span>
          <Button
            size="small"
            type="primary"
            icon={<FolderOpenOutlined />}
            onClick={(e) => {
              e.stopPropagation();
              onOpen();
            }}
          >
            打开
          </Button>
        </div>
      </div>
    </div>
  );
};

export default GenerationCard;
