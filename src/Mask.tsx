import React from 'react';

export interface MaskOption {
  id: string;
  name: string;
  clipPath: string;
  svgViewBox?: string;
}

export const MASK_OPTIONS: MaskOption[] = [
  {
    id: 'none',
    name: 'Original',
    clipPath: 'none'
  },
  {
    id: 'circle',
    name: 'Circle',
    clipPath: 'circle(50% at 50% 50%)'
  },
  {
    id: 'oval',
    name: 'Oval',
    clipPath: 'ellipse(50% 40% at 50% 50%)'
  },
  {
    id: 'star',
    name: 'Star',
    clipPath: 'polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%)'
  },
  {
    id: 'heart',
    name: 'Heart',
    clipPath: 'polygon(50% 15%, 65% 0%, 85% 0%, 100% 20%, 100% 45%, 50% 95%, 0% 45%, 0% 20%, 15% 0%, 35% 0%)'
  },
  {
    id: 'diamond',
    name: 'Diamond',
    clipPath: 'polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)'
  },
  {
    id: 'triangle',
    name: 'Triangle',
    clipPath: 'polygon(50% 0%, 0% 100%, 100% 100%)'
  },
  {
    id: 'hexagon',
    name: 'Hexagon',
    clipPath: 'polygon(25% 0%, 75% 0%, 100% 50%, 75% 100%, 25% 100%, 0% 50%)'
  },
  {
    id: 'badge',
    name: 'Badge',
    clipPath: 'polygon(0% 0%, 100% 0%, 100% 75%, 50% 100%, 0% 75%)'
  }
];

export interface BlendModeOption {
  id: string;
  name: string;
}

export const BLEND_MODES: BlendModeOption[] = [
  { id: 'normal', name: 'Normal (Opaque)' },
  { id: 'multiply', name: 'Multiply (Blend with Paper)' },
  { id: 'screen', name: 'Screen (Lighten)' },
  { id: 'overlay', name: 'Overlay (Vibrant Blend)' },
  { id: 'luminosity', name: 'Luminosity (Match Tone)' },
  { id: 'darken', name: 'Darken (Shadow Blend)' },
  { id: 'color-burn', name: 'Color Burn (Retro Printed)' }
];

export const getSvgMaskDataUri = (maskId: string, feather: number, x: number, y: number): string => {
  const stdDev = (feather / 50) * 12; // standard deviation of blur
  const scale = 1 - (stdDev / 100);
  const transform = `translate(${x}, ${y}) scale(${scale}) translate(-50, -50)`;

  let shapeEl = '';

  switch (maskId) {
    case 'circle':
      shapeEl = `<circle cx="50" cy="50" r="50" fill="white" transform="${transform}" />`;
      break;
    case 'oval':
      shapeEl = `<ellipse cx="50" cy="50" rx="50" ry="40" fill="white" transform="${transform}" />`;
      break;
    case 'star':
      shapeEl = `<polygon points="50,0 61,35 98,35 68,57 79,91 50,70 21,91 32,57 2,35 39,35" fill="white" transform="${transform}" />`;
      break;
    case 'heart':
      shapeEl = `<polygon points="50,15 65,0 85,0 100,20 100,45 50,95 0,45 0,20 15,0 35,0" fill="white" transform="${transform}" />`;
      break;
    case 'diamond':
      shapeEl = `<polygon points="50,0 100,50 50,100 0,50" fill="white" transform="${transform}" />`;
      break;
    case 'triangle':
      shapeEl = `<polygon points="50,0 0,100 100,100" fill="white" transform="${transform}" />`;
      break;
    case 'hexagon':
      shapeEl = `<polygon points="25,0 75,0 100,50 75,100 25,100 0,50" fill="white" transform="${transform}" />`;
      break;
    case 'badge':
      shapeEl = `<polygon points="0,0 100,0 100,75 50,100 0,75" fill="white" transform="${transform}" />`;
      break;
    case 'none':
    default:
      if (feather > 0) {
        const inset = stdDev;
        shapeEl = `<rect x="${inset}" y="${inset}" width="${100 - inset * 2}" height="${100 - inset * 2}" rx="4" ry="4" fill="white" />`;
      } else {
        shapeEl = `<rect x="0" y="0" width="100" height="100" fill="white" />`;
      }
      break;
  }

  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100%" height="100%">
      <!-- params: x=${x}, y=${y} -->
      <defs>
        <filter id="feather-blur" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="${stdDev}" />
        </filter>
      </defs>
      ${stdDev > 0 
        ? `<g filter="url(#feather-blur)">${shapeEl}</g>` 
        : shapeEl
      }
    </svg>
  `.trim().replace(/\s+/g, ' ');

  return `url("data:image/svg+xml;utf8,${encodeURIComponent(svg)}")`;
};

interface MaskSelectorProps {
  currentMaskId: string;
  onSelectMask: (maskId: string) => void;
}

export const MaskSelector: React.FC<MaskSelectorProps> = ({ currentMaskId, onSelectMask }) => {
  const getMiniPreviewStyle = (clipPathValue: string): React.CSSProperties => {
    return {
      width: '32px',
      height: '32px',
      background: 'var(--accent-primary, #f59e0b)',
      clipPath: clipPathValue,
      display: 'inline-block',
      margin: '2px'
    };
  };

  return (
    <div style={{ marginTop: '16px' }}>
      <label style={{ 
        fontSize: '11px', 
        fontWeight: 600, 
        color: 'var(--text-secondary, #9ca3af)', 
        textTransform: 'uppercase', 
        display: 'block', 
        marginBottom: '10px',
        letterSpacing: '0.05em'
      }}>
        Apply Image Mask Shape
      </label>
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(3, 1fr)', 
        gap: '8px' 
      }}>
        {MASK_OPTIONS.map((mask) => {
          const isActive = currentMaskId === mask.id;
          return (
            <button
              key={mask.id}
              type="button"
              onClick={() => onSelectMask(mask.id)}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '8px 4px',
                background: isActive ? 'rgba(245, 158, 11, 0.08)' : 'var(--bg-secondary, #1f2937)',
                border: isActive 
                  ? '1.5px solid var(--accent-primary, #f59e0b)' 
                  : '1.5px solid var(--border-color, #374151)',
                borderRadius: '6px',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                color: isActive ? 'var(--text-primary, #ffffff)' : 'var(--text-secondary, #9ca3af)'
              }}
            >
              <div 
                style={{ 
                  ...getMiniPreviewStyle(mask.clipPath),
                  background: isActive ? 'var(--accent-primary, #f59e0b)' : 'var(--text-secondary, #6b7280)',
                  opacity: isActive ? 1 : 0.65
                }} 
              />
              <span style={{ 
                fontSize: '10px', 
                fontWeight: isActive ? 600 : 500, 
                marginTop: '6px',
                textAlign: 'center'
              }}>
                {mask.name}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

interface BlendAndFeatherControlsProps {
  currentMaskId: string;
  currentBlendMode: string;
  onSelectBlendMode: (mode: string) => void;
  currentFeather: number;
  onFeatherChange: (val: number) => void;
  currentFeatherX: number;
  onFeatherXChange: (val: number) => void;
  currentFeatherY: number;
  onFeatherYChange: (val: number) => void;
}

export const BlendAndFeatherControls: React.FC<BlendAndFeatherControlsProps> = ({
  currentMaskId,
  currentBlendMode,
  onSelectBlendMode,
  currentFeather,
  onFeatherChange,
  currentFeatherX,
  onFeatherXChange,
  currentFeatherY,
  onFeatherYChange
}) => {
  return (
    <div style={{ marginTop: '20px', borderTop: '1px solid var(--border-color, #374151)', paddingTop: '16px' }}>
      {/* Blend Mode Selection */}
      <div style={{ marginBottom: '16px' }}>
        <label style={{ 
          fontSize: '11px', 
          fontWeight: 600, 
          color: 'var(--text-secondary, #9ca3af)', 
          textTransform: 'uppercase', 
          display: 'block', 
          marginBottom: '8px',
          letterSpacing: '0.05em'
        }}>
          Page Blend Mode
        </label>
        <select
          value={currentBlendMode}
          onChange={(e) => onSelectBlendMode(e.target.value)}
          style={{
            width: '100%',
            padding: '8px 12px',
            background: 'var(--bg-secondary, #1f2937)',
            border: '1px solid var(--border-color, #374151)',
            borderRadius: '6px',
            color: 'var(--text-primary, #ffffff)',
            fontSize: '12px',
            outline: 'none',
            cursor: 'pointer'
          }}
        >
          {BLEND_MODES.map((mode) => (
            <option key={mode.id} value={mode.id} style={{ background: '#121218' }}>
              {mode.name}
            </option>
          ))}
        </select>
      </div>

      {/* Edge Feathering Slider */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
          <label style={{ 
            fontSize: '11px', 
            fontWeight: 600, 
            color: 'var(--text-secondary, #9ca3af)', 
            textTransform: 'uppercase', 
            letterSpacing: '0.05em'
          }}>
            Edge Feathering (Fade)
          </label>
          <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--accent-primary, #f59e0b)' }}>
            {currentFeather}%
          </span>
        </div>
        <input
          type="range"
          min="0"
          max="50"
          value={currentFeather}
          onChange={(e) => onFeatherChange(parseInt(e.target.value))}
          style={{
            width: '100%',
            accentColor: 'var(--accent-primary, #f59e0b)',
            cursor: 'pointer'
          }}
        />
      </div>

      {/* Horizontal Position Slider */}
      {currentMaskId !== 'none' && (
        <div style={{ marginTop: '14px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <label style={{ 
              fontSize: '11px', 
              fontWeight: 600, 
              color: 'var(--text-secondary, #9ca3af)', 
              textTransform: 'uppercase', 
              letterSpacing: '0.05em'
            }}>
              Fade Position X (Horizontal)
            </label>
            <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--accent-primary, #f59e0b)' }}>
              {currentFeatherX}%
            </span>
          </div>
          <input
            type="range"
            min="0"
            max="100"
            value={currentFeatherX}
            onChange={(e) => onFeatherXChange(parseInt(e.target.value))}
            style={{
              width: '100%',
              accentColor: 'var(--accent-primary, #f59e0b)',
              cursor: 'pointer'
            }}
          />
        </div>
      )}

      {/* Vertical Position Slider */}
      {currentMaskId !== 'none' && (
        <div style={{ marginTop: '14px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <label style={{ 
              fontSize: '11px', 
              fontWeight: 600, 
              color: 'var(--text-secondary, #9ca3af)', 
              textTransform: 'uppercase', 
              letterSpacing: '0.05em'
            }}>
              Fade Position Y (Vertical)
            </label>
            <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--accent-primary, #f59e0b)' }}>
              {currentFeatherY}%
            </span>
          </div>
          <input
            type="range"
            min="0"
            max="100"
            value={currentFeatherY}
            onChange={(e) => onFeatherYChange(parseInt(e.target.value))}
            style={{
              width: '100%',
              accentColor: 'var(--accent-primary, #f59e0b)',
              cursor: 'pointer'
            }}
          />
        </div>
      )}
    </div>
  );
};
