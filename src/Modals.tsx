import React, { useState } from 'react';
import { X, AlertTriangle } from 'lucide-react';

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
            background: isDanger ? 'rgba(239, 68, 68, 0.1)' : 'rgba(139, 92, 246, 0.1)',
            color: isDanger ? '#ef4444' : '#8b5cf6',
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
