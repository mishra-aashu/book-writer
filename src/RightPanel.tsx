import React, { useState } from 'react';
import {
  Users, History, Search, Download, Printer, Plus, Trash2, BookMarked,
  AlignLeft, AlignCenter, AlignRight, AlignJustify, Type, Sliders,
  BookOpen, Languages, Film, Laptop, ChevronDown, ChevronRight,
  MessageSquare, FileText, Zap, PenTool, Settings
} from 'lucide-react';
import type {
  BookDetails, Page, PageVersion, SearchResult, Character, ActiveTab,
  ActiveFont, HeaderFont
} from './types';
import { AiAssistantTab } from './AiAssistantTab';

interface ToggleSwitchProps {
  label: string;
  description?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}

const ToggleSwitch: React.FC<ToggleSwitchProps> = ({ label, description, checked, onChange }) => (
  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid rgba(255,255,255,0.02)' }}>
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', paddingRight: '12px' }}>
      <span style={{ fontSize: '12.5px', fontWeight: 500, color: 'var(--text-primary)' }}>{label}</span>
      {description && <span style={{ fontSize: '10.5px', color: 'var(--text-muted)', lineHeight: 1.3 }}>{description}</span>}
    </div>
    <button
      type="button"
      onClick={() => onChange(!checked)}
      style={{
        width: '36px',
        height: '20px',
        borderRadius: '10px',
        background: checked ? 'var(--accent-primary)' : 'rgba(255,255,255,0.1)',
        border: '1px solid var(--border-color)',
        position: 'relative',
        cursor: 'pointer',
        transition: 'all 0.2s ease',
        padding: 0,
        flexShrink: 0
      }}
    >
      <div style={{
        width: '14px',
        height: '14px',
        borderRadius: '50%',
        background: '#ffffff',
        position: 'absolute',
        top: '2px',
        left: checked ? '18px' : '2px',
        transition: 'left 0.2s ease',
        boxShadow: '0 1px 3px rgba(0,0,0,0.3)'
      }} />
    </button>
  </div>
);

interface RightPanelProps {
  width?: number;
  focusMode: boolean;
  activeTab: ActiveTab;
  onSetActiveTab: (tab: ActiveTab) => void;
  activeBookDetails: BookDetails;
  activeRegionKey: string;
  selectedTextExists: boolean;
  onApplySelectionStyle: (styleName: string, value: string) => void;
  // Characters tab
  showCreateCharModal: boolean;
  onOpenCreateCharModal: () => void;
  onCloseCreateCharModal: () => void;
  selectedCharacterId: string | null;
  selectedCharacterMentions: Page[];
  onDeleteCharacter: (id: string, e: React.MouseEvent) => void;
  onLoadCharacterMentions: (charId: string) => void;
  onJumpToPage: (chapterId: string, pageId: string) => void;
  // New character form
  newCharName: string;
  newCharDesc: string;
  newCharKeywords: string;
  onNewCharName: (v: string) => void;
  onNewCharDesc: (v: string) => void;
  onNewCharKeywords: (v: string) => void;
  onSubmitCreateChar: (e: React.FormEvent) => void;
  // Versions tab
  versions: PageVersion[];
  onRestoreVersion: (id: string) => void;
  // Search tab
  searchQuery: string;
  onSetSearchQuery: (v: string) => void;
  searchResults: SearchResult[];
  onTriggerSearch: () => void;
  onJumpToSearchResult: (r: SearchResult) => void;
  // Export tab
  exportPath: string;
  onSetExportPath: (v: string) => void;
  exportMessage: { success: boolean; text: string } | null;
  onExportEpub: () => void;
  onExportDocx: () => void;
  onTriggerPrint: () => void;
  // Typography states
  activeFont: ActiveFont;
  onSetActiveFont: (font: ActiveFont) => void;
  headerFont: HeaderFont;
  onSetHeaderFont: (font: HeaderFont) => void;
  fontSize: number;
  onSetFontSize: (size: number) => void;
  lineHeight: number;
  onSetLineHeight: (lh: number) => void;
  letterSpacing: number;
  onSetLetterSpacing: (ls: number) => void;
  paragraphSpacing: number;
  onSetParagraphSpacing: (ps: number) => void;
  pageHeight: number;
  onSetPageHeight: (h: number) => void;
  pagePadding: number;
  onSetPagePadding: (p: number) => void;
  limitEnabled: boolean;
  onSetLimitEnabled: (b: boolean) => void;
  limitType: 'words' | 'chars';
  onSetLimitType: (t: 'words' | 'chars') => void;
  limitValue: number;
  onSetLimitValue: (v: number) => void;
  activePageId?: string | null;
  editorialNotes?: any[];
  newCommentAnchor?: {
    commentId: string;
    selectedText: string;
    textOffset: number;
    textLength: number;
    regionKey: string;
  } | null;
  onCancelComment?: () => void;
  onSubmitComment?: (commentText: string, authorName: string) => void;
  onToggleResolveNote?: (noteId: string, resolvedVal: number) => void;
  onDeleteNote?: (noteId: string) => void;
  smartCap: boolean;
  onSetSmartCap: (b: boolean) => void;
  smartI: boolean;
  onSetSmartI: (b: boolean) => void;
  smartSpace: boolean;
  onSetSmartSpace: (b: boolean) => void;
  selectedText: string;
  onReplaceSelection: (newText: string) => void;
  onAppendToActivePage: (newText: string) => void;
  pageContent: Record<string, string>;
}

const RightPanel: React.FC<RightPanelProps> = ({
  width = 360,
  focusMode,
  activeTab,
  onSetActiveTab,
  activeBookDetails,
  activeRegionKey,
  selectedTextExists,
  onApplySelectionStyle,
  showCreateCharModal,
  onOpenCreateCharModal,
  onCloseCreateCharModal,
  selectedCharacterId,
  selectedCharacterMentions,
  onDeleteCharacter,
  onLoadCharacterMentions,
  onJumpToPage,
  newCharName,
  newCharDesc,
  newCharKeywords,
  onNewCharName,
  onNewCharDesc,
  onNewCharKeywords,
  onSubmitCreateChar,
  versions,
  onRestoreVersion,
  searchQuery,
  onSetSearchQuery,
  searchResults,
  onTriggerSearch,
  onJumpToSearchResult,
  exportPath,
  onSetExportPath,
  exportMessage,
  onExportEpub,
  onExportDocx,
  onTriggerPrint,
  activeFont,
  onSetActiveFont,
  headerFont,
  onSetHeaderFont,
  fontSize,
  onSetFontSize,
  lineHeight,
  onSetLineHeight,
  letterSpacing,
  onSetLetterSpacing,
  paragraphSpacing,
  onSetParagraphSpacing,
  pageHeight,
  onSetPageHeight,
  pagePadding,
  onSetPagePadding,
  limitEnabled: _limitEnabled,
  onSetLimitEnabled: _onSetLimitEnabled,
  limitType: _limitType,
  onSetLimitType: _onSetLimitType,
  limitValue: _limitValue,
  onSetLimitValue: _onSetLimitValue,
  activePageId,
  editorialNotes = [],
  newCommentAnchor,
  onCancelComment,
  onSubmitComment,
  onToggleResolveNote,
  onDeleteNote,
  smartCap,
  onSetSmartCap,
  smartI,
  onSetSmartI,
  smartSpace,
  onSetSmartSpace,
  selectedText,
  onReplaceSelection,
  onAppendToActivePage,
  pageContent,
}) => {
  const [typographyExpanded, setTypographyExpanded] = useState(true);
  const [pageSetupExpanded, setPageSetupExpanded] = useState(false);
  const [fontTarget, setFontTarget] = useState<'body' | 'header'>('body');


  if (focusMode) return null;

  return (
    <>
      <div className="right-sidebar no-print" style={{ width: `${width}px`, minWidth: `${width}px` }}>
        {/* Tab Buttons */}
        <div className="tab-buttons">
          <button className={`tab-btn ${activeTab === 'write' ? 'active' : ''}`} onClick={() => onSetActiveTab('write')} title="Text">
            <Type size={16} /> <span>Text</span>
          </button>
          <button className={`tab-btn ${activeTab === 'ai' ? 'active' : ''}`} onClick={() => onSetActiveTab('ai')} title="AI Writer">
            <Zap size={16} /> <span>AI Writer</span>
          </button>
          <button className={`tab-btn ${activeTab === 'characters' ? 'active' : ''}`} onClick={() => onSetActiveTab('characters')} title="Characters">
            <Users size={16} /> <span>Characters</span>
          </button>
          <button className={`tab-btn ${activeTab === 'versions' ? 'active' : ''}`} onClick={() => onSetActiveTab('versions')} title="Snapshots">
            <History size={16} /> <span>Snapshots</span>
          </button>
          <button className={`tab-btn ${activeTab === 'search' ? 'active' : ''}`} onClick={() => onSetActiveTab('search')} title="Search">
            <Search size={16} /> <span>Search</span>
          </button>
          <button className={`tab-btn ${activeTab === 'export' ? 'active' : ''}`} onClick={() => onSetActiveTab('export')} title="Export">
            <Download size={16} /> <span>Export</span>
          </button>
          <button className={`tab-btn ${activeTab === 'comments' ? 'active' : ''}`} onClick={() => onSetActiveTab('comments')} title="Comments">
            <MessageSquare size={16} /> <span>Comments</span>
          </button>
        </div>

        <div className={`tab-content ${activeTab === 'ai' ? 'ai-tab-content' : ''}`}>
          {/* ── Tab 1: Book Info / Text Formatting ── */}
          {activeTab === 'write' && (
            <div>
              {selectedTextExists ? (
                /* Formatting Inspector widget inside the active tab content space */
                <div style={{
                  background: 'rgba(255, 255, 255, 0.01)',
                  animation: 'fadeInDown 0.25s ease-out',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Type size={13} style={{ color: 'var(--accent-primary)' }} />
                    <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      Format Selected Text
                    </span>
                  </div>

                  {/* Style & Alignment row */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <button
                      type="button"
                      className="formatting-btn"
                      style={{ width: '32px', fontWeight: 'bold' }}
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => onApplySelectionStyle('bold', '')}
                    >
                      B
                    </button>
                    <button
                      type="button"
                      className="formatting-btn"
                      style={{ width: '32px', fontStyle: 'italic' }}
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => onApplySelectionStyle('italic', '')}
                    >
                      I
                    </button>
                    <button
                      type="button"
                      className="formatting-btn"
                      style={{ width: '32px', textDecoration: 'underline' }}
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => onApplySelectionStyle('underline', '')}
                    >
                      U
                    </button>

                    <div style={{ width: '1px', height: '20px', background: 'var(--border-color)', margin: '0 4px' }} />

                    <button
                      type="button"
                      className="formatting-btn"
                      style={{ width: '32px' }}
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => onApplySelectionStyle('justifyLeft', '')}
                      title="Align Left"
                    >
                      <AlignLeft size={13} />
                    </button>
                    <button
                      type="button"
                      className="formatting-btn"
                      style={{ width: '32px' }}
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => onApplySelectionStyle('justifyCenter', '')}
                      title="Align Center"
                    >
                      <AlignCenter size={13} />
                    </button>
                    <button
                      type="button"
                      className="formatting-btn"
                      style={{ width: '32px' }}
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => onApplySelectionStyle('justifyRight', '')}
                      title="Align Right"
                    >
                      <AlignRight size={13} />
                    </button>
                    <button
                      type="button"
                      className="formatting-btn"
                      style={{ width: '32px' }}
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => onApplySelectionStyle('justifyFull', '')}
                      title="Justify"
                    >
                      <AlignJustify size={13} />
                    </button>
                  </div>

                  {/* Typography selectors row */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <label style={{ fontSize: '9px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Size</label>
                      <select
                        className="formatting-select"
                        defaultValue=""
                        onChange={(e) => {
                          if (e.target.value) {
                            onApplySelectionStyle('fontSize', e.target.value);
                            e.target.value = '';
                          }
                        }}
                      >
                        <option value="" disabled>Size...</option>
                        <option value="12px">12px</option>
                        <option value="14px">14px</option>
                        <option value="16px">16px</option>
                        <option value="18px">18px</option>
                        <option value="20px">20px</option>
                        <option value="24px">24px</option>
                        <option value="28px">28px</option>
                      </select>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <label style={{ fontSize: '9px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Color</label>
                      <select
                        className="formatting-select"
                        defaultValue=""
                        onChange={(e) => {
                          if (e.target.value) {
                            onApplySelectionStyle('color', e.target.value);
                            e.target.value = '';
                          }
                        }}
                      >
                        <option value="" disabled>Color...</option>
                        <option value="var(--text-primary)">Default</option>
                        <option value="#c084fc">Purple</option>
                        <option value="#f87171">Red</option>
                        <option value="#34d399">Green</option>
                        <option value="#fbbf24">Amber</option>
                      </select>
                    </div>
                  </div>
                </div>
              ) : (
                <div>
                  {/* ── Global Typography Section ── */}
                  <div>
                <button
                  type="button"
                  onClick={() => setTypographyExpanded(!typographyExpanded)}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0 0 12px 0',
                    color: 'var(--text-primary)',
                    cursor: 'pointer',
                    textAlign: 'left'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Sliders size={14} style={{ color: 'var(--accent-primary)' }} />
                    <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      Global Typography
                    </span>
                  </div>
                  {typographyExpanded ? <ChevronDown size={14} style={{ color: 'var(--text-secondary)' }} /> : <ChevronRight size={14} style={{ color: 'var(--text-secondary)' }} />}
                </button>

                {typographyExpanded && (
                  <div className="typography-tab-container" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    {/* Presets Grid */}
                    <div>
                      <h4 style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.5px', marginBottom: '8px' }}>
                        Quick Font Themes
                      </h4>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {[
                          {
                            id: 'classic-novel',
                            label: 'Classic Novel',
                            description: 'EB Garamond & Playfair Display. Standard print book feel.',
                            icon: BookOpen,
                            bodyFont: 'garamond' as ActiveFont,
                            headerFont: 'playfair' as HeaderFont,
                            fontSize: 18,
                            lineHeight: 1.65,
                            letterSpacing: 0,
                            paragraphSpacing: 0.8
                          },
                          {
                            id: 'modern-literary',
                            label: 'Modern Literary',
                            description: 'Crimson Pro & Cormorant. Sleek screen-tailored serif.',
                            icon: PenTool,
                            bodyFont: 'crimson-pro' as ActiveFont,
                            headerFont: 'cormorant' as HeaderFont,
                            fontSize: 17,
                            lineHeight: 1.7,
                            letterSpacing: 0.01,
                            paragraphSpacing: 0.6
                          },
                          {
                            id: 'hindi-prose',
                            label: 'Hindi Literary (Devanagari)',
                            description: 'Noto Serif Devanagari & Playfair. Eye-friendly prose.',
                            icon: Languages,
                            bodyFont: 'noto-serif' as ActiveFont,
                            headerFont: 'playfair' as HeaderFont,
                            fontSize: 18,
                            lineHeight: 1.8,
                            letterSpacing: 0,
                            paragraphSpacing: 0.5
                          },
                          {
                            id: 'screenplay-mode',
                            label: 'Screenplay standard',
                            description: 'Courier Prime. Industry-standard screenplay layout.',
                            icon: Film,
                            bodyFont: 'courier' as ActiveFont,
                            headerFont: 'garamond' as HeaderFont,
                            fontSize: 14,
                            lineHeight: 1.4,
                            letterSpacing: 0.05,
                            paragraphSpacing: 0.4
                          },
                          {
                            id: 'clean-minimal',
                            label: 'Clean & Minimal',
                            description: 'Merriweather & Lora. Screen optimized slab feel.',
                            icon: Laptop,
                            bodyFont: 'merriweather' as ActiveFont,
                            headerFont: 'lora' as HeaderFont,
                            fontSize: 16,
                            lineHeight: 1.6,
                            letterSpacing: 0,
                            paragraphSpacing: 1.0
                          }
                        ].map((preset) => {
                          const isMatched = activeFont === preset.bodyFont && headerFont === preset.headerFont && fontSize === preset.fontSize && lineHeight === preset.lineHeight && letterSpacing === preset.letterSpacing;
                          return (
                            <div
                              key={preset.id}
                              className={`font-preset-card ${isMatched ? 'active' : ''}`}
                              onClick={() => {
                                onSetActiveFont(preset.bodyFont);
                                onSetHeaderFont(preset.headerFont);
                                onSetFontSize(preset.fontSize);
                                onSetLineHeight(preset.lineHeight);
                                onSetLetterSpacing(preset.letterSpacing);
                                onSetParagraphSpacing(preset.paragraphSpacing);
                              }}
                              style={{
                                background: 'rgba(255, 255, 255, 0.02)',
                                border: `1px solid ${isMatched ? 'var(--accent-primary)' : 'var(--border-color)'}`,
                                padding: '10px 12px',
                                borderRadius: '6px',
                                cursor: 'pointer',
                                transition: 'all 0.2s',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '10px'
                              }}
                            >
                              <span style={{ display: 'flex', alignItems: 'center', color: 'var(--accent-primary)' }}>
                                <preset.icon size={18} />
                              </span>
                              <div style={{ flexGrow: 1 }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                  <span style={{ fontSize: '12.5px', fontWeight: 600, color: 'var(--text-primary)' }}>{preset.label}</span>
                                  {isMatched && <span className="font-preview-badge" style={{ fontSize: '9px', background: 'var(--accent-glow)', color: 'var(--accent-secondary)', padding: '1px 5px', borderRadius: '3px', fontWeight: 600 }}>Active</span>}
                                </div>
                                <span style={{ fontSize: '10.5px', color: 'var(--text-secondary)', display: 'block', marginTop: '2px', lineHeight: 1.3 }}>{preset.description}</span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Detailed Font Controls */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>

                      {/* Font Target Toggle */}
                      <div style={{ display: 'flex', background: 'rgba(255,255,255,0.03)', borderRadius: '6px', padding: '2px', border: '1px solid var(--border-color)' }}>
                        <button
                          type="button"
                          onClick={() => setFontTarget('body')}
                          style={{
                            flex: 1,
                            background: fontTarget === 'body' ? 'var(--accent-primary)' : 'transparent',
                            color: fontTarget === 'body' ? '#ffffff' : 'var(--text-secondary)',
                            border: 'none',
                            borderRadius: '4px',
                            padding: '6px 0',
                            fontSize: '11px',
                            fontWeight: 600,
                            cursor: 'pointer',
                            transition: 'all 0.15s'
                          }}
                        >
                          Body Prose
                        </button>
                        <button
                          type="button"
                          onClick={() => setFontTarget('header')}
                          style={{
                            flex: 1,
                            background: fontTarget === 'header' ? 'var(--accent-primary)' : 'transparent',
                            color: fontTarget === 'header' ? '#ffffff' : 'var(--text-secondary)',
                            border: 'none',
                            borderRadius: '4px',
                            padding: '6px 0',
                            fontSize: '11px',
                            fontWeight: 600,
                            cursor: 'pointer',
                            transition: 'all 0.15s'
                          }}
                        >
                          Chapter Headers
                        </button>
                      </div>

                      {fontTarget === 'body' ? (
                        /* Body Font Selection */
                        <div>
                          <label style={{ display: 'block', fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600, letterSpacing: '0.5px', marginBottom: '6px' }}>
                            Body / Prose Font
                          </label>
                          <select
                            className="select"
                            style={{ width: '100%', padding: '8px', fontSize: '13px' }}
                            value={activeFont}
                            onChange={(e) => onSetActiveFont(e.target.value as ActiveFont)}
                          >
                            <optgroup label="── Prose Serifs ──">
                              <option value="garamond">EB Garamond — Classic Print</option>
                              <option value="lora">Lora — Modern Warm</option>
                              <option value="merriweather">Merriweather — Screen-Optimized</option>
                              <option value="crimson-pro">Crimson Pro — Literary</option>
                              <option value="bitter">Bitter — Slab Serif</option>
                            </optgroup>
                            <optgroup label="── Devanagari / Hindi ──">
                              <option value="noto-serif">Noto Serif Devanagari</option>
                              <option value="tiro-devanagari">Tiro Devanagari Hindi</option>
                            </optgroup>
                            <optgroup label="── Special ──">
                              <option value="courier">Courier Prime — Screenplay</option>
                              <option value="caveat">Caveat — Handwritten</option>
                              <option value="kalam">Kalam — Hindi Handwritten</option>
                            </optgroup>
                          </select>
                        </div>
                      ) : (
                        /* Chapter Display Font */
                        <div>
                          <label style={{ display: 'block', fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600, letterSpacing: '0.5px', marginBottom: '6px' }}>
                            Chapter Headers Font
                          </label>
                          <select
                            className="select"
                            style={{ width: '100%', padding: '8px', fontSize: '13px' }}
                            value={headerFont}
                            onChange={(e) => onSetHeaderFont(e.target.value as HeaderFont)}
                          >
                            <optgroup label="── Display Fonts ──">
                              <option value="playfair">Playfair Display — Elegant</option>
                              <option value="cormorant">Cormorant Garamond — Thin & Luxury</option>
                              <option value="cinzel">Cinzel — Fantasy / Historical</option>
                              <option value="rajdhani">Rajdhani — Sci-Fi / Tech</option>
                            </optgroup>
                            <optgroup label="── Match / Fallbacks ──">
                              <option value="garamond">EB Garamond — Matched Prose</option>
                              <option value="lora">Lora — Warm Match</option>
                              <option value="caveat">Caveat — Handwritten Style</option>
                            </optgroup>
                          </select>
                        </div>
                      )}

                      {/* Size & Spacing section (flat, un-nested layout) */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>

                        {/* Font Size */}
                        <div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                            <span style={{ fontSize: '11.5px', color: 'var(--text-secondary)' }}>Font Size</span>
                            <span style={{ fontSize: '11.5px', fontWeight: 600, color: 'var(--accent-secondary)' }}>{fontSize}px</span>
                          </div>
                          <input
                            type="range" min="12" max="26"
                            value={fontSize}
                            onChange={(e) => onSetFontSize(parseInt(e.target.value))}
                            style={{ width: '100%', accentColor: 'var(--accent-primary)' }}
                          />
                        </div>

                        {/* Line Spacing */}
                        <div>
                          <span style={{ display: 'block', fontSize: '11.5px', color: 'var(--text-secondary)', marginBottom: '6px' }}>Line Spacing</span>
                          <div style={{ display: 'flex', gap: '4px' }}>
                            {[1.2, 1.5, 1.65, 1.8, 2.1].map((val) => (
                              <button
                                key={val}
                                type="button"
                                className={`btn btn-secondary ${lineHeight === val ? 'btn-primary' : ''}`}
                                style={{ flexGrow: 1, padding: '6px 0', fontSize: '10.5px', borderRadius: '4px' }}
                                onClick={() => onSetLineHeight(val)}
                              >
                                {val}x
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Letter Spacing */}
                        <div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                            <span style={{ fontSize: '11.5px', color: 'var(--text-secondary)' }}>Letter Spacing</span>
                            <span style={{ fontSize: '11.5px', fontWeight: 600, color: 'var(--accent-secondary)' }}>{letterSpacing === 0 ? 'Normal' : `+${(letterSpacing * 100).toFixed(0)}%`}</span>
                          </div>
                          <input
                            type="range" min="0" max="0.15" step="0.005"
                            value={letterSpacing}
                            onChange={(e) => onSetLetterSpacing(parseFloat(e.target.value))}
                            style={{ width: '100%', accentColor: 'var(--accent-primary)' }}
                          />
                        </div>

                        {/* Paragraph Spacing */}
                        <div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                            <span style={{ fontSize: '11.5px', color: 'var(--text-secondary)' }}>Paragraph Spacing</span>
                            <span style={{ fontSize: '11.5px', fontWeight: 600, color: 'var(--accent-secondary)' }}>{paragraphSpacing}em</span>
                          </div>
                          <input
                            type="range" min="0" max="2" step="0.1"
                            value={paragraphSpacing}
                            onChange={(e) => onSetParagraphSpacing(parseFloat(e.target.value))}
                            style={{ width: '100%', accentColor: 'var(--accent-primary)' }}
                          />
                        </div>

                      </div>

                    </div>
                  </div>
                )}
              </div>

              {/* ── Page Setup Section ── */}
              <div style={{
                marginTop: '20px',
                borderTop: '1px solid var(--border-color)',
                paddingTop: '20px'
              }}>
                <button
                  type="button"
                  onClick={() => setPageSetupExpanded(!pageSetupExpanded)}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0 0 12px 0',
                    color: 'var(--text-primary)',
                    cursor: 'pointer',
                    textAlign: 'left'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <FileText size={14} style={{ color: 'var(--accent-primary)' }} />
                    <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      Page Setup (Layout)
                    </span>
                  </div>
                  {pageSetupExpanded ? <ChevronDown size={14} style={{ color: 'var(--text-secondary)' }} /> : <ChevronRight size={14} style={{ color: 'var(--text-secondary)' }} />}
                </button>

                {pageSetupExpanded && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', animation: 'fadeInDown 0.25s ease-out' }}>
                    
                    {/* Page Size Preset Selection */}
                    <div>
                      <label style={{ display: 'block', fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600, marginBottom: '6px' }}>
                        Page Size Preset
                      </label>
                      <select
                        className="select"
                        style={{ width: '100%', padding: '8px', fontSize: '13px' }}
                        value={
                          pageHeight === 1000 && pagePadding === 70 ? 'us-trade' :
                          pageHeight === 1400 && pagePadding === 90 ? 'a4' :
                          pageHeight === 1250 && pagePadding === 80 ? 'us-letter' :
                          pageHeight === 750 && pagePadding === 40 ? 'kindle' : 'custom'
                        }
                        onChange={(e) => {
                          const val = e.target.value;
                          if (val === 'us-trade') {
                            onSetPageHeight(1000);
                            onSetPagePadding(70);
                          } else if (val === 'a4') {
                            onSetPageHeight(1400);
                            onSetPagePadding(90);
                          } else if (val === 'us-letter') {
                            onSetPageHeight(1250);
                            onSetPagePadding(80);
                          } else if (val === 'kindle') {
                            onSetPageHeight(750);
                            onSetPagePadding(40);
                          }
                        }}
                      >
                        <option value="us-trade">Novel (US Trade - 6" x 9")</option>
                        <option value="a4">Standard A4 Document</option>
                        <option value="us-letter">US Letter (Standard Report)</option>
                        <option value="kindle">Kindle E-Reader Screen</option>
                        <option value="custom">Custom Dimensions...</option>
                      </select>
                    </div>

                    {/* Detailed Page Setup sliders */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      {/* Page Height */}
                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                          <span style={{ fontSize: '11.5px', color: 'var(--text-secondary)' }}>Page Height</span>
                          <span style={{ fontSize: '11.5px', fontWeight: 600, color: 'var(--accent-secondary)' }}>{pageHeight}px</span>
                        </div>
                        <input
                          type="range" min="600" max="2500" step="50"
                          value={pageHeight}
                          onChange={(e) => onSetPageHeight(parseInt(e.target.value))}
                          style={{ width: '100%', accentColor: 'var(--accent-primary)' }}
                        />
                      </div>

                      {/* Page Margins */}
                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                          <span style={{ fontSize: '11.5px', color: 'var(--text-secondary)' }}>Page Margins (Padding)</span>
                          <span style={{ fontSize: '11.5px', fontWeight: 600, color: 'var(--accent-secondary)' }}>{pagePadding}px</span>
                        </div>
                        <input
                          type="range" min="20" max="150" step="5"
                          value={pagePadding}
                          onChange={(e) => onSetPagePadding(parseInt(e.target.value))}
                          style={{ width: '100%', accentColor: 'var(--accent-primary)' }}
                        />
                      </div>
                    </div>

                  </div>
                )}
              </div>

              {/* ── Smart Writing Assistant Section ── */}
              <div style={{
                marginTop: '20px',
                borderTop: '1px solid var(--border-color)',
                paddingTop: '20px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                  <Zap size={14} style={{ color: 'var(--accent-primary)' }} />
                  <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    Smart Writing Assistant
                  </span>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <ToggleSwitch
                    label="Auto-Capitalization"
                    description="Capitalize first letter of new sentences and paragraphs"
                    checked={smartCap}
                    onChange={onSetSmartCap}
                  />
                  <ToggleSwitch
                    label="Auto-Capitalize 'I'"
                    description="Automatically capitalize standalone letter 'i' to 'I'"
                    checked={smartI}
                    onChange={onSetSmartI}
                  />
                  <ToggleSwitch
                    label="Double Space to Period"
                    description="Pressing Space twice inserts a period and space"
                    checked={smartSpace}
                    onChange={onSetSmartSpace}
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      )}

          {/* ── Tab 7: AI Writer ── */}
          {activeTab === 'ai' && (
            <AiAssistantTab
              activeRegionKey={activeRegionKey}
              selectedText={selectedText}
              selectedTextExists={selectedTextExists}
              pageContent={pageContent}
              onReplaceSelection={onReplaceSelection}
              onAppendToActivePage={onAppendToActivePage}
            />
          )}

          {/* ── Tab 2: Characters ── */}
          {activeTab === 'characters' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <h3 style={{ fontSize: '15px', fontWeight: 600 }}>Characters Directory</h3>
                <button className="btn btn-primary" style={{ padding: '4px 8px', fontSize: '11px' }} onClick={onOpenCreateCharModal}>
                  <Plus size={12} /> Add
                </button>
              </div>

              {activeBookDetails.characters.length === 0 ? (
                <p style={{ fontSize: '12.5px', color: 'var(--text-secondary)', textAlign: 'center', marginTop: '20px' }}>No characters indexed yet.</p>
              ) : (
                <div className="character-list">
                  {activeBookDetails.characters.map((char: Character) => (
                    <div key={char.id} className="character-card">
                      <div className="character-card-header">
                        <h4 className="character-card-name">{char.name}</h4>
                        <button className="btn-icon-only" style={{ padding: 2 }} onClick={(e) => onDeleteCharacter(char.id, e)}>
                          <Trash2 size={12} />
                        </button>
                      </div>
                      {char.description && <p className="character-card-desc">{char.description}</p>}
                      {char.keywords && <span className="character-card-keywords">Keywords: {char.keywords}</span>}
                      <div className="character-mentions-badge" onClick={() => onLoadCharacterMentions(char.id)}>
                        <BookMarked size={12} />
                        <span>Scan Mentions</span>
                      </div>
                      {selectedCharacterId === char.id && (
                        <div style={{ marginTop: '10px', background: 'rgba(0,0,0,0.2)', padding: '8px', borderRadius: '4px', borderLeft: '2.5px solid var(--accent-secondary)' }}>
                          <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '4px' }}>Mentioned on pages:</div>
                          {selectedCharacterMentions.length === 0 ? (
                            <div style={{ fontSize: '10.5px', color: 'var(--text-muted)' }}>No mentions found in the text.</div>
                          ) : (
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                              {selectedCharacterMentions.map((p) => (
                                <span
                                  key={p.id}
                                  style={{ fontSize: '10.5px', background: 'var(--bg-editor)', padding: '2px 5px', borderRadius: '3px', cursor: 'pointer', border: '1px solid var(--border-color)' }}
                                  onClick={() => onJumpToPage(p.chapter_id, p.id)}
                                >
                                  Pg {p.sort_order + 1}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── Tab 3: Versions ── */}
          {activeTab === 'versions' && (
            <div>
              <h3 style={{ fontSize: '15px', fontWeight: 600, marginBottom: '6px' }}>Writing History</h3>
              <p style={{ fontSize: '11.5px', color: 'var(--text-secondary)', marginBottom: '20px' }}>
                View and restore previous edits for the active section (<strong>{activeRegionKey}</strong>).
              </p>
              {versions.length === 0 ? (
                <p style={{ fontSize: '12px', color: 'var(--text-muted)', textAlign: 'center', marginTop: '25px' }}>No checkpoints captured yet.</p>
              ) : (
                <div className="versions-timeline">
                  {versions.map((v) => {
                    const cleanPreview = v.content ? v.content.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim() : '';
                    const truncatedPreview = cleanPreview.length > 80 ? cleanPreview.slice(0, 80) + '...' : cleanPreview;
                    return (
                      <div key={v.id} className="version-node">
                        <div className="version-node-time">{new Date(v.created_at * 1000).toLocaleTimeString()}</div>
                        <div className="version-node-preview">{truncatedPreview || '(empty content)'}</div>
                        <button className="btn btn-secondary" style={{ padding: '2px 6px', fontSize: '10px' }} onClick={() => onRestoreVersion(v.id)}>
                          Restore
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ── Tab 4: Search ── */}
          {activeTab === 'search' && (
            <div>
              <h3 style={{ fontSize: '15px', fontWeight: 600, marginBottom: '12px' }}>Search Book</h3>
              <div className="search-input-wrapper">
                <input
                  type="text"
                  className="input"
                  style={{ paddingRight: '36px' }}
                  placeholder="Search term..."
                  value={searchQuery}
                  onChange={(e) => onSetSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && onTriggerSearch()}
                />
                <button className="btn-icon-only" style={{ position: 'absolute', right: '6px', top: '6px' }} onClick={onTriggerSearch}>
                  <Search size={16} />
                </button>
              </div>
              {searchResults.length === 0 ? (
                <p style={{ fontSize: '12px', color: 'var(--text-muted)', textAlign: 'center', marginTop: '20px' }}>
                  Search for any word or phrase across your entire book.
                </p>
              ) : (
                <div className="search-results-list">
                  {searchResults.map((result, idx) => (
                    <div key={idx} className="search-result-card" onClick={() => onJumpToSearchResult(result)}>
                      <div className="search-result-title">
                        {result.chapter_title} — Page {result.page_number} ({result.region_key})
                      </div>
                      <div
                        className="search-result-snippet"
                        dangerouslySetInnerHTML={{
                          __html: result.snippet.replace(
                            new RegExp(`(${searchQuery})`, 'gi'),
                            '<mark>$1</mark>'
                          ),
                        }}
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── Tab 5: Export ── */}
          {activeTab === 'export' && (
            <div>
              <h3 style={{ fontSize: '15px', fontWeight: 600, marginBottom: '16px' }}>Export Book</h3>

              <div style={{ background: 'rgba(255,255,255,0.02)', padding: '16px', borderRadius: '8px', border: '1px solid var(--border-color)', marginBottom: '20px' }}>
                <h4 style={{ fontSize: '13px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
                  <Download size={14} /> Export as EPUB
                </h4>
                <p style={{ fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '12px' }}>
                  Export your book as a standard EPUB file, perfect for mobile devices and e-readers.
                </p>
                <label style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Export Save Path:</label>
                <input
                  type="text"
                  className="input"
                  style={{ fontSize: '12px', marginBottom: '12px' }}
                  value={exportPath}
                  onChange={(e) => onSetExportPath(e.target.value)}
                />
                <button className="btn btn-primary" style={{ width: '100%', fontSize: '12px' }} onClick={onExportEpub}>
                  Compile EPUB File
                </button>
              </div>

              <div style={{ background: 'rgba(255,255,255,0.02)', padding: '16px', borderRadius: '8px', border: '1px solid var(--border-color)', marginBottom: '20px' }}>
                <h4 style={{ fontSize: '13px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
                  <FileText size={14} /> Word Document (DOCX)
                </h4>
                <p style={{ fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '12px' }}>
                  Export your manuscript as a Word document (.docx) with standard margins, ready for sharing.
                </p>
                <button className="btn btn-primary" style={{ width: '100%', fontSize: '12px' }} onClick={onExportDocx}>
                  Compile DOCX File
                </button>
              </div>

              <div style={{ background: 'rgba(255,255,255,0.02)', padding: '16px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                <h4 style={{ fontSize: '13px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
                  <Printer size={14} /> PDF Print Layout
                </h4>
                <p style={{ fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '12px' }}>
                  Print your book or save it as a high-quality PDF with clean margins.
                </p>
                <button className="btn btn-secondary" style={{ width: '100%', fontSize: '12px' }} onClick={onTriggerPrint}>
                  Trigger PDF Print Dialog
                </button>
              </div>

              {exportMessage && (
                <div style={{ marginTop: '16px', padding: '12px', borderRadius: '6px', fontSize: '12px', background: exportMessage.success ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)', color: exportMessage.success ? '#10b981' : '#f87171', border: `1px solid ${exportMessage.success ? '#10b981' : '#f87171'}` }}>
                  {exportMessage.text}
                </div>
              )}
            </div>
          )}

          {activeTab === 'comments' && (
            <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: '16px' }}>
              <h3 style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', textTransform: 'uppercase', letterSpacing: '0.5px', margin: 0 }}>
                Editorial Review Notes
              </h3>

              {/* Form to submit a new note if a selection highlight has just been made */}
              {newCommentAnchor ? (
                <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--accent-secondary)', borderRadius: '12px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <span style={{ fontSize: '10px', color: 'var(--accent-secondary)', fontWeight: 'bold', textTransform: 'uppercase' }}>Add Review Comment</span>
                  <div style={{ fontSize: '11px', color: 'var(--text-secondary)', fontStyle: 'italic', borderLeft: '2px solid var(--border-color)', paddingLeft: '8px', marginBottom: '4px' }}>
                    "{newCommentAnchor.selectedText}"
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <label style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>Your Name</label>
                    <input
                      id="comment-author-input"
                      type="text"
                      placeholder="e.g. Editor / Alpha Reader"
                      defaultValue="Writer"
                      style={{ background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border-color)', borderRadius: '6px', padding: '6px 10px', fontSize: '11.5px', color: 'var(--text-primary)', outline: 'none' }}
                    />
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <label style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>Comment Note</label>
                    <textarea
                      id="comment-text-textarea"
                      placeholder="Type your editorial feedback here..."
                      autoFocus
                      style={{ background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border-color)', borderRadius: '6px', padding: '8px 10px', fontSize: '11.5px', color: 'var(--text-primary)', minHeight: '80px', resize: 'none', outline: 'none' }}
                    />
                  </div>

                  <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '4px' }}>
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={onCancelComment}
                      style={{ padding: '4px 10px', height: '28px', fontSize: '11px' }}
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      className="btn btn-primary"
                      onClick={() => {
                        const author = (document.getElementById('comment-author-input') as HTMLInputElement)?.value || 'Writer';
                        const text = (document.getElementById('comment-text-textarea') as HTMLTextAreaElement)?.value || '';
                        if (text.trim() && onSubmitComment) {
                          onSubmitComment(text, author);
                        }
                      }}
                      style={{ padding: '4px 12px', height: '28px', fontSize: '11px' }}
                    >
                      Save Note
                    </button>
                  </div>
                </div>
              ) : (
                <div style={{ fontSize: '11px', color: 'var(--text-secondary)', fontStyle: 'italic', padding: '8px', background: 'rgba(255,255,255,0.01)', border: '1px solid rgba(255,255,255,0.02)', borderRadius: '8px', lineHeight: '1.4' }}>
                  Tip: Highlight text in the editor and press <kbd style={{ background: 'rgba(255,255,255,0.1)', padding: '2px 4px', borderRadius: '4px', fontStyle: 'normal' }}>Ctrl + Alt + M</kbd> to add inline editorial comments.
                </div>
              )}

              {/* List of active comments for the current page */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', overflowY: 'auto', flex: 1, marginTop: '8px' }}>
                {(() => {
                  const activeNotes = (editorialNotes || []).filter(note => note.page_id === activePageId);
                  if (activeNotes.length === 0) {
                    return (
                      <div style={{ fontSize: '12px', color: 'var(--text-secondary)', textAlign: 'center', padding: '40px 0' }}>
                        No review comments on this page.
                      </div>
                    );
                  }
                  return activeNotes.map((note) => (
                    <div
                      key={note.id}
                      className={`comment-card ${note.resolved ? 'resolved' : ''}`}
                      style={{
                        background: note.resolved ? 'rgba(255,255,255,0.01)' : 'rgba(255,255,255,0.03)',
                        border: `1px solid ${note.resolved ? 'rgba(255,255,255,0.03)' : 'var(--border-color)'}`,
                        borderRadius: '12px',
                        padding: '14px',
                        opacity: note.resolved ? 0.6 : 1,
                        transition: 'all 0.2s',
                        boxShadow: '0 2px 6px rgba(0,0,0,0.1)'
                      }}
                    >
                      {/* Highlighted text preview */}
                      {note.selected_text && (
                        <div style={{ fontSize: '11px', fontStyle: 'italic', color: 'var(--text-secondary)', borderLeft: '2px solid var(--accent-secondary)', paddingLeft: '8px', marginBottom: '10px' }}>
                          "{note.selected_text}"
                        </div>
                      )}

                      {/* Comment text */}
                      <p style={{ fontSize: '12px', margin: '0 0 10px 0', color: 'var(--text-primary)', lineHeight: '1.5' }}>
                        {note.comment_text}
                      </p>

                      {/* Footer actions */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '10px', color: 'var(--text-secondary)', borderTop: '1px solid rgba(255,255,255,0.02)', paddingTop: '8px' }}>
                        <div>
                          <span style={{ fontWeight: 'bold', color: 'var(--text-primary)' }}>{note.author}</span>
                          <span style={{ margin: '0 6px' }}>•</span>
                          <span>{new Date(note.created_at * 1000).toLocaleDateString()}</span>
                        </div>

                        <div style={{ display: 'flex', gap: '8px' }}>
                          <button
                            type="button"
                            onClick={() => onToggleResolveNote && onToggleResolveNote(note.id, note.resolved ? 0 : 1)}
                            style={{ background: 'none', border: 'none', color: note.resolved ? 'var(--accent-secondary)' : 'var(--text-secondary)', cursor: 'pointer', fontSize: '10px', padding: 0 }}
                          >
                            {note.resolved ? 'Reopen' : 'Resolve'}
                          </button>
                          <button
                            type="button"
                            onClick={() => onDeleteNote && onDeleteNote(note.id)}
                            style={{ background: 'none', border: 'none', color: '#ff4d4d', cursor: 'pointer', fontSize: '10px', padding: 0 }}
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    </div>
                  ));
                })()}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Create Character Modal ── */}
      {showCreateCharModal && (
        <div className="modal-backdrop no-print">
          <div className="modal-content">
            <h3 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '20px' }}>Index Character</h3>
            <form onSubmit={onSubmitCreateChar}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div>
                  <label style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>Character Name *</label>
                  <input type="text" className="input" placeholder="e.g. John Doe, Vikram" value={newCharName} onChange={(e) => onNewCharName(e.target.value)} required />
                </div>
                <div>
                  <label style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>Description / Role</label>
                  <textarea className="input" style={{ resize: 'none', height: '60px' }} placeholder="Protagonist, secondary ally, details..." value={newCharDesc} onChange={(e) => onNewCharDesc(e.target.value)} />
                </div>
                <div>
                  <label style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>Keywords (comma-separated)</label>
                  <input type="text" className="input" placeholder="Keywords for auto scanning (e.g. Vikram, commander, captain)" value={newCharKeywords} onChange={(e) => onNewCharKeywords(e.target.value)} />
                </div>
                <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '10px' }}>
                  <button type="button" className="btn btn-secondary" onClick={onCloseCreateCharModal}>Cancel</button>
                  <button type="submit" className="btn btn-primary">Index Character</button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
};

export default RightPanel;
