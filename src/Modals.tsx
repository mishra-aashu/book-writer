import React, { useState } from 'react';
import { X, AlertTriangle, Crop } from 'lucide-react';

// --- 1. ConfirmModal Props & Component ---
interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  isDanger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  isDanger = false,
  onConfirm,
  onCancel,
}) => {
  if (!isOpen) return null;

  return (
    <div className="modal-backdrop no-print">
      <div className="modal-content" style={{ maxWidth: '420px' }}>
        <div style={{ display: 'flex', gap: '14px', alignItems: 'flex-start' }}>
          <div style={{
            background: isDanger ? 'rgba(239, 68, 68, 0.1)' : 'var(--accent-glow)',
            color: isDanger ? '#ef4444' : 'var(--accent-primary)',
            padding: '10px',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0
          }}>
            {isDanger ? <AlertTriangle size={24} /> : <AlertTriangle size={24} style={{ transform: 'rotate(180deg)' }} />}
          </div>
          
          <div style={{ flexGrow: 1 }}>
            <h3 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '8px', color: 'var(--text-primary)' }}>
              {title}
            </h3>
            <p style={{ fontSize: '13.5px', color: 'var(--text-secondary)', lineHeight: 1.45, marginBottom: '24px' }}>
              {message}
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
          <button type="button" className="btn btn-secondary" onClick={onCancel}>
            {cancelText}
          </button>
          <button
            type="button"
            className={isDanger ? 'btn btn-danger' : 'btn btn-primary'}
            onClick={onConfirm}
            autoFocus
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};

// --- 2. PromptModal Props & Component ---
interface PromptModalProps {
  isOpen: boolean;
  title: string;
  placeholder?: string;
  defaultValue?: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: (val: string) => void;
  onCancel: () => void;
}

export const PromptModal: React.FC<PromptModalProps> = ({
  isOpen,
  title,
  placeholder = 'Enter value...',
  defaultValue = '',
  confirmText = 'Submit',
  cancelText = 'Cancel',
  onConfirm,
  onCancel,
}) => {
  const [inputValue, setInputValue] = useState(defaultValue);

  // Sync state if default value changes or modal opens
  React.useEffect(() => {
    if (isOpen) {
      setInputValue(defaultValue);
    }
  }, [isOpen, defaultValue]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim()) return;
    onConfirm(inputValue.trim());
  };

  return (
    <div className="modal-backdrop no-print">
      <div className="modal-content" style={{ maxWidth: '440px' }}>
        <div style={{ display: 'flex', justifySelf: 'space-between', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h3 style={{ fontSize: '18px', fontWeight: 600 }}>{title}</h3>
          <button className="btn-icon-only" onClick={onCancel} style={{ padding: '4px' }}>
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '20px' }}>
            <input
              type="text"
              className="input"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder={placeholder}
              autoFocus
              required
            />
          </div>

          <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
            <button type="button" className="btn btn-secondary" onClick={onCancel}>
              {cancelText}
            </button>
            <button type="submit" className="btn btn-primary" disabled={!inputValue.trim()}>
              {confirmText}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// --- 3. TemplateSelectModal Props & Component ---
interface TemplateSelectModalProps {
  isOpen: boolean;
  projectType: 'novel' | 'screenplay';
  existingPageTypes?: string[];
  targetCategory?: 'front_matter' | 'body' | 'back_matter' | 'screenplay';
  onConfirm: (templateId: string, category: 'front_matter' | 'body' | 'back_matter' | 'screenplay', pageType: string) => void;
  onCancel: () => void;
}

export const TemplateSelectModal: React.FC<TemplateSelectModalProps> = ({
  isOpen,
  projectType,
  existingPageTypes = [],
  targetCategory,
  onConfirm,
  onCancel,
}) => {
  const isNovel = projectType === 'novel' || !projectType;
  const [activeCategory, setActiveCategory] = useState<'front_matter' | 'body' | 'back_matter'>(
    'body'
  );
  const [selectedType, setSelectedType] = useState<string>('');
  const isSelectedTypeUniqueAndExists = ['toc', 'copyright', 'screenplay_title', 'screenplay_fade_in', 'screenplay_fade_out'].includes(selectedType) && existingPageTypes.includes(selectedType);

  React.useEffect(() => {
    if (isOpen) {
      if (isNovel) {
        const defaultCat = targetCategory && targetCategory !== 'screenplay' ? targetCategory : 'body';
        setActiveCategory(defaultCat);
        
        let defaultType = '';
        if (defaultCat === 'body') defaultType = 'standard_prose';
        else if (defaultCat === 'front_matter') defaultType = 'full_title';
        else if (defaultCat === 'back_matter') defaultType = 'epilogue';
        setSelectedType(defaultType);
      } else {
        setSelectedType('screenplay_standard');
      }
    }
  }, [isOpen, isNovel, targetCategory]);

  if (!isOpen) return null;

  // Novel Page types categorised
  const novelCategories = {
    front_matter: [
      { id: 'half_title', name: 'Half Title Page', template: 'standard', desc: 'Minimalist title page, traditionally the very first page of the book.' },
      { id: 'verso_blank', name: 'Blank / Verso Page', template: 'standard', desc: 'Empty page layout, usually placed on the left side (verso).' },
      { id: 'full_title', name: 'Full Title Page', template: 'title_page', desc: 'Main title showcase including title, subtitle, author, and publisher.' },
      { id: 'copyright', name: 'Copyright Page', template: 'standard', desc: 'Standard copyright text block, ISBN, publisher details and rights statement.' },
      { id: 'dedication', name: 'Dedication Page', template: 'standard', desc: 'Short personal dedication statement centered in beautiful italics.' },
      { id: 'epigraph', name: 'Epigraph Page', template: 'standard', desc: 'Thematic quote or poem lines placed before the narrative begins.' },
      { id: 'toc', name: 'Table of Contents (TOC)', template: 'standard', desc: 'Dynamic or manual outline table pointing to chapter page references.' },
      { id: 'illustrations', name: 'List of Illustrations/Maps', template: 'standard', desc: 'Index of illustrations, tables, or geographical maps.' },
      { id: 'foreword', name: 'Foreword', template: 'standard', desc: 'An introductory essay written by a person other than the author.' },
      { id: 'preface', name: 'Preface', template: 'standard', desc: 'Author-written introduction detailing the origin, scope, and development.' },
      { id: 'acknowledgments', name: 'Acknowledgments', template: 'standard', desc: 'Author thank-you section to contributors, friends, and editors.' },
      { id: 'prologue', name: 'Prologue', template: 'chapter_start', desc: 'Narrative opening scene setting up the story prior to Chapter One.' },
    ],
    body: [
      { id: 'divider', name: 'Part Divider Page', template: 'title_page', desc: 'A divider screen marking transitions between major parts (e.g. Part I).' },
      { id: 'chapter_start', name: 'Chapter Opening Page', template: 'chapter_start', desc: 'Big chapter title, header decorations, drop caps and opening prose.' },
      { id: 'standard_prose', name: 'Standard Prose Page', template: 'standard', desc: 'Standard page for continuous prose with running header/footer numbers.' },
      { id: 'interlude', name: 'Interlude / Intermission', template: 'standard', desc: 'Time skips, POV switch inserts, or character vignette pages.' },
    ],
    back_matter: [
      { id: 'epilogue', name: 'Epilogue', template: 'chapter_start', desc: 'Concluding chapter or scene wrapping up the narrative in the future.' },
      { id: 'afterword', name: 'Afterword', template: 'standard', desc: 'Author\'s closing commentary describing real sources, history, or inspiration.' },
      { id: 'appendix', name: 'Appendix', template: 'standard', desc: 'Supplemental documents, glossaries, worldbuilding details, or maps.' },
      { id: 'glossary', name: 'Glossary', template: 'standard', desc: 'Glossary listing fictional terminology, languages, or character gloss.' },
      { id: 'about_author', name: 'About the Author', template: 'corner_notes', desc: 'Short biography paragraph of the author and layout details.' },
      { id: 'also_by', name: 'Also By This Author', template: 'standard', desc: 'List of other publication details and promotion links.' },
      { id: 'discussion', name: 'Book Club Discussion', template: 'standard', desc: 'Discussion prompts, questions, and reader group topics.' },
    ],
  };

  // Screenplay Page Types
  const screenplayTypes = [
    { id: 'screenplay_title', name: 'Script Title Page', template: 'screenplay_title', desc: 'Official script frontispiece showing title, author, and contact details.' },
    { id: 'screenplay_fade_in', name: 'FADE IN Page', template: 'screenplay_standard', desc: 'Initial page containing only the left-aligned FADE IN transition.' },
    { id: 'screenplay_standard', name: 'Standard Script Scene', template: 'screenplay_standard', desc: 'Standard screenwriting page with action, slugline, dialogue elements.' },
    { id: 'screenplay_cast', name: 'Cast List Page', template: 'screenplay_cast', desc: 'Listing of principal characters and their roles.' },
    { id: 'screenplay_toc', name: 'Table of Contents', template: 'screenplay_standard', desc: 'Act-wise index for television pilots and episodic structures.' },
    { id: 'screenplay_act_break', name: 'Act Break Page', template: 'screenplay_act_break', desc: 'Act divider indicator (e.g. END OF ACT ONE).' },
    { id: 'screenplay_revision', name: 'Revision Draft Page', template: 'screenplay_standard', desc: 'Colored revision draft layout with header dates.' },
    { id: 'screenplay_fade_out', name: 'FADE OUT Page', template: 'screenplay_standard', desc: 'Ending transition page showing centered FADE OUT.' },
  ];

  const currentList = isNovel ? novelCategories[activeCategory] : screenplayTypes;

  const handleCreate = () => {
    if (!selectedType) return;
    
    let targetTemplate = 'standard';
    let finalCategory: 'front_matter' | 'body' | 'back_matter' | 'screenplay' = 'body';
    
    if (isNovel) {
      finalCategory = activeCategory;
      const found = novelCategories[activeCategory].find(n => n.id === selectedType);
      if (found) targetTemplate = found.template;
    } else {
      finalCategory = 'screenplay';
      const found = screenplayTypes.find(s => s.id === selectedType);
      if (found) targetTemplate = found.template;
    }

    onConfirm(targetTemplate, finalCategory, selectedType);
  };

  return (
    <div className="modal-backdrop no-print">
      <div className="modal-content" style={{ maxWidth: '620px', width: '90%' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
          <h3 style={{ fontSize: '18px', fontWeight: 600 }}>
            {isNovel
              ? targetCategory === 'front_matter'
                ? 'Create Front Matter Page'
                : targetCategory === 'back_matter'
                ? 'Create Back Matter Page'
                : targetCategory === 'body'
                ? 'Create Chapter Page'
                : 'Create Novel Page Layout'
              : 'Create Screenplay Page Layout'}
          </h3>
          <button className="btn-icon-only" onClick={onCancel} style={{ padding: '4px' }}>
            <X size={16} />
          </button>
        </div>

        {isNovel && !targetCategory && (
          <div style={{ display: 'flex', gap: '4px', background: 'rgba(255,255,255,0.02)', padding: '2px', borderRadius: '6px', border: '1px solid var(--border-color)', marginBottom: '16px' }}>
            {(['front_matter', 'body', 'back_matter'] as const).map((cat) => (
              <button
                key={cat}
                type="button"
                className={`btn ${activeCategory === cat ? 'btn-primary' : 'btn-secondary'}`}
                style={{ flexGrow: 1, padding: '6px 12px', fontSize: '12px', border: 'none' }}
                onClick={() => {
                  setActiveCategory(cat);
                  let defaultType = '';
                  if (cat === 'body') defaultType = 'standard_prose';
                  else if (cat === 'front_matter') defaultType = 'full_title';
                  else if (cat === 'back_matter') defaultType = 'epilogue';
                  else defaultType = '';
                  setSelectedType(defaultType);
                }}
              >
                {cat === 'front_matter' && 'Front Matter'}
                {cat === 'body' && 'Main Body'}
                {cat === 'back_matter' && 'Back Matter'}
              </button>
            ))}
          </div>
        )}

        <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '12px', lineHeight: 1.4 }}>
          Select the specific page type structure. The editor will apply appropriate style presets and layouts.
        </p>

        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr',
          gap: '8px',
          maxHeight: '320px',
          overflowY: 'auto',
          paddingRight: '4px',
          marginBottom: '20px'
        }}>
          {currentList.map((item) => {
            const isUniqueAndExists = ['toc', 'copyright', 'screenplay_title', 'screenplay_fade_in', 'screenplay_fade_out'].includes(item.id) && existingPageTypes.includes(item.id);
            return (
              <div
                key={item.id}
                onClick={() => !isUniqueAndExists && setSelectedType(item.id)}
                style={{
                  padding: '12px 14px',
                  borderRadius: '8px',
                  border: `1.5px solid ${selectedType === item.id ? 'var(--accent-primary)' : 'var(--border-color)'}`,
                  background: selectedType === item.id ? 'var(--accent-glow)' : 'rgba(255,255,255,0.01)',
                  cursor: isUniqueAndExists ? 'not-allowed' : 'pointer',
                  opacity: isUniqueAndExists ? 0.45 : 1,
                  transition: 'all 0.2s',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  gap: '12px'
                }}
              >
                <div style={{ flexGrow: 1 }}>
                  <h4 style={{ fontSize: '13.5px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '2px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {item.name}
                    {isUniqueAndExists && (
                      <span style={{ fontSize: '9px', background: 'rgba(239, 68, 68, 0.15)', color: '#ef4444', padding: '1px 5px', borderRadius: '4px', border: '1px solid rgba(239, 68, 68, 0.2)', fontWeight: 600 }}>
                        Already Exists
                      </span>
                    )}
                  </h4>
                  <p style={{ fontSize: '11.5px', color: 'var(--text-secondary)', lineHeight: 1.35 }}>
                    {item.desc}
                  </p>
                </div>
                
                <div style={{
                  fontSize: '10px',
                  background: selectedType === item.id ? 'var(--accent-primary)' : 'rgba(255,255,255,0.05)',
                  color: selectedType === item.id ? 'white' : 'var(--text-secondary)',
                  padding: '3px 8px',
                  borderRadius: '4px',
                  whiteSpace: 'nowrap',
                  fontWeight: 500,
                  textTransform: 'uppercase'
                }}>
                  {isUniqueAndExists ? 'Disabled' : item.template}
                </div>
              </div>
            );
          })}
        </div>

        <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
          <button type="button" className="btn btn-secondary" onClick={onCancel}>
            Cancel
          </button>
          <button
            type="button"
            className="btn btn-primary"
            disabled={!selectedType || isSelectedTypeUniqueAndExists}
            onClick={handleCreate}
          >
            Create Page
          </button>
        </div>
      </div>
    </div>
  );
};

// --- 4. ImageCropModal Props & Component ---
interface ImageCropModalProps {
  isOpen: boolean;
  imageSrc: string;
  onConfirm: (croppedDataBase64: string) => void;
  onCancel: () => void;
}

export const ImageCropModal: React.FC<ImageCropModalProps> = ({
  isOpen,
  imageSrc,
  onConfirm,
  onCancel,
}) => {
  const [left, setLeft] = useState(15);
  const [top, setTop] = useState(15);
  const [width, setWidth] = useState(70);
  const [height, setHeight] = useState(70);
  const [aspectRatio, setAspectRatio] = useState<'free' | '1:1' | '4:3' | '16:9'>('free');
  const [imgAspectRatio, setImgAspectRatio] = useState<number>(1);

  const imgRef = React.useRef<HTMLImageElement | null>(null);
  const setImgRef = React.useCallback((node: HTMLImageElement | null) => {
    imgRef.current = node;
    if (node) {
      const check = () => {
        if (node.naturalHeight > 0) {
          setImgAspectRatio(node.naturalWidth / node.naturalHeight);
        }
      };
      if (node.complete) {
        check();
      } else {
        node.onload = check;
      }
    }
  }, [imageSrc]);

  React.useEffect(() => {
    if (isOpen) {
      setLeft(15);
      setTop(15);
      setWidth(70);
      setHeight(70);
      setAspectRatio('free');
      setImgAspectRatio(1);
    }
  }, [isOpen, imageSrc]);

  const [dragStart, setDragStart] = useState<{
    x: number;
    y: number;
    startLeft: number;
    startTop: number;
    startWidth: number;
    startHeight: number;
    handle: string;
  } | null>(null);

  const handleMouseDown = (e: React.MouseEvent, handle: string) => {
    e.preventDefault();
    e.stopPropagation();
    const img = imgRef.current;
    if (!img) return;

    setDragStart({
      x: e.clientX,
      y: e.clientY,
      startLeft: left,
      startTop: top,
      startWidth: width,
      startHeight: height,
      handle: handle
    });
  };

  React.useEffect(() => {
    if (!dragStart) return;

    const handleMouseMove = (e: MouseEvent) => {
      const img = imgRef.current;
      if (!img) return;

      const rect = img.getBoundingClientRect();
      const deltaX = ((e.clientX - dragStart.x) / rect.width) * 100;
      const deltaY = ((e.clientY - dragStart.y) / rect.height) * 100;

      if (dragStart.handle === 'move') {
        let newLeft = dragStart.startLeft + deltaX;
        let newTop = dragStart.startTop + deltaY;

        newLeft = Math.max(0, Math.min(newLeft, 100 - dragStart.startWidth));
        newTop = Math.max(0, Math.min(newTop, 100 - dragStart.startHeight));

        setLeft(Math.round(newLeft));
        setTop(Math.round(newTop));
      } else {
        let newLeft = dragStart.startLeft;
        let newTop = dragStart.startTop;
        let newWidth = dragStart.startWidth;
        let newHeight = dragStart.startHeight;

        if (dragStart.handle.includes('right')) {
          newWidth = Math.max(10, Math.min(dragStart.startWidth + deltaX, 100 - dragStart.startLeft));
        }
        if (dragStart.handle.includes('bottom')) {
          newHeight = Math.max(10, Math.min(dragStart.startHeight + deltaY, 100 - dragStart.startTop));
        }
        if (dragStart.handle.includes('left')) {
          const maxLeftChange = dragStart.startWidth - 10;
          const actualDeltaX = Math.max(-dragStart.startLeft, Math.min(deltaX, maxLeftChange));
          newLeft = dragStart.startLeft + actualDeltaX;
          newWidth = dragStart.startWidth - actualDeltaX;
        }
        if (dragStart.handle.includes('top')) {
          const maxTopChange = dragStart.startHeight - 10;
          const actualDeltaY = Math.max(-dragStart.startTop, Math.min(deltaY, maxTopChange));
          newTop = dragStart.startTop + actualDeltaY;
          newHeight = dragStart.startHeight - actualDeltaY;
        }

        if (aspectRatio !== 'free') {
          let targetRatio = 1;
          if (aspectRatio === '4:3') targetRatio = 4 / 3;
          else if (aspectRatio === '16:9') targetRatio = 16 / 9;

          if (dragStart.handle === 'top' || dragStart.handle === 'bottom') {
            newWidth = (newHeight * targetRatio) / imgAspectRatio;
            if (newWidth > 100 - newLeft) {
              newWidth = 100 - newLeft;
              newHeight = (newWidth * imgAspectRatio) / targetRatio;
            }
          } else {
            newHeight = (newWidth * imgAspectRatio) / targetRatio;
            if (newHeight > 100 - newTop) {
              newHeight = 100 - newTop;
              newWidth = (newHeight * targetRatio) / imgAspectRatio;
            }
          }
        }

        setLeft(Math.round(newLeft));
        setTop(Math.round(newTop));
        setWidth(Math.round(newWidth));
        setHeight(Math.round(newHeight));
      }
    };

    const handleMouseUp = () => {
      setDragStart(null);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [dragStart, aspectRatio, imgAspectRatio]);

  // Keep aspect ratio constraint in sync
  React.useEffect(() => {
    if (aspectRatio !== 'free') {
      let targetRatio = 1;
      if (aspectRatio === '4:3') targetRatio = 4 / 3;
      else if (aspectRatio === '16:9') targetRatio = 16 / 9;

      let newHeight = (width * imgAspectRatio) / targetRatio;
      let newWidth = width;

      const maxW = 100 - left;
      const maxH = 100 - top;

      if (newHeight > maxH) {
        newHeight = maxH;
        newWidth = (newHeight * targetRatio) / imgAspectRatio;
      }

      if (newWidth > maxW) {
        newWidth = maxW;
        newHeight = (newWidth * imgAspectRatio) / targetRatio;
      }

      setWidth(Math.max(10, Math.round(newWidth)));
      setHeight(Math.max(10, Math.round(newHeight)));
    }
  }, [imgAspectRatio, aspectRatio]);

  if (!isOpen) return null;

  const handleAspectRatioChange = (ratio: 'free' | '1:1' | '4:3' | '16:9') => {
    setAspectRatio(ratio);
  };

  const handleWidthChange = (newWidth: number) => {
    const maxW = 100 - left;
    const finalW = Math.min(newWidth, maxW);
    setWidth(finalW);
    
    if (aspectRatio !== 'free') {
      let targetRatio = 1;
      if (aspectRatio === '4:3') targetRatio = 4 / 3;
      else if (aspectRatio === '16:9') targetRatio = 16 / 9;

      let newH = (finalW * imgAspectRatio) / targetRatio;
      const maxH = 100 - top;
      if (newH > maxH) {
        newH = maxH;
        const adjustedW = (newH * targetRatio) / imgAspectRatio;
        setWidth(Math.max(10, Math.round(adjustedW)));
      }
      setHeight(Math.max(10, Math.round(newH)));
    }
  };

  const handleHeightChange = (newHeight: number) => {
    const maxH = 100 - top;
    const finalH = Math.min(newHeight, maxH);
    setHeight(finalH);

    if (aspectRatio !== 'free') {
      let targetRatio = 1;
      if (aspectRatio === '4:3') targetRatio = 4 / 3;
      else if (aspectRatio === '16:9') targetRatio = 16 / 9;

      let newW = (finalH * targetRatio) / imgAspectRatio;
      const maxW = 100 - left;
      if (newW > maxW) {
        newW = maxW;
        const adjustedH = (newW * imgAspectRatio) / targetRatio;
        setHeight(Math.max(10, Math.round(adjustedH)));
      }
      setWidth(Math.max(10, Math.round(newW)));
    }
  };

  const handleLeftChange = (newLeft: number) => {
    const finalLeft = Math.min(newLeft, 100 - width);
    setLeft(finalLeft);
  };

  const handleTopChange = (newTop: number) => {
    const finalTop = Math.min(newTop, 100 - height);
    setTop(finalTop);
  };

  const handleCrop = () => {
    const img = imgRef.current;
    if (!img) {
      console.warn('[ImageCropModal] handleCrop called but imgRef.current is null!');
      return;
    }

    try {
      // Create canvas to crop image
      const canvas = document.createElement('canvas');
      const sourceX = Math.round((img.naturalWidth * left) / 100);
      const sourceY = Math.round((img.naturalHeight * top) / 100);
      const sourceWidth = Math.round((img.naturalWidth * width) / 100);
      const sourceHeight = Math.round((img.naturalHeight * height) / 100);

      console.log('[ImageCropModal] Cropping dimensions:', {
        naturalWidth: img.naturalWidth,
        naturalHeight: img.naturalHeight,
        left,
        top,
        width,
        height,
        sourceX,
        sourceY,
        sourceWidth,
        sourceHeight
      });

      if (sourceWidth <= 0 || sourceHeight <= 0) {
        console.warn('[ImageCropModal] Crop width or height is zero or negative!');
        return;
      }

      canvas.width = sourceWidth;
      canvas.height = sourceHeight;

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        console.error('[ImageCropModal] Failed to get canvas 2d context!');
        return;
      }

      ctx.drawImage(
        img,
        sourceX,
        sourceY,
        sourceWidth,
        sourceHeight,
        0,
        0,
        sourceWidth,
        sourceHeight
      );

      const croppedBase64 = canvas.toDataURL('image/jpeg', 0.85);
      console.log('[ImageCropModal] Crop successful! Calling onConfirm...');
      onConfirm(croppedBase64);
    } catch (error) {
      console.error('[ImageCropModal] Exception occurred during cropping:', error);
    }
  };

  return (
    <div className="modal-backdrop no-print" style={{ zIndex: 1100 }}>
      <div className="modal-content" style={{ maxWidth: '580px', width: '90%', padding: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h3 style={{ fontSize: '18px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Crop size={18} style={{ color: 'var(--accent-primary)' }} /> Crop Image
          </h3>
          <button className="btn-icon-only" onClick={onCancel} style={{ padding: '4px' }}>
            <X size={16} />
          </button>
        </div>

        {/* Image Preview Window */}
        <div style={{ 
          position: 'relative', 
          overflow: 'hidden', 
          display: 'flex', 
          justifyContent: 'center', 
          background: '#0d0d0d', 
          borderRadius: '8px', 
          padding: '16px', 
          marginBottom: '20px', 
          maxHeight: '380px',
          border: '1px solid var(--border-color)',
          userSelect: 'none' 
        }}>
          <div style={{ position: 'relative', display: 'inline-block' }}>
            <img
              ref={setImgRef}
              src={imageSrc}
              alt="Source Crop"
              crossOrigin="anonymous"
              style={{ maxWidth: '100%', maxHeight: '320px', display: 'block', opacity: 0.45 }}
            />
            
            {/* Dashed viewfinder overlay showing cropped region (fully draggable/resizable) */}
            <div
              style={{
                position: 'absolute',
                left: `${left}%`,
                top: `${top}%`,
                width: `${width}%`,
                height: `${height}%`,
                border: '2px dashed var(--accent-primary)',
                boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.7)',
                borderRadius: '2px',
                cursor: 'move',
                zIndex: 5
              }}
              onMouseDown={(e) => handleMouseDown(e, 'move')}
            >
              {/* Rule of Thirds view-finder grid */}
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr 1fr',
                  gridTemplateRows: '1fr 1fr 1fr',
                  pointerEvents: 'none',
                  opacity: 0.3
                }}
              >
                <div style={{ borderRight: '1px dashed #fff', borderBottom: '1px dashed #fff' }} />
                <div style={{ borderRight: '1px dashed #fff', borderBottom: '1px dashed #fff' }} />
                <div style={{ borderBottom: '1px dashed #fff' }} />
                <div style={{ borderRight: '1px dashed #fff', borderBottom: '1px dashed #fff' }} />
                <div style={{ borderRight: '1px dashed #fff', borderBottom: '1px dashed #fff' }} />
                <div style={{ borderBottom: '1px dashed #fff' }} />
                <div style={{ borderRight: '1px dashed #fff' }} />
                <div style={{ borderRight: '1px dashed #fff' }} />
                <div />
              </div>

              {/* Corner Handles */}
              <div
                style={{
                  position: 'absolute',
                  top: '-6px',
                  left: '-6px',
                  width: '12px',
                  height: '12px',
                  background: 'var(--accent-primary)',
                  border: '2px solid white',
                  borderRadius: '50%',
                  cursor: 'nwse-resize',
                  zIndex: 10
                }}
                onMouseDown={(e) => handleMouseDown(e, 'top-left')}
              />
              <div
                style={{
                  position: 'absolute',
                  top: '-6px',
                  right: '-6px',
                  width: '12px',
                  height: '12px',
                  background: 'var(--accent-primary)',
                  border: '2px solid white',
                  borderRadius: '50%',
                  cursor: 'nesw-resize',
                  zIndex: 10
                }}
                onMouseDown={(e) => handleMouseDown(e, 'top-right')}
              />
              <div
                style={{
                  position: 'absolute',
                  bottom: '-6px',
                  left: '-6px',
                  width: '12px',
                  height: '12px',
                  background: 'var(--accent-primary)',
                  border: '2px solid white',
                  borderRadius: '50%',
                  cursor: 'nesw-resize',
                  zIndex: 10
                }}
                onMouseDown={(e) => handleMouseDown(e, 'bottom-left')}
              />
              <div
                style={{
                  position: 'absolute',
                  bottom: '-6px',
                  right: '-6px',
                  width: '12px',
                  height: '12px',
                  background: 'var(--accent-primary)',
                  border: '2px solid white',
                  borderRadius: '50%',
                  cursor: 'nwse-resize',
                  zIndex: 10
                }}
                onMouseDown={(e) => handleMouseDown(e, 'bottom-right')}
              />

              {/* Edge Handles (only shown in Free Form mode) */}
              {aspectRatio === 'free' && (
                <>
                  <div
                    style={{
                      position: 'absolute',
                      top: '-4px',
                      left: '50%',
                      transform: 'translateX(-50%)',
                      width: '18px',
                      height: '8px',
                      background: 'var(--accent-primary)',
                      border: '1.5px solid white',
                      borderRadius: '3px',
                      cursor: 'ns-resize',
                      zIndex: 10
                    }}
                    onMouseDown={(e) => handleMouseDown(e, 'top')}
                  />
                  <div
                    style={{
                      position: 'absolute',
                      bottom: '-4px',
                      left: '50%',
                      transform: 'translateX(-50%)',
                      width: '18px',
                      height: '8px',
                      background: 'var(--accent-primary)',
                      border: '1.5px solid white',
                      borderRadius: '3px',
                      cursor: 'ns-resize',
                      zIndex: 10
                    }}
                    onMouseDown={(e) => handleMouseDown(e, 'bottom')}
                  />
                  <div
                    style={{
                      position: 'absolute',
                      top: '50%',
                      left: '-4px',
                      transform: 'translateY(-50%)',
                      width: '8px',
                      height: '18px',
                      background: 'var(--accent-primary)',
                      border: '1.5px solid white',
                      borderRadius: '3px',
                      cursor: 'ew-resize',
                      zIndex: 10
                    }}
                    onMouseDown={(e) => handleMouseDown(e, 'left')}
                  />
                  <div
                    style={{
                      position: 'absolute',
                      top: '50%',
                      right: '-4px',
                      transform: 'translateY(-50%)',
                      width: '8px',
                      height: '18px',
                      background: 'var(--accent-primary)',
                      border: '1.5px solid white',
                      borderRadius: '3px',
                      cursor: 'ew-resize',
                      zIndex: 10
                    }}
                    onMouseDown={(e) => handleMouseDown(e, 'right')}
                  />
                </>
              )}
            </div>
          </div>
        </div>

        {/* Aspect Ratio Presets */}
        <div style={{ marginBottom: '16px' }}>
          <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', display: 'block', marginBottom: '8px' }}>
            Aspect Ratio Mode
          </label>
          <div style={{ display: 'flex', gap: '8px' }}>
            {(['free', '1:1', '4:3', '16:9'] as const).map((ratio) => (
              <button
                key={ratio}
                type="button"
                className={`btn ${aspectRatio === ratio ? 'btn-primary' : 'btn-secondary'}`}
                style={{ flex: 1, fontSize: '12px', padding: '6px 12px', textTransform: 'capitalize' }}
                onClick={() => handleAspectRatioChange(ratio)}
              >
                {ratio === 'free' ? 'Free Form' : ratio}
              </button>
            ))}
          </div>
        </div>

        {/* Sliders for Crop Boundaries */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '24px' }}>
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
              <label style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Left Position</label>
              <span style={{ fontSize: '11px', fontWeight: 600 }}>{left}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="90"
              value={left}
              onChange={(e) => handleLeftChange(parseInt(e.target.value))}
              style={{ width: '100%', accentColor: 'var(--accent-primary)' }}
            />
          </div>

          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
              <label style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Top Position</label>
              <span style={{ fontSize: '11px', fontWeight: 600 }}>{top}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="90"
              value={top}
              onChange={(e) => handleTopChange(parseInt(e.target.value))}
              style={{ width: '100%', accentColor: 'var(--accent-primary)' }}
            />
          </div>

          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
              <label style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Crop Width</label>
              <span style={{ fontSize: '11px', fontWeight: 600 }}>{width}%</span>
            </div>
            <input
              type="range"
              min="10"
              max={100 - left}
              value={width}
              onChange={(e) => handleWidthChange(parseInt(e.target.value))}
              style={{ width: '100%', accentColor: 'var(--accent-primary)' }}
            />
          </div>

          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
              <label style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Crop Height</label>
              <span style={{ fontSize: '11px', fontWeight: 600 }}>{height}%</span>
            </div>
            <input
              type="range"
              min="10"
              max={100 - top}
              value={height}
              onChange={(e) => handleHeightChange(parseInt(e.target.value))}
              style={{ width: '100%', accentColor: 'var(--accent-primary)' }}
            />
          </div>
        </div>

        {/* Modal Buttons */}
        <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
          <button type="button" className="btn btn-secondary" onClick={onCancel}>
            Cancel
          </button>
          <button type="button" className="btn btn-primary" onClick={handleCrop} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Crop size={14} /> Apply Crop
          </button>
        </div>
      </div>
    </div>
  );
};
