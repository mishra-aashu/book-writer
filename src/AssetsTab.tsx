import React from 'react';
import { Plus, Trash2, Image } from 'lucide-react';
import type { ProjectAsset } from './types';

interface AssetsTabProps {
  projectAssets: ProjectAsset[];
  onUploadAsset: (name: string, mimeType: string, dataBase64: string) => void;
  onDeleteAsset: (id: string) => void;
  onInsertAsset: (dataBase64: string, name: string) => void;
}

export const AssetsTab: React.FC<AssetsTabProps> = ({
  projectAssets,
  onUploadAsset,
  onDeleteAsset,
  onInsertAsset,
}) => {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: '16px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
        <h3 style={{ fontSize: '15px', fontWeight: 600, margin: 0 }}>Media & Assets</h3>
        <label 
          className="btn btn-primary" 
          style={{ 
            padding: '6px 12px', 
            fontSize: '11px', 
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            margin: 0
          }}
        >
          <Plus size={12} /> Add Image
          <input 
            type="file" 
            accept="image/*" 
            style={{ display: 'none' }} 
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) {
                const reader = new FileReader();
                reader.onload = (event) => {
                  const base64Data = event.target?.result as string;
                  onUploadAsset(file.name, file.type, base64Data);
                };
                reader.readAsDataURL(file);
              }
            }} 
          />
        </label>
      </div>

      <p style={{ fontSize: '11.5px', color: 'var(--text-secondary)', margin: '0 0 10px 0', lineHeight: '1.4' }}>
        Upload local maps, illustrations, or covers to insert them directly into your book manuscript.
      </p>

      {projectAssets.length === 0 ? (
        <div style={{ 
          flex: 1, 
          display: 'flex', 
          flexDirection: 'column', 
          alignItems: 'center', 
          justifyContent: 'center', 
          padding: '40px 20px', 
          border: '1.5px dashed var(--border-color)', 
          borderRadius: '12px',
          background: 'rgba(255, 255, 255, 0.01)'
        }}>
          <Image size={32} style={{ color: 'var(--text-muted)', marginBottom: '12px', opacity: 0.5 }} />
          <span style={{ fontSize: '12px', color: 'var(--text-muted)', textAlign: 'center' }}>No assets uploaded yet</span>
        </div>
      ) : (
        <div 
          style={{ 
            display: 'grid', 
            gridTemplateColumns: '1fr 1fr', 
            gridAutoRows: 'max-content',
            alignContent: 'start',
            gap: '12px', 
            overflowY: 'auto',
            flex: 1,
            paddingRight: '4px'
          }}
        >
          {projectAssets.map((asset) => (
            <div 
              key={asset.id} 
              style={{ 
                background: 'rgba(255,255,255,0.02)', 
                border: '1px solid var(--border-color)', 
                borderRadius: '10px', 
                padding: '8px', 
                display: 'flex', 
                flexDirection: 'column', 
                gap: '8px',
                position: 'relative',
                transition: 'all 0.2s ease',
                boxShadow: 'var(--shadow-sm)'
              }}
              className="asset-card"
            >
              <div style={{ 
                width: '100%', 
                height: '100px', 
                borderRadius: '6px', 
                overflow: 'hidden', 
                background: 'rgba(0,0,0,0.2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <img 
                  src={asset.dataBase64} 
                  alt={asset.name} 
                  style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} 
                />
              </div>
              
              <div style={{ 
                fontSize: '11px', 
                fontWeight: 500, 
                color: 'var(--text-primary)',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                padding: '0 2px'
              }} title={asset.name}>
                {asset.name}
              </div>

              <div style={{ display: 'flex', gap: '6px', marginTop: 'auto' }}>
                <button 
                  className="btn btn-secondary" 
                  style={{ flex: 1, padding: '4px 0', fontSize: '10px', height: '24px' }}
                  onClick={() => onInsertAsset(asset.dataBase64, asset.name)}
                >
                  Insert
                </button>
                <button 
                  className="btn-icon-only" 
                  style={{ 
                    padding: '4px 6px', 
                    height: '24px', 
                    background: 'rgba(239, 68, 68, 0.1)', 
                    color: '#f87171',
                    border: '1px solid rgba(239, 68, 68, 0.2)'
                  }}
                  onClick={() => onDeleteAsset(asset.id)}
                >
                  <Trash2 size={12} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
