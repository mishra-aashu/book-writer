import React from 'react';
import {
  Plus, Trash2, ChevronLeft, ChevronDown, ChevronRight, Edit, ArrowUp, ArrowDown, FileText, RefreshCw,
} from 'lucide-react';
import type { Chapter, Page, BookDetails } from './types';

interface OutlineSidebarProps {
  activeBookDetails: BookDetails;
  activeChapterId: string | null;
  activePageId: string | null;
  editingChapterId: string | null;
  editingChapterTitle: string;
  sidebarCollapsed: boolean;
  focusMode: boolean;
  onBackToDashboard: () => void;
  onCreateChapter: () => void;
  onToggleChapter: (id: string) => void;
  onSelectPage: (id: string) => void;
  onDeleteChapter: (id: string, e: React.MouseEvent) => void;
  onDeletePage: (id: string, e: React.MouseEvent) => void;
  onStartRenameChapter: (ch: Chapter, e: React.MouseEvent) => void;
  onSaveChapterRename: (id: string) => void;
  onEditingChapterTitle: (v: string) => void;
  onCreatePage: (chapterId: string, category: 'front_matter' | 'body' | 'back_matter' | 'screenplay', e: React.MouseEvent) => void;
  onReorderChapters: (idx: number, direction: 'up' | 'down') => void;
  onReorderPages: (chapterId: string, idx: number, direction: 'up' | 'down') => void;
  onDragReorderChapters?: (draggedId: string, targetId: string) => void;
  onDragReorderPages?: (draggedId: string, targetId: string) => void;
  onCheckUpdates: () => void;
  draftingMode?: boolean;
}

const OutlineSidebar: React.FC<OutlineSidebarProps> = ({
  activeBookDetails,
  activeChapterId,
  activePageId,
  editingChapterId,
  editingChapterTitle,
  sidebarCollapsed,
  focusMode,
  onBackToDashboard,
  onCreateChapter,
  onToggleChapter,
  onSelectPage,
  onDeleteChapter,
  onDeletePage,
  onStartRenameChapter,
  onSaveChapterRename,
  onEditingChapterTitle,
  onCreatePage,
  onReorderChapters,
  onReorderPages,
  onDragReorderChapters,
  onDragReorderPages,
  onCheckUpdates,
  draftingMode = false,
}) => {
  const [draggedId, setDraggedId] = React.useState<string | null>(null);
  const [draggedType, setDraggedType] = React.useState<'chapter' | 'page' | null>(null);
  const [draggedOverId, setDraggedOverId] = React.useState<string | null>(null);

  const handleDragStart = (e: React.DragEvent, id: string, type: 'chapter' | 'page') => {
    setDraggedId(id);
    setDraggedType(type);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, id: string, type: 'chapter' | 'page') => {
    if (draggedType !== type) return;
    if (draggedId === id) return;
    e.preventDefault();
    setDraggedOverId(id);
  };

  const handleDragLeave = () => {
    setDraggedOverId(null);
  };

  const handleDrop = (e: React.DragEvent, targetId: string, type: 'chapter' | 'page') => {
    e.preventDefault();
    if (draggedType === type && draggedId && draggedId !== targetId) {
      if (type === 'chapter') {
        if (onDragReorderChapters) onDragReorderChapters(draggedId, targetId);
      } else {
        if (onDragReorderPages) onDragReorderPages(draggedId, targetId);
      }
    }
    setDraggedId(null);
    setDraggedType(null);
    setDraggedOverId(null);
  };

  const handleDragEnd = () => {
    setDraggedId(null);
    setDraggedType(null);
    setDraggedOverId(null);
  };

  const projectType = activeBookDetails.book.project_type || 'novel';
  const isNovel = projectType === 'novel';

  // Helper to map page types to human readable labels
  const bodyPages = activeBookDetails.pages.filter(
    (p) => p.category === 'body' || !p.category || p.category === 'screenplay'
  );

  const getPageLabel = (pg: Page, idx: number) => {
    const isBodyOrScreenplay = pg.category === 'body' || !pg.category || pg.category === 'screenplay';
    const displayIndex = isBodyOrScreenplay 
      ? bodyPages.findIndex(p => p.id === pg.id) 
      : idx;
    
    const useIdx = displayIndex !== -1 ? displayIndex : idx;

    if (!pg.page_type) return `Page ${useIdx + 1}`;
    
    const labels: Record<string, string> = {
      half_title: 'Half Title Page',
      verso_blank: 'Blank / Verso Page',
      full_title: 'Full Title Page',
      copyright: 'Copyright Page',
      dedication: 'Dedication Page',
      epigraph: 'Epigraph Page',
      toc: 'Table of Contents',
      illustrations: 'Illustrations & Maps',
      foreword: 'Foreword',
      preface: 'Preface',
      acknowledgments: 'Acknowledgments',
      prologue: 'Prologue',
      
      divider: 'Part Divider',
      chapter_start: 'Chapter opening',
      standard_prose: `Prose Page ${useIdx + 1}`,
      interlude: 'Interlude',
      
      epilogue: 'Epilogue',
      afterword: 'Afterword',
      appendix: 'Appendix',
      glossary: 'Glossary',
      about_author: 'About the Author',
      also_by: 'Also by Author',
      discussion: 'Book Club Q&A',
      
      screenplay_title: 'Title Page',
      screenplay_fade_in: 'FADE IN Page',
      screenplay_standard: `Script Scene ${useIdx + 1}`,
      screenplay_cast: 'Cast List',
      screenplay_toc: 'Script TOC',
      screenplay_act_break: 'Act Break',
      screenplay_revision: 'Revision Page',
      screenplay_fade_out: 'FADE OUT Page',
    };
    
    return labels[pg.page_type] || `Page ${useIdx + 1}`;
  };

  // Filtering lists
  const frontPages = activeBookDetails.pages.filter(p => p.category === 'front_matter');
  const backPages = activeBookDetails.pages.filter(p => p.category === 'back_matter');
  const screenplayPages = activeBookDetails.pages.filter(p => p.category === 'screenplay');

  return (
    <div className={`workspace-sidebar no-print ${sidebarCollapsed || focusMode ? 'collapsed' : ''}`}>
      <div className="sidebar-header">
        <div
          style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', overflow: 'hidden' }}
          onClick={onBackToDashboard}
        >
          <ChevronLeft size={18} style={{ flexShrink: 0 }} />
          <span className="sidebar-title" title={activeBookDetails.book.title}>
            {activeBookDetails.book.title}
          </span>
        </div>
        {isNovel && (
          <button className="btn-icon-only" onClick={onCreateChapter} title="Add Chapter">
            <Plus size={18} />
          </button>
        )}
      </div>

      <div className="sidebar-scrollable">
        {isNovel ? (
          <>
            {/* ─── Front Matter Section ─── */}
            <div className="sidebar-section-group">
              <div className="sidebar-section-header">
                <span>Front Matter</span>
                <button
                  className="btn-icon-only"
                  onClick={(e) => onCreatePage(activeBookDetails.book.id, 'front_matter', e)}
                  title="Add Front Matter Page"
                >
                  <Plus size={16} />
                </button>
              </div>
              <div className="pages-list" style={{ display: 'block' }}>
                {frontPages.length === 0 ? (
                  <div className="sidebar-empty-info">No front matter pages</div>
                ) : (
                  frontPages.map((pg, idx) => (
                    <div
                      key={pg.id}
                      className={`page-item ${activePageId === pg.id ? 'active' : ''} ${draggedId === pg.id ? 'is-dragging' : ''} ${draggedOverId === pg.id ? 'drag-over' : ''}`}
                      onClick={() => onSelectPage(pg.id)}
                      draggable={true}
                      onDragStart={(e) => handleDragStart(e, pg.id, 'page')}
                      onDragOver={(e) => handleDragOver(e, pg.id, 'page')}
                      onDragLeave={handleDragLeave}
                      onDrop={(e) => handleDrop(e, pg.id, 'page')}
                      onDragEnd={handleDragEnd}
                    >
                      <div className="page-item-label-container">
                        <FileText size={13} style={{ flexShrink: 0, opacity: 0.6 }} />
                        <span className="page-item-title">{getPageLabel(pg, idx)}</span>
                      </div>
                      <div className="page-item-actions" onClick={(e) => e.stopPropagation()}>
                        <button
                          className="btn-icon-only"
                          onClick={() => onReorderPages(activeBookDetails.book.id, idx, 'up')}
                          disabled={idx === 0}
                          title="Move Up"
                        >
                          <ArrowUp size={14} />
                        </button>
                        <button
                          className="btn-icon-only"
                          onClick={() => onReorderPages(activeBookDetails.book.id, idx, 'down')}
                          disabled={idx === frontPages.length - 1}
                          title="Move Down"
                        >
                          <ArrowDown size={14} />
                        </button>
                        <button
                          className="btn-icon-only"
                          onClick={(e) => onDeletePage(pg.id, e)}
                          title="Delete"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* ─── Main Body Chapters ─── */}
            <div className="sidebar-section-group">
              <div className="sidebar-section-header">
                <span>Manuscript Chapters</span>
                <button
                  className="btn-icon-only"
                  onClick={onCreateChapter}
                  title="Add Chapter"
                >
                  <Plus size={16} />
                </button>
              </div>
              
              {activeBookDetails.chapters.map((ch, chIdx) => {
                const chapterPages = activeBookDetails.pages.filter(
                  (p) => p.chapter_id === ch.id && (p.category === 'body' || !p.category)
                );
                return (
                  <div key={ch.id} className="chapter-wrapper">
                    <div 
                      className={`chapter-item ${draftingMode && chapterPages.some(p => p.id === activePageId) ? 'active' : ''} ${draggedId === ch.id ? 'is-dragging' : ''} ${draggedOverId === ch.id ? 'drag-over' : ''}`} 
                      onClick={() => {
                        onToggleChapter(ch.id);
                        if (draftingMode && chapterPages.length > 0) {
                          onSelectPage(chapterPages[0].id);
                        }
                      }}
                      draggable={true}
                      onDragStart={(e) => handleDragStart(e, ch.id, 'chapter')}
                      onDragOver={(e) => handleDragOver(e, ch.id, 'chapter')}
                      onDragLeave={handleDragLeave}
                      onDrop={(e) => handleDrop(e, ch.id, 'chapter')}
                      onDragEnd={handleDragEnd}
                    >
                      {editingChapterId === ch.id ? (
                        <input
                          type="text"
                          className="chapter-title-edit"
                          value={editingChapterTitle}
                          onChange={(e) => onEditingChapterTitle(e.target.value)}
                          onBlur={() => onSaveChapterRename(ch.id)}
                          onKeyDown={(e) => e.key === 'Enter' && onSaveChapterRename(ch.id)}
                          autoFocus
                          onClick={(e) => e.stopPropagation()}
                        />
                      ) : (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', overflow: 'hidden', flex: 1, minWidth: 0 }}>
                          <span style={{
                            flexShrink: 0,
                            color: activeChapterId === ch.id ? 'var(--accent-primary)' : 'var(--text-muted)',
                            transition: 'color 0.2s, transform 0.2s',
                            display: 'flex',
                            alignItems: 'center'
                          }}>
                            {activeChapterId === ch.id
                              ? <ChevronDown size={14} />
                              : <ChevronRight size={14} />}
                          </span>
                          <span className="chapter-title-text">{ch.title}</span>
                          {chapterPages.length > 0 && (
                            <span style={{
                              flexShrink: 0,
                              fontSize: '10px',
                              fontWeight: 600,
                              background: activeChapterId === ch.id ? 'var(--accent-primary)' : 'var(--accent-glow)',
                              color: activeChapterId === ch.id ? 'white' : 'var(--accent-secondary)',
                              padding: '1px 5px',
                              borderRadius: '10px',
                              lineHeight: 1.6,
                              transition: 'background 0.2s, color 0.2s'
                            }}>
                              {chapterPages.length}
                            </span>
                          )}
                        </div>
                      )}

                      <div className="chapter-item-actions" onClick={(e) => e.stopPropagation()}>
                        <button
                          className="btn-icon-only"
                          onClick={() => onReorderChapters(chIdx, 'up')}
                          disabled={chIdx === 0}
                          title="Move Up"
                        >
                          <ArrowUp size={14} />
                        </button>
                        <button
                          className="btn-icon-only"
                          onClick={() => onReorderChapters(chIdx, 'down')}
                          disabled={chIdx === activeBookDetails.chapters.length - 1}
                          title="Move Down"
                        >
                          <ArrowDown size={14} />
                        </button>
                        <button
                          className="btn-icon-only"
                          onClick={(e) => onCreatePage(ch.id, 'body', e)}
                          title="Add Page to Chapter"
                        >
                          <Plus size={14} />
                        </button>
                        <button
                          className="btn-icon-only"
                          onClick={(e) => onStartRenameChapter(ch, e)}
                          title="Rename Chapter"
                        >
                          <Edit size={14} />
                        </button>
                        <button
                          className="btn-icon-only"
                          onClick={(e) => onDeleteChapter(ch.id, e)}
                          title="Delete Chapter"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>

                    {activeChapterId === ch.id && (
                      <div className="pages-list">
                        {chapterPages.length === 0 ? (
                          <div 
                            className="sidebar-empty-info" 
                            onClick={(e) => onCreatePage(ch.id, 'body', e)}
                            style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px', userSelect: 'none' }}
                          >
                            <Plus size={11} style={{ opacity: 0.5 }} />
                            Add first page
                          </div>
                        ) : (
                          chapterPages.map((pg, pgIdx) => (
                            <div
                              key={pg.id}
                              className={`page-item ${activePageId === pg.id ? 'active' : ''} ${draggedId === pg.id ? 'is-dragging' : ''} ${draggedOverId === pg.id ? 'drag-over' : ''}`}
                              onClick={() => onSelectPage(pg.id)}
                              draggable={true}
                              onDragStart={(e) => handleDragStart(e, pg.id, 'page')}
                              onDragOver={(e) => handleDragOver(e, pg.id, 'page')}
                              onDragLeave={handleDragLeave}
                              onDrop={(e) => handleDrop(e, pg.id, 'page')}
                              onDragEnd={handleDragEnd}
                            >
                              <div className="page-item-label-container">
                                <FileText size={13} style={{ flexShrink: 0, opacity: 0.6 }} />
                                <span className="page-item-title">{getPageLabel(pg, pgIdx)}</span>
                              </div>
                              <div className="page-item-actions" onClick={(e) => e.stopPropagation()}>
                                <button
                                  className="btn-icon-only"
                                  onClick={() => onReorderPages(ch.id, pgIdx, 'up')}
                                  disabled={pgIdx === 0}
                                  title="Move Up"
                                >
                                  <ArrowUp size={14} />
                                </button>
                                <button
                                  className="btn-icon-only"
                                  onClick={() => onReorderPages(ch.id, pgIdx, 'down')}
                                  disabled={pgIdx === chapterPages.length - 1}
                                  title="Move Down"
                                >
                                  <ArrowDown size={14} />
                                </button>
                                <button
                                  className="btn-icon-only"
                                  onClick={(e) => onDeletePage(pg.id, e)}
                                  title="Delete Page"
                                >
                                  <Trash2 size={14} />
                                </button>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* ─── Back Matter Section ─── */}
            <div className="sidebar-section-group" style={{ marginTop: 'auto', borderTop: '1px solid var(--border-color)', paddingTop: '10px' }}>
              <div className="sidebar-section-header">
                <span>Back Matter</span>
                <button
                  className="btn-icon-only"
                  onClick={(e) => onCreatePage(activeBookDetails.book.id, 'back_matter', e)}
                  title="Add Back Matter Page"
                >
                  <Plus size={16} />
                </button>
              </div>
              <div className="pages-list" style={{ display: 'block' }}>
                {backPages.length === 0 ? (
                  <div className="sidebar-empty-info">No back matter pages</div>
                ) : (
                  backPages.map((pg, idx) => (
                    <div
                      key={pg.id}
                      className={`page-item ${activePageId === pg.id ? 'active' : ''} ${draggedId === pg.id ? 'is-dragging' : ''} ${draggedOverId === pg.id ? 'drag-over' : ''}`}
                      onClick={() => onSelectPage(pg.id)}
                      draggable={true}
                      onDragStart={(e) => handleDragStart(e, pg.id, 'page')}
                      onDragOver={(e) => handleDragOver(e, pg.id, 'page')}
                      onDragLeave={handleDragLeave}
                      onDrop={(e) => handleDrop(e, pg.id, 'page')}
                      onDragEnd={handleDragEnd}
                    >
                      <div className="page-item-label-container">
                        <FileText size={13} style={{ flexShrink: 0, opacity: 0.6 }} />
                        <span className="page-item-title">{getPageLabel(pg, idx)}</span>
                      </div>
                      <div className="page-item-actions" onClick={(e) => e.stopPropagation()}>
                        <button
                          className="btn-icon-only"
                          onClick={() => onReorderPages(activeBookDetails.book.id, idx, 'up')}
                          disabled={idx === 0}
                          title="Move Up"
                        >
                          <ArrowUp size={10} />
                        </button>
                        <button
                          className="btn-icon-only"
                          onClick={() => onReorderPages(activeBookDetails.book.id, idx, 'down')}
                          disabled={idx === backPages.length - 1}
                          title="Move Down"
                        >
                          <ArrowDown size={10} />
                        </button>
                        <button
                          className="btn-icon-only"
                          onClick={(e) => onDeletePage(pg.id, e)}
                          title="Delete"
                        >
                          <Trash2 size={10} />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </>
        ) : (
          /* ─── Screenplay Pages sequential Outline ─── */
          <div className="sidebar-section-group">
            <div className="sidebar-section-header">
              <span>Script Pages</span>
              <button
                className="btn-icon-only"
                onClick={(e) => onCreatePage(activeBookDetails.book.id, 'screenplay', e)}
                title="Add Screenplay Page"
              >
                <Plus size={16} />
              </button>
            </div>
            <div className="pages-list" style={{ display: 'block' }}>
              {screenplayPages.length === 0 ? (
                <div className="sidebar-empty-info" style={{ padding: '20px', textAlign: 'center' }}>
                  No script pages yet.<br />Click + to add a Title Page or standard scene.
                </div>
              ) : (
                screenplayPages.map((pg, idx) => (
                  <div
                    key={pg.id}
                    className={`page-item ${activePageId === pg.id ? 'active' : ''} ${draggedId === pg.id ? 'is-dragging' : ''} ${draggedOverId === pg.id ? 'drag-over' : ''}`}
                    onClick={() => onSelectPage(pg.id)}
                    draggable={true}
                    onDragStart={(e) => handleDragStart(e, pg.id, 'page')}
                    onDragOver={(e) => handleDragOver(e, pg.id, 'page')}
                    onDragLeave={handleDragLeave}
                    onDrop={(e) => handleDrop(e, pg.id, 'page')}
                    onDragEnd={handleDragEnd}
                  >
                    <div className="page-item-label-container">
                      <span className="screenplay-page-number">#{idx + 1}</span>
                      <span className="page-item-title">{getPageLabel(pg, idx)}</span>
                    </div>
                    <div className="page-item-actions" onClick={(e) => e.stopPropagation()}>
                      <button
                        className="btn-icon-only"
                        onClick={() => onReorderPages(activeBookDetails.book.id, idx, 'up')}
                        disabled={idx === 0}
                        title="Move Up"
                      >
                        <ArrowUp size={14} />
                      </button>
                      <button
                        className="btn-icon-only"
                        onClick={() => onReorderPages(activeBookDetails.book.id, idx, 'down')}
                        disabled={idx === screenplayPages.length - 1}
                        title="Move Down"
                      >
                        <ArrowDown size={14} />
                      </button>
                      <button
                        className="btn-icon-only"
                        onClick={(e) => onDeletePage(pg.id, e)}
                        title="Delete Page"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>
      <div className="sidebar-footer" style={{ borderTop: '1px solid var(--border-color)', padding: '10px 12px', display: 'flex', justifyContent: 'center' }}>
        <button 
          className="btn btn-secondary" 
          onClick={onCheckUpdates}
          style={{ width: '100%', fontSize: '11px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', padding: '6px 12px', height: 'auto' }}
        >
          <RefreshCw size={12} style={{ color: 'var(--accent-secondary)' }} />
          Check for Updates
        </button>
      </div>
    </div>
  );
};

export default OutlineSidebar;

