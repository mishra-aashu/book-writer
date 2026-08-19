import React, { useState, useEffect } from 'react';
import { 
  Sparkles, Move, ArrowLeft, GitMerge, LayoutGrid, 
  BookOpen, Edit2, RefreshCw
} from 'lucide-react';
import { invoke } from './mockInvoke';
import type { BookDetails, Page } from './types';

interface StoryboardCardData {
  page_id: string;
  outline: string | null;
  color: string | null;
}

interface StoryboardBoardProps {
  activeBookDetails: BookDetails;
  onClose: () => void;
  onSelectPage: (pageId: string) => void;
  onDragReorderPages: (draggedId: string, targetId: string) => void;
}

const PLOT_COLORS = [
  { name: 'Default', class: 'story-color-default', hex: 'rgba(255, 255, 255, 0.05)', border: 'rgba(255, 255, 255, 0.1)' },
  { name: 'Lavender (Main Plot)', class: 'story-color-lavender', hex: 'rgba(162, 114, 221, 0.15)', border: 'rgba(162, 114, 221, 0.4)' },
  { name: 'Sky (Subplot A)', class: 'story-color-sky', hex: 'rgba(72, 157, 237, 0.15)', border: 'rgba(72, 157, 237, 0.4)' },
  { name: 'Mint (Subplot B)', class: 'story-color-mint', hex: 'rgba(64, 196, 122, 0.15)', border: 'rgba(64, 196, 122, 0.4)' },
  { name: 'Peach (Romance)', class: 'story-color-peach', hex: 'rgba(235, 142, 70, 0.15)', border: 'rgba(235, 142, 70, 0.4)' },
  { name: 'Coral (Mystery)', class: 'story-color-coral', hex: 'rgba(230, 83, 115, 0.15)', border: 'rgba(230, 83, 115, 0.4)' },
];

export const StoryboardBoard: React.FC<StoryboardBoardProps> = ({
  activeBookDetails,
  onClose,
  onSelectPage,
  onDragReorderPages,
}) => {
  const [viewMode, setViewMode] = useState<'grid' | 'network'>('grid');
  const [cards, setCards] = useState<StoryboardCardData[]>([]);
  const [characterMentions, setCharacterMentions] = useState<Record<string, string[]>>({}); // charId -> pageIds[]
  const [loading, setLoading] = useState(false);
  const [draggedPageId, setDraggedPageId] = useState<string | null>(null);
  const [activeEditingCard, setActiveEditingCard] = useState<string | null>(null);
  const [editingText, setEditingText] = useState('');

  // Fetch storyboard cards metadata & character mentions on load
  const loadStoryboardData = async () => {
    setLoading(true);
    try {
      const bookId = activeBookDetails.book.id;
      // 1. Fetch storyboard card outline & colors
      const cardsList: StoryboardCardData[] = await invoke('get_book_storyboard', { bookId });
      setCards(cardsList);

      // 2. Fetch character mentions
      const mentionsTemp: Record<string, string[]> = {};
      const promises = activeBookDetails.characters.map(async (char) => {
        try {
          const pages: Page[] = await invoke('get_character_mentions', { characterId: char.id });
          mentionsTemp[char.id] = pages.map(p => p.id);
        } catch (e) {
          console.error(e);
          mentionsTemp[char.id] = [];
        }
      });
      await Promise.all(promises);
      setCharacterMentions(mentionsTemp);
    } catch (e) {
      console.error("Failed to load storyboard data", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStoryboardData();
  }, [activeBookDetails]);

  // Handle changing outline synopsis
  const handleSaveOutline = async (pageId: string, text: string) => {
    const card = cards.find(c => c.page_id === pageId);
    const currentColor = card ? card.color : null;
    
    // Optimistic update
    setCards(prev => prev.map(c => c.page_id === pageId ? { ...c, outline: text } : c));
    setActiveEditingCard(null);

    try {
      await invoke('save_storyboard_card', {
        pageId,
        outline: text || null,
        color: currentColor
      });
    } catch (e) {
      console.error(e);
    }
  };

  // Handle color change
  const handleSelectColor = async (pageId: string, colorClass: string | null) => {
    const card = cards.find(c => c.page_id === pageId);
    const currentOutline = card ? card.outline : null;

    setCards(prev => prev.map(c => c.page_id === pageId ? { ...c, color: colorClass } : c));

    try {
      await invoke('save_storyboard_card', {
        pageId,
        outline: currentOutline,
        color: colorClass
      });
    } catch (e) {
      console.error(e);
    }
  };

  // Drag and Drop reordering
  const handleDragStart = (e: React.DragEvent, pageId: string) => {
    setDraggedPageId(pageId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, _targetId: string) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    if (draggedPageId && draggedPageId !== targetId) {
      onDragReorderPages(draggedPageId, targetId);
      // Wait a moment for props change and reload list
      setTimeout(() => {
        loadStoryboardData();
      }, 400);
    }
    setDraggedPageId(null);
  };

  // Group pages by Chapter
  const getChapterPages = (chapterId: string) => {
    return activeBookDetails.pages.filter(p => p.chapter_id === chapterId);
  };

  // Co-mention Calculation for network graph
  const getNetworkData = () => {
    const characters = activeBookDetails.characters;
    const nodes = characters.map((c, i) => {
      const angle = (i / characters.length) * 2 * Math.PI;
      const radius = 160;
      return {
        id: c.id,
        name: c.name,
        x: 250 + radius * Math.cos(angle),
        y: 250 + radius * Math.sin(angle),
        mentionsCount: characterMentions[c.id]?.length || 0,
      };
    });

    const links: { source: string; target: string; weight: number }[] = [];
    for (let i = 0; i < characters.length; i++) {
      for (let j = i + 1; j < characters.length; j++) {
        const charA = characters[i];
        const charB = characters[j];
        const pagesA = characterMentions[charA.id] || [];
        const pagesB = characterMentions[charB.id] || [];
        const sharedPages = pagesA.filter(p => pagesB.includes(p));

        if (sharedPages.length > 0) {
          links.push({
            source: charA.id,
            target: charB.id,
            weight: sharedPages.length
          });
        }
      }
    }

    return { nodes, links };
  };



  return (
    <div className="storyboard-container">
      
      {/* Upper header action bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', borderBottom: '1px solid var(--border-color)', paddingBottom: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button className="btn-icon-only" onClick={onClose} title="Back to Editor">
            <ArrowLeft size={18} />
          </button>
          <div>
            <h1 style={{ fontSize: '18px', fontWeight: 600, margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Sparkles size={18} style={{ color: 'var(--accent-secondary)' }} />
              Visual Storyboard & Plot Board
            </h1>
            <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>{activeBookDetails.book.title} — Macroscopic Outlines</span>
          </div>
        </div>

        {/* View mode toggle switcher */}
        <div className="toolbar-segmented" style={{ display: 'flex', background: 'var(--bg-sidebar)', borderRadius: '12px', padding: '3px', border: '1px solid var(--border-color)' }}>
          <button
            type="button"
            className={viewMode === 'grid' ? 'toolbar-seg-active' : 'toolbar-seg'}
            onClick={() => setViewMode('grid')}
            style={{ fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 14px', borderRadius: '9px', border: 'none', cursor: 'pointer' }}
          >
            <LayoutGrid size={14} />
            Index Cards
          </button>
          <button
            type="button"
            className={viewMode === 'network' ? 'toolbar-seg-active' : 'toolbar-seg'}
            onClick={() => setViewMode('network')}
            style={{ fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 14px', borderRadius: '9px', border: 'none', cursor: 'pointer' }}
          >
            <GitMerge size={14} />
            Pacing & Network
          </button>
        </div>
      </div>

      {loading ? (
        <div style={{ display: 'flex', flex: 1, alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '12px', minHeight: '300px' }}>
          <RefreshCw size={24} className="spin" style={{ color: 'var(--accent-secondary)' }} />
          <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Loading plot elements...</span>
        </div>
      ) : viewMode === 'grid' ? (
        <div className="storyboard-chapters-flow" style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
          {activeBookDetails.chapters.map((ch, chIdx) => {
            const chPages = getChapterPages(ch.id);
            return (
              <div key={ch.id} className="chapter-story-row">
                <h3 style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', marginTop: 0, marginBottom: '16px', textTransform: 'uppercase', letterSpacing: '0.5px', borderLeft: '3px solid var(--accent-secondary)', paddingLeft: '8px' }}>
                  Chapter {chIdx + 1}: {ch.title}
                </h3>
                
                {chPages.length === 0 ? (
                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)', fontStyle: 'italic', padding: '12px 0' }}>No pages in this chapter. Create pages in the outline sidebar.</div>
                ) : (
                  <div className="index-cards-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '20px' }}>
                    {chPages.map((pg, pgIdx) => {
                      const cardMeta = cards.find(c => c.page_id === pg.id);
                      const currentOutline = cardMeta?.outline || '';
                      const currentColorClass = cardMeta?.color || 'none';
                      const colorInfo = PLOT_COLORS.find(c => c.class === currentColorClass) || PLOT_COLORS[0];

                      return (
                        <div
                          key={pg.id}
                          draggable
                          onDragStart={(e) => handleDragStart(e, pg.id)}
                          onDragOver={(e) => handleDragOver(e, pg.id)}
                          onDrop={(e) => handleDrop(e, pg.id)}
                          onClick={() => {
                            if (activeEditingCard !== pg.id) {
                              onSelectPage(pg.id);
                            }
                          }}
                          className={`storyboard-card ${currentColorClass}`}
                          style={{
                            background: colorInfo.hex,
                            border: `1px solid ${colorInfo.border}`,
                            opacity: draggedPageId === pg.id ? 0.3 : 1,
                          }}
                        >
                          <div>
                            {/* Card Header */}
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                              <span style={{ fontSize: '10px', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.3px' }}>
                                Card {pgIdx + 1}
                              </span>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <Move size={12} style={{ color: 'var(--text-secondary)', opacity: 0.5 }} />
                                <span style={{ fontSize: '10px', padding: '2px 6px', background: 'rgba(255,255,255,0.05)', borderRadius: '6px', color: 'var(--text-primary)' }}>
                                  {pg.page_type?.replace('screenplay_', '') || 'prose'}
                                </span>
                              </div>
                            </div>

                            {/* Card Content (Outline input) */}
                            {activeEditingCard === pg.id ? (
                              <textarea
                                autoFocus
                                className="story-card-textarea"
                                value={editingText}
                                onChange={(e) => setEditingText(e.target.value)}
                                onClick={(e) => e.stopPropagation()}
                                onBlur={() => handleSaveOutline(pg.id, editingText)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter' && !e.shiftKey) {
                                    e.preventDefault();
                                    handleSaveOutline(pg.id, editingText);
                                  }
                                }}
                                style={{
                                  width: '100%',
                                  height: '90px',
                                  background: 'rgba(0, 0, 0, 0.2)',
                                  border: '1px solid var(--border-color)',
                                  borderRadius: '8px',
                                  padding: '8px',
                                  color: 'var(--text-primary)',
                                  fontSize: '11.5px',
                                  fontFamily: 'inherit',
                                  resize: 'none',
                                  outline: 'none'
                                }}
                              />
                            ) : (
                              <div 
                                style={{ minHeight: '90px', position: 'relative', cursor: 'pointer' }}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setActiveEditingCard(pg.id);
                                  setEditingText(currentOutline);
                                }}
                              >
                                <p style={{ fontSize: '11.5px', lineHeight: '1.5', margin: 0, color: currentOutline ? 'var(--text-primary)' : 'var(--text-secondary)', fontStyle: currentOutline ? 'normal' : 'italic' }}>
                                  {currentOutline || 'Click to write plot synopsis outlines...'}
                                </p>
                                <span className="card-edit-hover" style={{ position: 'absolute', right: 0, bottom: 0, opacity: 0, transition: 'opacity 0.2s' }}>
                                  <Edit2 size={11} style={{ color: 'var(--accent-secondary)' }} />
                                </span>
                              </div>
                            )}
                          </div>

                          {/* Card Footer: Plot storyline colors selector */}
                          <div 
                            style={{ display: 'flex', gap: '5px', marginTop: '12px', borderTop: '1px solid rgba(255,255,255,0.03)', paddingTop: '10px', overflowX: 'auto' }}
                            onClick={(e) => e.stopPropagation()}
                          >
                            {PLOT_COLORS.map(color => (
                              <button
                                key={color.class}
                                type="button"
                                className={`story-color-dot ${currentColorClass === color.class ? 'active' : ''}`}
                                onClick={() => handleSelectColor(pg.id, color.class === 'story-color-default' ? null : color.class)}
                                title={color.name}
                                style={{
                                  background: color.class === 'story-color-default' ? 'var(--text-secondary)' : color.hex.replace('0.15', '0.7'),
                                }}
                              />
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        /* Analytics Network Graph View */
        <div className="network-analytics-layout" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '30px', minHeight: '400px' }}>
          
          {/* SVG Character Co-mention network web */}
          <div className="card-box" style={{ background: 'var(--bg-sidebar)', border: '1px solid var(--border-color)', borderRadius: '16px', padding: '20px', display: 'flex', flexDirection: 'column' }}>
            <h3 style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', marginTop: 0, marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <GitMerge size={16} style={{ color: 'var(--accent-secondary)' }} />
              Character Mention Network Web
            </h3>
            <p style={{ fontSize: '11px', color: 'var(--text-secondary)', margin: '0 0 16px 0' }}>Circle nodes represent characters. Lines indicate co-appearances on the same pages.</p>
            
            {activeBookDetails.characters.length === 0 ? (
              <div style={{ display: 'flex', flex: 1, alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)', fontSize: '12px' }}>
                No characters defined in this book.
              </div>
            ) : (
              <div style={{ display: 'flex', flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                <svg width="450" height="450" style={{ background: 'rgba(0,0,0,0.15)', borderRadius: '12px' }}>
                  {(() => {
                    const { nodes, links } = getNetworkData();
                    return (
                      <>
                        {/* Links */}
                        {links.map((link, idx) => {
                          const srcNode = nodes.find(n => n.id === link.source);
                          const tgtNode = nodes.find(n => n.id === link.target);
                          if (!srcNode || !tgtNode) return null;
                          return (
                            <line
                              key={`link-${idx}`}
                              x1={srcNode.x}
                              y1={srcNode.y}
                              x2={tgtNode.x}
                              y2={tgtNode.y}
                              stroke="var(--accent-secondary)"
                              strokeWidth={Math.min(link.weight * 1.5, 8)}
                              strokeOpacity={0.25}
                            />
                          );
                        })}

                        {/* Node Labels */}
                        {nodes.map((node) => (
                          <g key={`node-${node.id}`} transform={`translate(${node.x}, ${node.y})`}>
                            {/* Inner circle */}
                            <circle
                              r={Math.max(16 + node.mentionsCount * 1.2, 24)}
                              fill="var(--bg-editor)"
                              stroke="var(--accent-secondary)"
                              strokeWidth="2"
                              style={{ filter: 'drop-shadow(0px 2px 4px rgba(0,0,0,0.3))' }}
                            />
                            {/* Character initials */}
                            <text
                              textAnchor="middle"
                              dy=".3em"
                              fill="var(--text-primary)"
                              fontSize="10px"
                              fontWeight="600"
                            >
                              {node.name.slice(0, 3).toUpperCase()}
                            </text>
                            {/* Label name below node */}
                            <text
                              y={Math.max(16 + node.mentionsCount * 1.2, 24) + 14}
                              textAnchor="middle"
                              fill="var(--text-primary)"
                              fontSize="10px"
                              fontWeight="bold"
                            >
                              {node.name}
                            </text>
                          </g>
                        ))}
                      </>
                    );
                  })()}
                </svg>
              </div>
            )}
          </div>

          {/* Subplot density pacing timeline */}
          <div className="card-box" style={{ background: 'var(--bg-sidebar)', border: '1px solid var(--border-color)', borderRadius: '16px', padding: '20px', display: 'flex', flexDirection: 'column' }}>
            <h3 style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', marginTop: 0, marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <BookOpen size={16} style={{ color: 'var(--accent-secondary)' }} />
              Character Plot Timeline (Pacing Matrix)
            </h3>
            <p style={{ fontSize: '11px', color: 'var(--text-secondary)', margin: '0 0 16px 0' }}>Horizontal map of page occurrences. Filled circles show active subplots.</p>

            {activeBookDetails.characters.length === 0 ? (
              <div style={{ display: 'flex', flex: 1, alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)', fontSize: '12px' }}>
                No character mention data.
              </div>
            ) : (
              <div style={{ overflowX: 'auto', flex: 1 }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                      <th style={{ textAlign: 'left', padding: '8px', color: 'var(--text-primary)', width: '120px' }}>Character</th>
                      {activeBookDetails.pages.map((pg, idx) => (
                        <th key={pg.id} style={{ padding: '8px 4px', color: 'var(--text-secondary)', textAlign: 'center', minWidth: '24px' }}>
                          P{idx + 1}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {activeBookDetails.characters.map((char) => {
                      const pagesMentioned = characterMentions[char.id] || [];
                      return (
                        <tr key={char.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.02)' }}>
                          <td style={{ padding: '8px', fontWeight: 600, color: 'var(--text-primary)' }}>{char.name}</td>
                          {activeBookDetails.pages.map((pg) => {
                            const mentioned = pagesMentioned.includes(pg.id);
                            return (
                              <td key={pg.id} style={{ padding: '8px 4px', textAlign: 'center' }}>
                                <div
                                  style={{
                                    width: '10px',
                                    height: '10px',
                                    borderRadius: '50%',
                                    margin: '0 auto',
                                    background: mentioned ? 'var(--accent-secondary)' : 'rgba(255,255,255,0.05)',
                                    boxShadow: mentioned ? '0 0 8px var(--accent-secondary)' : 'none',
                                    transition: 'all 0.2s'
                                  }}
                                  title={mentioned ? `${char.name} mentioned on this page` : 'Absent'}
                                />
                              </td>
                            );
                          })}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

        </div>
      )}
    </div>
  );
};
