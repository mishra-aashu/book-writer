import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, X, Printer, BookOpen } from 'lucide-react';
import { invoke } from './mockInvoke';
import type { BookDetails, Template, Page, ActiveFont, HeaderFont } from './types';

interface PreviewProps {
  bookDetails: BookDetails;
  templates: Template[];
  onClose: () => void;
  activeFont: ActiveFont;
  headerFont: HeaderFont;
  fontSize: number;
  lineHeight: number;
  letterSpacing: number;
  paragraphSpacing: number;
}

interface Spread {
  left: Page | null;
  right: Page | null;
  leftIdx: number;
  rightIdx: number;
}

const getDynamicGridTemplateRows = (rowsStr?: string) => {
  if (!rowsStr) return 'minmax(0, 1fr)';
  return rowsStr.replace(/\b1fr\b/g, 'minmax(0, 1fr)');
};

const getGridRegions = (areasStr?: string): string[] => {
  if (!areasStr) return ['header', 'main', 'footer'];
  const keys = areasStr.replace(/['"]/g, '').split(/\s+/).filter(k => k.trim().length > 0);
  return Array.from(new Set(keys));
};

export const Preview: React.FC<PreviewProps> = ({
  bookDetails,
  templates,
  onClose,
  activeFont,
  headerFont,
  fontSize,
  lineHeight,
  letterSpacing,
  paragraphSpacing,
}) => {
  const [pagesContent, setPagesContent] = useState<Record<string, Record<string, string>>>({});
  const [loading, setLoading] = useState(true);
  const [activeSpreadIdx, setActiveSpreadIdx] = useState(0);

  // 1. Get ordered pages of the book
  const projectType = bookDetails.book.project_type || 'novel';
  const getOrderedPages = (): Page[] => {
    if (projectType === 'screenplay') {
      return bookDetails.pages.filter(p => p.category === 'screenplay');
    } else {
      const frontPages = bookDetails.pages.filter(p => p.category === 'front_matter');
      const backPages = bookDetails.pages.filter(p => p.category === 'back_matter');

      const sortedChapters = [...bookDetails.chapters].sort((a, b) => a.sort_order - b.sort_order);
      const bodyPages: Page[] = [];
      for (const ch of sortedChapters) {
        const chPages = bookDetails.pages
          .filter(p => p.chapter_id === ch.id && (p.category === 'body' || !p.category))
          .sort((a, b) => a.sort_order - b.sort_order);
        bodyPages.push(...chPages);
      }

      return [...frontPages, ...bodyPages, ...backPages];
    }
  };

  const orderedPages = getOrderedPages();

  // 2. Fetch page contents
  useEffect(() => {
    let active = true;
    const fetchAllContents = async () => {
      try {
        setLoading(true);
        const contentsMap: Record<string, Record<string, string>> = {};
        await Promise.all(
          orderedPages.map(async (pg) => {
            const content = await invoke('get_page_content', { pageId: pg.id });
            contentsMap[pg.id] = content;
          })
        );
        if (active) {
          setPagesContent(contentsMap);
          setLoading(false);
        }
      } catch (err) {
        console.error('Failed to load page contents in preview:', err);
        if (active) setLoading(false);
      }
    };
    if (orderedPages.length > 0) {
      fetchAllContents();
    } else {
      setLoading(false);
    }
    return () => {
      active = false;
    };
  }, [bookDetails.pages]);

  // 3. Build Spreads
  const spreads: Spread[] = [];
  if (orderedPages.length > 0) {
    // First page (Title or Front Matter) starts on the right page, with left page blank
    spreads.push({
      left: null,
      right: orderedPages[0],
      leftIdx: -1,
      rightIdx: 0,
    });
    for (let i = 1; i < orderedPages.length; i += 2) {
      spreads.push({
        left: orderedPages[i],
        right: orderedPages[i + 1] || null,
        leftIdx: i,
        rightIdx: i + 1,
      });
    }
  }

  // 4. Keyboard page turns
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') {
        setActiveSpreadIdx(prev => Math.max(0, prev - 1));
      } else if (e.key === 'ArrowRight') {
        setActiveSpreadIdx(prev => Math.min(spreads.length - 1, prev + 1));
      } else if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [spreads.length, onClose]);

  const handlePrint = () => {
    window.print();
  };

  const getHeaderFontFamily = () => {
    switch (headerFont) {
      case 'playfair': return "'Playfair Display', serif";
      case 'cormorant': return "'Cormorant Garamond', serif";
      case 'cinzel': return "'Cinzel', serif";
      case 'rajdhani': return "'Rajdhani', sans-serif";
      case 'garamond': return "'EB Garamond', serif";
      case 'lora': return "'Lora', serif";
      case 'caveat': return "'Caveat', cursive";
      default: return "'Playfair Display', serif";
    }
  };

  // Helper to render an individual book page
  const renderBookPage = (page: Page | null, isLeft: boolean, _globalIndex: number) => {
    if (!page) {
      return (
        <div className={`book-preview-page blank-page ${isLeft ? 'left' : 'right'}`}>
          <div className="paper-texture" />
        </div>
      );
    }

    const template = templates.find(t => t.id === page.template_id);
    const layout = template ? JSON.parse(template.layout_json) : {
      display: 'grid',
      gridTemplateAreas: '"header" "main" "footer"',
      gridTemplateColumns: '1fr',
      gridTemplateRows: '40px 1fr 40px',
      gap: '15px'
    };

    const content = pagesContent[page.id] || {};
    const bodyPages = orderedPages.filter(p => p.category === 'body' || !p.category || p.category === 'screenplay');
    const bodyPageIndex = bodyPages.findIndex(p => p.id === page.id);
    const pageNumber = bodyPageIndex !== -1 ? bodyPageIndex + 1 : 1;

    // Get chapter title for headers
    const chapter = bookDetails.chapters.find(c => c.id === page.chapter_id);
    const chapterName = chapter ? chapter.title : '';

    return (
      <div 
        className={`book-preview-page font-${page.category === 'screenplay' ? 'courier' : activeFont} page-type-${page.page_type || 'standard'} ${isLeft ? 'left' : 'right'}`}
        style={{
          ['--font-display-current' as any]: getHeaderFontFamily(),
          display: layout.display || 'grid',
          gridTemplateAreas: layout.gridTemplateAreas,
          gridTemplateColumns: layout.gridTemplateColumns,
          gridTemplateRows: getDynamicGridTemplateRows(layout.gridTemplateRows),
          gap: layout.gap || '20px',
          fontSize: `${Math.round(fontSize * 0.95)}px`,
          lineHeight: lineHeight,
          letterSpacing: `${letterSpacing}em`,
          ['--paragraph-spacing' as any]: `${paragraphSpacing}em`,
          position: 'relative'
        }}
      >
        <div className="paper-texture" />
        
        {/* Screenplay Page Numbers: printed at top-right (except page 1) */}
        {page.category === 'screenplay' && pageNumber > 1 && (
          <div 
            className="screenplay-page-number-print"
            style={{
              position: 'absolute',
              top: '0.5in',
              right: '1.0in',
              fontFamily: "'Courier Prime', 'Courier New', monospace",
              fontSize: '12pt',
              color: 'rgba(26, 26, 46, 0.85)',
              pointerEvents: 'none',
              zIndex: 10,
            }}
          >
            {pageNumber}.
          </div>
        )}

        {getGridRegions(layout.gridTemplateAreas).map((regionKey) => {
          const val = content[regionKey] || '';
          const isStandardProse = page.template_id === 'standard';
          const isScreenplay = page.category === 'screenplay';
          const isStaticHeaderFooter = isStandardProse && (regionKey === 'header' || regionKey === 'footer');

          if (isStaticHeaderFooter) {
            // Running headers on left and right pages (for standard prose only)
            if (isScreenplay) return null;

            const staticText = regionKey === 'header'
              ? (isLeft
                  ? (bookDetails.book.title || 'Book Title').toUpperCase()
                  : (chapterName || 'Chapter Title').toUpperCase())
              : String(pageNumber);

            return (
              <div
                key={regionKey}
                className={`book-page-region-static grid-${regionKey}`}
                style={{
                  gridArea: regionKey,
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: regionKey === 'header' ? 'flex-start' : 'flex-end',
                  alignItems: 'center',
                  textAlign: 'center',
                  fontSize: '11px',
                  textTransform: regionKey === 'header' ? 'uppercase' : 'none',
                  letterSpacing: '0.15em',
                  color: 'rgba(26, 26, 46, 0.45)',
                  fontFamily: 'var(--font-display-current)',
                  userSelect: 'none',
                  padding: '4px 0',
                  borderBottom: regionKey === 'header' ? '1px solid rgba(26, 26, 46, 0.08)' : 'none',
                  paddingBottom: regionKey === 'header' ? '8px' : '0'
                }}
              >
                {staticText}
              </div>
            );
          }

          return (
            <div
              key={regionKey}
              className={`book-page-region grid-${regionKey}`}
              style={{
                gridArea: regionKey,
                display: 'flex',
                flexDirection: 'column',
                justifyContent: regionKey === 'header' ? 'flex-start' : regionKey === 'footer' ? 'flex-end' : 'stretch',
                textAlign: (regionKey === 'header' || regionKey === 'footer') ? 'center' : 'inherit'
              }}
            >
              <div 
                className="preview-content-html" 
                dangerouslySetInnerHTML={{ __html: val }} 
              />
            </div>
          );
        })}
      </div>
    );
  };

  const currentSpread = spreads[activeSpreadIdx];

  return (
    <div className="book-preview-overlay">
      <div className="preview-top-bar no-print">
        <div className="preview-title-info">
          <BookOpen size={18} className="preview-icon" />
          <span className="preview-book-title">{bookDetails.book.title}</span>
          <span className="preview-badge">Print Preview Layout</span>
        </div>

        <div className="preview-actions">
          <button className="btn btn-secondary" onClick={handlePrint} title="Print Book Details">
            <Printer size={16} />
            <span>Print / PDF</span>
          </button>
          <button className="btn-close-preview" onClick={onClose} title="Back to Editor">
            <X size={20} />
          </button>
        </div>
      </div>

      <div className="preview-canvas-container">
        {loading ? (
          <div className="preview-loading">
            <div className="spinner" />
            <span>Preparing print layout spreads...</span>
          </div>
        ) : spreads.length === 0 ? (
          <div className="preview-empty">
            <span>No pages exist in this book yet. Create some pages to view them here.</span>
          </div>
        ) : (
          <div className="book-spread-outer">
            <div className="book-spread-container" key={activeSpreadIdx}>
              {/* Render Left Page */}
              {renderBookPage(currentSpread.left, true, currentSpread.leftIdx)}

              {/* Spine/Binding center fold */}
              <div className="book-spine-fold">
                <div className="spine-highlight" />
              </div>

              {/* Render Right Page */}
              {renderBookPage(currentSpread.right, false, currentSpread.rightIdx)}
            </div>
          </div>
        )}
      </div>

      {spreads.length > 0 && !loading && (
        <div className="preview-bottom-nav no-print">
          <button 
            className="nav-arrow-btn" 
            onClick={() => setActiveSpreadIdx(prev => Math.max(0, prev - 1))}
            disabled={activeSpreadIdx === 0}
            title="Previous Pages"
          >
            <ChevronLeft size={24} />
          </button>

          <div className="spread-navigation-controls">
            <input 
              type="range" 
              className="spread-slider"
              min={0}
              max={spreads.length - 1}
              value={activeSpreadIdx}
              onChange={(e) => setActiveSpreadIdx(parseInt(e.target.value))}
            />
            <span className="spread-progress-text">
              Spread {activeSpreadIdx + 1} of {spreads.length} 
              <span className="page-indices-sub">
                (Page {currentSpread.leftIdx === -1 ? 'Cover' : currentSpread.leftIdx + 1} - {currentSpread.rightIdx + 1})
              </span>
            </span>
          </div>

          <button 
            className="nav-arrow-btn" 
            onClick={() => setActiveSpreadIdx(prev => Math.min(spreads.length - 1, prev + 1))}
            disabled={activeSpreadIdx === spreads.length - 1}
            title="Next Pages"
          >
            <ChevronRight size={24} />
          </button>
        </div>
      )}
    </div>
  );
};
