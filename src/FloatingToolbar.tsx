import React from 'react';
import { AlignLeft, AlignCenter, AlignRight, AlignJustify, List, ListOrdered, Quote, Link } from 'lucide-react';

interface FloatingToolbarProps {
  focusMode: boolean;
  applySelectionStyle: (styleName: string, value: string) => void;
}

const FloatingToolbar: React.FC<FloatingToolbarProps> = ({
  focusMode,
  applySelectionStyle,
}) => {
  return (
    <div
      className="no-print floating-selection-toolbar"
      style={{
        position: 'fixed',
        top: '120px',
        right: focusMode ? '24px' : '384px',
        width: '200px',
        background: 'var(--bg-sidebar)',
        border: '1px solid var(--border-color)',
        borderRadius: '12px',
        boxShadow: 'var(--shadow-lg)',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        padding: '16px',
        zIndex: 99999,
        pointerEvents: 'auto',
        animation: 'slideInRight 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
        transition: 'right 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', borderBottom: '1px solid var(--border-color)', paddingBottom: '8px', marginBottom: '2px' }}>
        <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
          Format Text
        </span>
      </div>

      {/* Style Row */}
      <div style={{ display: 'flex', gap: '6px' }}>
        <button
          type="button"
          className="btn btn-secondary"
          style={{ flex: 1, padding: '6px 0', fontSize: '11px', fontWeight: 'bold' }}
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => applySelectionStyle('bold', '')}
        >
          B
        </button>
        <button
          type="button"
          className="btn btn-secondary"
          style={{ flex: 1, padding: '6px 0', fontSize: '11px', fontStyle: 'italic' }}
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => applySelectionStyle('italic', '')}
        >
          I
        </button>
        <button
          type="button"
          className="btn btn-secondary"
          style={{ flex: 1, padding: '6px 0', fontSize: '11px', textDecoration: 'underline' }}
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => applySelectionStyle('underline', '')}
        >
          U
        </button>
      </div>

      {/* Alignment Row */}
      <div style={{ display: 'flex', gap: '6px' }}>
        <button
          type="button"
          className="btn btn-secondary"
          style={{ flex: 1, padding: '6px 0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => applySelectionStyle('justifyLeft', '')}
          title="Align Left"
        >
          <AlignLeft size={13} />
        </button>
        <button
          type="button"
          className="btn btn-secondary"
          style={{ flex: 1, padding: '6px 0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => applySelectionStyle('justifyCenter', '')}
          title="Align Center"
        >
          <AlignCenter size={13} />
        </button>
        <button
          type="button"
          className="btn btn-secondary"
          style={{ flex: 1, padding: '6px 0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => applySelectionStyle('justifyRight', '')}
          title="Align Right"
        >
          <AlignRight size={13} />
        </button>
        <button
          type="button"
          className="btn btn-secondary"
          style={{ flex: 1, padding: '6px 0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => applySelectionStyle('justifyFull', '')}
          title="Justify"
        >
          <AlignJustify size={13} />
        </button>
      </div>

      {/* Structure Row */}
      <div style={{ display: 'flex', gap: '6px' }}>
        <button
          type="button"
          className="btn btn-secondary"
          style={{ flex: 1, padding: '6px 0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => applySelectionStyle('insertUnorderedList', '')}
          title="Bullet List"
        >
          <List size={13} />
        </button>
        <button
          type="button"
          className="btn btn-secondary"
          style={{ flex: 1, padding: '6px 0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => applySelectionStyle('insertOrderedList', '')}
          title="Numbered List"
        >
          <ListOrdered size={13} />
        </button>
        <button
          type="button"
          className="btn btn-secondary"
          style={{ flex: 1, padding: '6px 0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => applySelectionStyle('formatBlock', 'blockquote')}
          title="Blockquote"
        >
          <Quote size={13} />
        </button>
        <button
          type="button"
          className="btn btn-secondary"
          style={{ flex: 1, padding: '6px 0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => applySelectionStyle('createLink', '')}
          title="Insert Link"
        >
          <Link size={13} />
        </button>
      </div>

      <div style={{ height: '1px', background: 'var(--border-color)' }} />

      {/* Font Size select */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
        <label style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Size</label>
        <select
          className="select"
          style={{ width: '100%', padding: '6px 8px', fontSize: '12px', background: 'rgba(255,255,255,0.03)', cursor: 'pointer' }}
          defaultValue=""
          onChange={(e) => {
            if (e.target.value) {
              applySelectionStyle('fontSize', e.target.value);
              e.target.value = '';
            }
          }}
        >
          <option value="" disabled>Choose size...</option>
          <option value="12px">12px</option>
          <option value="14px">14px</option>
          <option value="16px">16px</option>
          <option value="18px">18px</option>
          <option value="20px">20px</option>
          <option value="24px">24px</option>
          <option value="28px">28px</option>
        </select>
      </div>

      {/* Font Family select */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
        <label style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Font</label>
        <select
          className="select"
          style={{ width: '100%', padding: '6px 8px', fontSize: '12px', background: 'rgba(255,255,255,0.03)', cursor: 'pointer' }}
          defaultValue=""
          onChange={(e) => {
            if (e.target.value) {
              applySelectionStyle('fontFamily', e.target.value);
              e.target.value = '';
            }
          }}
        >
          <option value="" disabled>Choose font...</option>
          <option value="'EB Garamond', serif">Garamond</option>
          <option value="'Lora', serif">Lora</option>
          <option value="'Noto Serif Devanagari', serif">Noto</option>
          <option value="'Outfit', sans-serif">Outfit</option>
          <option value="'Inter', sans-serif">Inter</option>
          <option value="'Courier Prime', monospace">Courier</option>
        </select>
      </div>

      {/* Color select */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
        <label style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Color</label>
        <select
          className="select"
          style={{ width: '100%', padding: '6px 8px', fontSize: '12px', background: 'rgba(255,255,255,0.03)', cursor: 'pointer' }}
          defaultValue=""
          onChange={(e) => {
            if (e.target.value) {
              applySelectionStyle('color', e.target.value);
              e.target.value = '';
            }
          }}
        >
          <option value="" disabled>Choose color...</option>
          <option value="var(--text-primary)">Default</option>
          <option value="#c084fc">Purple</option>
          <option value="#f87171">Red</option>
          <option value="#34d399">Green</option>
          <option value="#fbbf24">Amber</option>
        </select>
      </div>
    </div>
  );
};

export default FloatingToolbar;
