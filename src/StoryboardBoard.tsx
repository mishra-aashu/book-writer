import React, { useState, useEffect } from 'react';
import { 
  ArrowLeft, GitMerge, LayoutGrid, 
  BookOpen, RefreshCw, Trash2, Plus
} from 'lucide-react';
import { invoke } from './mockInvoke';
import type { BookDetails, StoryboardCard } from './types';

interface StoryboardBoardProps {
  activeBookDetails: BookDetails;
  onClose: () => void;
  onSelectPage: (pageId: string) => void;
  onDragReorderPages: (draggedId: string, targetId: string) => void;
  onRefreshBookDetails?: () => void;
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
  onRefreshBookDetails,
}) => {
  const [viewMode, setViewMode] = useState<'grid' | 'network'>('grid');
  const [cards, setCards] = useState<StoryboardCard[]>([]);
  const [characterMentions, setCharacterMentions] = useState<Record<string, string[]>>({}); // charId -> pageIds[]
  const [loading, setLoading] = useState(false);
  
  // Drag and drop states
  const [draggedCardId, setDraggedCardId] = useState<string | null>(null);
  
  // Editing states
  const [activeEditingCard, setActiveEditingCard] = useState<string | null>(null);
  const [editingField, setEditingField] = useState<'title' | 'outline' | null>(null);
  const [editingText, setEditingText] = useState('');
  
  // Loading data from backend
  const loadStoryboardData = async () => {
    setLoading(true);
    try {
      const bookId = activeBookDetails.book.id;
      // 1. Fetch storyboard cards from the database
      const cardsList: StoryboardCard[] = await invoke('get_book_storyboard', { bookId });
      setCards(cardsList || []);

      // 2. Fetch character mentions for network graph
      const mentionsTemp: Record<string, string[]> = {};
      const promises = activeBookDetails.characters.map(async (char) => {
        try {
          const pages = await invoke('get_character_mentions', { characterId: char.id });
          mentionsTemp[char.id] = pages.map((p: any) => p.id);
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

  // Card CRUD Operations
  const handleAddCard = async (chapterId: string) => {
    try {
      const newCard = await invoke('create_storyboard_card', {
        chapterId,
        title: 'New Scene Card'
      });
      if (onRefreshBookDetails) {
        onRefreshBookDetails();
      }
      setCards(prev => [...prev, newCard]);
      // Start editing title immediately
      setActiveEditingCard(newCard.id);
      setEditingField('title');
      setEditingText('New Scene Card');
    } catch (e) {
      console.error("Failed to add scene card", e);
    }
  };

  const handleDeleteCard = async (cardId: string) => {
    try {
      await invoke('delete_storyboard_card', { id: cardId });
      if (onRefreshBookDetails) {
        onRefreshBookDetails();
      }
      setCards(prev => prev.filter(c => c.id !== cardId));
    } catch (e) {
      console.error("Failed to delete scene card", e);
    }
  };

  const handleUpdateCardText = async (cardId: string, field: 'title' | 'outline', val: string) => {
    const card = cards.find(c => c.id === cardId);
    if (!card) return;

    const updatedTitle = field === 'title' ? val : (card.title || '');
    const updatedOutline = field === 'outline' ? val : (card.outline || '');
    const currentColor = card.color || null;

    // Optimistic Update
    setCards(prev => prev.map(c => c.id === cardId ? { ...c, title: updatedTitle, outline: updatedOutline } : c));
    setActiveEditingCard(null);
    setEditingField(null);

    try {
      await invoke('update_storyboard_card', {
        id: cardId,
        title: updatedTitle || null,
        outline: updatedOutline || null,
        color: currentColor
      });
    } catch (e) {
      console.error("Failed to update card content", e);
    }
  };

  const handleSelectColor = async (cardId: string, colorClass: string | null) => {
    const card = cards.find(c => c.id === cardId);
    if (!card) return;

    // Optimistic Update
    setCards(prev => prev.map(c => c.id === cardId ? { ...c, color: colorClass } : c));

    try {
      await invoke('update_storyboard_card', {
        id: cardId,
        title: card.title,
        outline: card.outline,
        color: colorClass
      });
    } catch (e) {
      console.error("Failed to update card color", e);
    }
  };

  // Drag and Drop
  const handleDragStart = (e: React.DragEvent, cardId: string) => {
    e.dataTransfer.effectAllowed = 'move';
    try {
      e.dataTransfer.setData('text/plain', cardId);
    } catch (err) {}
    setTimeout(() => {
      setDraggedCardId(cardId);
    }, 0);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDropOnChapter = async (e: React.DragEvent, targetChapterId: string) => {
    e.preventDefault();
    if (!draggedCardId) return;

    const card = cards.find(c => c.id === draggedCardId);
    if (!card) return;

    // If dropped in a new chapter, move it to the end of that chapter column
    if (card.chapterId !== targetChapterId) {
      const chapterCards = cards.filter(c => c.chapterId === targetChapterId);
      const newSortOrder = chapterCards.length;

      // Optimistic update
      setCards(prev => prev.map(c => c.id === draggedCardId ? { ...c, chapterId: targetChapterId, sortOrder: newSortOrder } : c));

      try {
        await invoke('move_storyboard_card_to_chapter', {
          id: draggedCardId,
          chapterId: targetChapterId,
          sortOrder: newSortOrder
        });
        if (onRefreshBookDetails) {
          onRefreshBookDetails();
        }
      } catch (e) {
        console.error("Failed to move card to chapter", e);
      }
    }
    setDraggedCardId(null);
  };

  const handleDropOnCard = async (e: React.DragEvent, targetCardId: string) => {
    e.preventDefault();
    e.stopPropagation();
    if (!draggedCardId || draggedCardId === targetCardId) return;

    const sourceCard = cards.find(c => c.id === draggedCardId);
    const targetCard = cards.find(c => c.id === targetCardId);
    if (!sourceCard || !targetCard) return;

    // Rearrange cards list locally
    let updatedCards = [...cards];
    const srcIndex = updatedCards.findIndex(c => c.id === draggedCardId);
    const [movedCard] = updatedCards.splice(srcIndex, 1);
    
    // Change chapter ID to target chapter
    movedCard.chapterId = targetCard.chapterId;

    const destIndex = updatedCards.findIndex(c => c.id === targetCardId);
    updatedCards.splice(destIndex, 0, movedCard);

    // Recompute sort orders for all cards in target chapter
    const finalCards = updatedCards.map((c, idx) => {
      return { ...c, sortOrder: idx };
    });

    setCards(finalCards);

    try {
      if (sourceCard.chapterId !== targetCard.chapterId) {
        await invoke('move_storyboard_card_to_chapter', {
          id: draggedCardId,
          chapterId: targetCard.chapterId,
          sortOrder: targetCard.sortOrder
        });
      }
      
      const targetChapterCardIds = finalCards
        .filter(c => c.chapterId === targetCard.chapterId)
        .map(c => c.id);
      
      await invoke('reorder_storyboard_cards', { cardIds: targetChapterCardIds });
      if (onRefreshBookDetails) {
        onRefreshBookDetails();
      }
    } catch (e) {
      console.error("Failed to reorder cards", e);
    }
    setDraggedCardId(null);
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
        weight: (characterMentions[c.id] || []).length,
      };
    });

    const links: { source: string; target: string; value: number }[] = [];
    for (let i = 0; i < characters.length; i++) {
      for (let j = i + 1; j < characters.length; j++) {
        const c1 = characters[i].id;
        const c2 = characters[j].id;
        const p1 = characterMentions[c1] || [];
        const p2 = characterMentions[c2] || [];
        const common = p1.filter(id => p2.includes(id)).length;
        if (common > 0) {
          links.push({ source: c1, target: c2, value: common });
        }
      }
    }

    return { nodes, links };
  };

  const { nodes, links } = getNetworkData();

  return (
    <div className="storyboard-container no-print">
      {/* Storyboard Header */}
      <div className="storyboard-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <button className="btn-icon-only" onClick={onClose} title="Back to Document Editor">
            <ArrowLeft size={18} />
          </button>
          <div>
            <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <LayoutGrid size={18} style={{ color: 'var(--accent-secondary)' }} />
              Story Planner & Scene Board
            </h2>
            <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
              Structure your scenes, outline plot lines, and map character co-occurrences.
            </span>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {/* Refresh button */}
          <button className="btn-icon-only" onClick={loadStoryboardData} title="Refresh Storyboard Data">
            <RefreshCw size={14} className={loading ? 'spin' : ''} />
          </button>

          {/* Mode Segment Switch */}
          <div style={{ display: 'flex', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '6px', padding: '2px' }}>
            <button
              type="button"
              className={viewMode === 'grid' ? 'toolbar-seg-active' : 'toolbar-seg'}
              onClick={() => setViewMode('grid')}
            >
              <LayoutGrid size={13} style={{ marginRight: '6px' }} />
              Kanban Board
            </button>
            <button
              type="button"
              className={viewMode === 'network' ? 'toolbar-seg-active' : 'toolbar-seg'}
              onClick={() => setViewMode('network')}
            >
              <GitMerge size={13} style={{ marginRight: '6px' }} />
              Character Plot Map
            </button>
          </div>
        </div>
      </div>

      {/* Storyboard Workspace */}
      <div className="storyboard-workspace">
        {loading && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: '12px' }}>
            <RefreshCw className="spin" size={32} style={{ color: 'var(--accent-secondary)' }} />
            <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Loading planning board...</span>
          </div>
        )}

        {!loading && viewMode === 'grid' && (
          <div 
            className="storyboard-grid-columns"
            style={{
              display: 'flex',
              gap: '20px',
              padding: '10px',
              height: '100%',
              overflowX: 'auto',
              alignItems: 'flex-start'
            }}
          >
            {activeBookDetails.chapters.map((ch) => {
              const chapterCards = cards
                .filter(c => c.chapterId === ch.id)
                .sort((a, b) => a.sortOrder - b.sortOrder);

              return (
                <div 
                  key={ch.id} 
                  className="storyboard-column"
                  onDragOver={handleDragOver}
                  onDrop={(e) => handleDropOnChapter(e, ch.id)}
                  style={{
                    width: '320px',
                    minWidth: '320px',
                    background: 'rgba(255,255,255,0.01)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '12px',
                    maxHeight: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    padding: '12px',
                    boxShadow: 'var(--shadow-sm)'
                  }}
                >
                  {/* Column Header */}
                  <div 
                    style={{ 
                      display: 'flex', 
                      justifyContent: 'space-between', 
                      alignItems: 'center', 
                      marginBottom: '12px', 
                      borderBottom: '1px solid var(--border-color)', 
                      paddingBottom: '8px' 
                    }}
                  >
                    <span 
                      style={{ 
                        fontSize: '13px', 
                        fontWeight: 600, 
                        color: 'var(--text-primary)', 
                        whiteSpace: 'nowrap', 
                        overflow: 'hidden', 
                        textOverflow: 'ellipsis' 
                      }}
                      title={ch.title}
                    >
                      {ch.title}
                    </span>
                    <button 
                      className="btn btn-icon-only" 
                      onClick={() => handleAddCard(ch.id)}
                      title="Add Scene Card"
                      style={{ padding: '4px', borderRadius: '4px' }}
                    >
                      <Plus size={14} />
                    </button>
                  </div>

                  {/* Column Cards Stack */}
                  <div 
                    style={{ 
                      display: 'flex', 
                      flexDirection: 'column', 
                      gap: '12px', 
                      overflowY: 'auto', 
                      flex: 1, 
                      paddingRight: '4px' 
                    }}
                  >
                    {chapterCards.length === 0 ? (
                      <div 
                        style={{ 
                          border: '1px dashed var(--border-color)', 
                          borderRadius: '8px', 
                          padding: '24px 12px', 
                          textAlign: 'center', 
                          fontSize: '11px', 
                          color: 'var(--text-muted)' 
                        }}
                      >
                        No scene cards yet. Drop a card here or click '+' to create one.
                      </div>
                    ) : (
                      chapterCards.map((card, pgIdx) => {
                        const colorInfo = PLOT_COLORS.find(c => c.class === card.color) || PLOT_COLORS[0];
                        const isEditing = activeEditingCard === card.id;

                        return (
                          <div
                            key={card.id}
                            draggable
                            onDragStart={(e) => handleDragStart(e, card.id)}
                            onDragOver={handleDragOver}
                            onDrop={(e) => handleDropOnCard(e, card.id)}
                            className={`storyboard-card ${card.color || 'story-color-default'}`}
                            style={{
                              background: colorInfo.hex,
                              border: `1px solid ${colorInfo.border}`,
                              borderRadius: '8px',
                              padding: '12px',
                              cursor: 'grab',
                              opacity: draggedCardId === card.id ? 0.3 : 1,
                              display: 'flex',
                              flexDirection: 'column',
                              gap: '8px',
                              boxShadow: 'var(--shadow-sm)',
                              transition: 'transform 0.15s, opacity 0.15s'
                            }}
                          >
                            {/* Card Header (Title / Delete) */}
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              {isEditing && editingField === 'title' ? (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flex: 1 }}>
                                  <input 
                                    type="text" 
                                    value={editingText}
                                    onChange={(e) => setEditingText(e.target.value)}
                                    autoFocus
                                    onBlur={() => handleUpdateCardText(card.id, 'title', editingText)}
                                    onKeyDown={(e) => e.key === 'Enter' && handleUpdateCardText(card.id, 'title', editingText)}
                                    style={{
                                      flex: 1,
                                      fontSize: '12px',
                                      background: 'rgba(0,0,0,0.3)',
                                      border: '1px solid var(--accent-secondary)',
                                      borderRadius: '4px',
                                      color: 'var(--text-primary)',
                                      padding: '2px 6px',
                                      outline: 'none'
                                    }}
                                  />
                                </div>
                              ) : (
                                <span 
                                  onClick={() => {
                                    setActiveEditingCard(card.id);
                                    setEditingField('title');
                                    setEditingText(card.title || '');
                                  }}
                                  style={{ 
                                    fontSize: '12px', 
                                    fontWeight: 600, 
                                    color: 'var(--text-primary)', 
                                    cursor: 'pointer',
                                    flex: 1,
                                    whiteSpace: 'nowrap',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis'
                                  }}
                                >
                                  {card.title || `Scene Card ${pgIdx + 1}`}
                                </span>
                              )}

                              <button 
                                className="btn-icon-only" 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteCard(card.id);
                                }}
                                title="Delete Card"
                                style={{ padding: '2px', opacity: 0.6 }}
                              >
                                <Trash2 size={11} />
                              </button>
                            </div>

                            {/* Card Synopsis Outline */}
                            {isEditing && editingField === 'outline' ? (
                              <textarea
                                value={editingText}
                                onChange={(e) => setEditingText(e.target.value)}
                                autoFocus
                                onBlur={() => handleUpdateCardText(card.id, 'outline', editingText)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter' && !e.shiftKey) {
                                    e.preventDefault();
                                    handleUpdateCardText(card.id, 'outline', editingText);
                                  }
                                }}
                                style={{
                                  width: '100%',
                                  height: '80px',
                                  background: 'rgba(0,0,0,0.3)',
                                  border: '1px solid var(--accent-secondary)',
                                  borderRadius: '6px',
                                  color: 'var(--text-primary)',
                                  fontSize: '11px',
                                  padding: '6px',
                                  resize: 'none',
                                  outline: 'none'
                                }}
                              />
                            ) : (
                              <p 
                                onClick={() => {
                                  setActiveEditingCard(card.id);
                                  setEditingField('outline');
                                  setEditingText(card.outline || '');
                                }}
                                style={{ 
                                  fontSize: '11px', 
                                  lineHeight: '1.4', 
                                  margin: 0, 
                                  color: card.outline ? 'var(--text-secondary)' : 'var(--text-muted)',
                                  fontStyle: card.outline ? 'normal' : 'italic',
                                  cursor: 'pointer',
                                  minHeight: '40px'
                                }}
                              >
                                {card.outline || 'Click to write scene summary outline...'}
                              </p>
                            )}

                            {/* Card Footer Colors */}
                            <div 
                              style={{ 
                                display: 'flex', 
                                gap: '6px', 
                                borderTop: '1px solid rgba(255,255,255,0.03)', 
                                paddingTop: '8px', 
                                overflowX: 'auto',
                                marginTop: '4px'
                              }}
                            >
                              {PLOT_COLORS.map(color => (
                                <button
                                  key={color.class}
                                  type="button"
                                  className={`story-color-dot ${card.color === color.class || (!card.color && color.class === 'story-color-default') ? 'active' : ''}`}
                                  onClick={() => handleSelectColor(card.id, color.class === 'story-color-default' ? null : color.class)}
                                  title={color.name}
                                  style={{
                                    width: '10px',
                                    height: '10px',
                                    borderRadius: '50%',
                                    border: card.color === color.class ? '1px solid var(--text-primary)' : 'none',
                                    background: color.class === 'story-color-default' ? 'var(--text-secondary)' : color.hex.replace('0.15', '0.8'),
                                    cursor: 'pointer',
                                    padding: 0
                                  }}
                                />
                              ))}
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {!loading && viewMode === 'network' && (
          <div style={{ position: 'relative', width: '100%', height: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center', background: 'rgba(0,0,0,0.2)', borderRadius: '12px' }}>
            {nodes.length === 0 ? (
              <div style={{ textAlign: 'center', opacity: 0.5, color: 'var(--text-secondary)' }}>
                <BookOpen size={48} style={{ marginBottom: '16px' }} />
                <h3>No Characters Defined</h3>
                <p style={{ fontSize: '13px' }}>Create characters in the right panel sidebar to map plot mentions.</p>
              </div>
            ) : (
              <svg width="600" height="500" style={{ maxWidth: '100%', maxHeight: '100%' }}>
                {/* Links */}
                {links.map((link, idx) => {
                  const sourceNode = nodes.find(n => n.id === link.source);
                  const targetNode = nodes.find(n => n.id === link.target);
                  if (!sourceNode || !targetNode) return null;
                  return (
                    <line
                      key={idx}
                      x1={sourceNode.x}
                      y1={sourceNode.y}
                      x2={targetNode.x}
                      y2={targetNode.y}
                      stroke="var(--accent-primary)"
                      strokeWidth={Math.min(8, 1 + link.value * 0.75)}
                      strokeOpacity={0.3}
                    />
                  );
                })}

                {/* Nodes */}
                {nodes.map(node => {
                  const size = Math.max(16, 24 + node.weight * 1.5);
                  return (
                    <g key={node.id} transform={`translate(${node.x}, ${node.y})`}>
                      <circle
                        r={size}
                        fill="rgba(139, 92, 246, 0.12)"
                        stroke="var(--accent-secondary)"
                        strokeWidth="1.5"
                      />
                      <circle
                        r={6}
                        fill="var(--accent-primary)"
                      />
                      <text
                        y={size + 14}
                        textAnchor="middle"
                        fill="var(--text-primary)"
                        fontSize="10px"
                        fontWeight="600"
                        style={{ pointerEvents: 'none' }}
                      >
                        {node.name}
                      </text>
                      <text
                        y={size + 24}
                        textAnchor="middle"
                        fill="var(--text-muted)"
                        fontSize="8px"
                        style={{ pointerEvents: 'none' }}
                      >
                        {node.weight} mentions
                      </text>
                    </g>
                  );
                })}
              </svg>
            )}

            {/* Network graph legend */}
            <div style={{ position: 'absolute', bottom: '16px', left: '16px', background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '12px', fontSize: '11px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>Co-occurrence Legend:</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: 'var(--accent-primary)' }} />
                <span>Character Mentions</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ width: '16px', height: '2px', background: 'var(--accent-primary)', opacity: 0.5 }} />
                <span>Shared scene occurrences (thickness maps frequency)</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
