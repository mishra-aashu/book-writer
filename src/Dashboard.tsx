import React, { useState } from 'react';
import { 
  BookMarked, Plus, Sun, Moon, Trash2, BookOpen, Film, 
  Palette, Compass, Settings, ArrowRight, Target,
  Feather, RefreshCw
} from 'lucide-react';
import type { Book } from './types';
import { THEME_PRESETS, applyThemePreset } from './utils/themePresets';

interface DashboardProps {
  userProfile: {
    name: string;
    writingRole: string;
    focusArea: string;
    selectedTheme: string;
  };
  onUpdateProfile: (profile: {
    name: string;
    writingRole: string;
    focusArea: string;
    selectedTheme: string;
  }) => void;
  books: Book[];
  lightTheme: boolean;
  toggleTheme: () => void;
  onOpenBook: (id: string) => void;
  onDeleteBook: (id: string, e: React.MouseEvent) => void;
  onOpenCreateModal: () => void;
  onCheckUpdates: () => void;
  // Create book modal state
  showCreateBookModal: boolean;
  newBookTitle: string;
  newBookAuthor: string;
  newBookGenre: string;
  newBookDesc: string;
  newBookProjectType: 'novel' | 'screenplay';
  onNewBookTitle: (v: string) => void;
  onNewBookAuthor: (v: string) => void;
  onNewBookGenre: (v: string) => void;
  onNewBookDesc: (v: string) => void;
  onNewBookProjectType: (v: 'novel' | 'screenplay') => void;
  onSubmitCreateBook: (e: React.FormEvent) => void;
  onCancelCreateBook: () => void;
}

const Dashboard: React.FC<DashboardProps> = ({
  userProfile,
  onUpdateProfile,
  books,
  lightTheme,
  toggleTheme,
  onOpenBook,
  onDeleteBook,
  onOpenCreateModal,
  onCheckUpdates,
  showCreateBookModal,
  newBookTitle,
  newBookAuthor,
  newBookGenre,
  newBookDesc,
  newBookProjectType,
  onNewBookTitle,
  onNewBookAuthor,
  onNewBookGenre,
  onNewBookDesc,
  onNewBookProjectType,
  onSubmitCreateBook,
  onCancelCreateBook,
}) => {
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showColorsDropdown, setShowColorsDropdown] = useState(false);
  const [editName, setEditName] = useState(userProfile.name);
  const [editRole, setEditRole] = useState(userProfile.writingRole);
  const [editFocus, setEditFocus] = useState(userProfile.focusArea);
  const [editTheme, setEditTheme] = useState(userProfile.selectedTheme);

  // Time of day greeting calculator
  const getGreeting = () => {
    const hrs = new Date().getHours();
    if (hrs >= 5 && hrs < 12) return 'Good Morning';
    if (hrs >= 12 && hrs < 17) return 'Good Afternoon';
    if (hrs >= 17 && hrs < 22) return 'Good Evening';
    return 'Good Night';
  };

  const getRoleGreetingSubtitle = (role: string) => {
    switch (role) {
      case 'novelist': return "Let's weave words into worlds today.";
      case 'screenwriter': return "Let's bring characters to life scene by scene.";
      case 'playwright': return "Let's draft dramatic acts and intense dialogues.";
      case 'poet': return "Let's capture deep emotions in rhythmic verses.";
      default: return "Ready to make progress on your masterpiece?";
    }
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'novelist': return <BookOpen size={16} />;
      case 'screenwriter': return <Film size={16} />;
      case 'playwright': return <Compass size={16} />;
      case 'poet': return <Feather size={16} />;
      default: return <Target size={16} />;
    }
  };

  // Sort books by updated time desc to get the last active book
  const sortedBooks = [...books].sort((a, b) => b.updated_at - a.updated_at);
  const lastBook = sortedBooks[0];

  const handleOpenProfileModal = () => {
    setEditName(userProfile.name);
    setEditRole(userProfile.writingRole);
    setEditFocus(userProfile.focusArea);
    setEditTheme(userProfile.selectedTheme);
    setShowProfileModal(true);
  };

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateProfile({
      name: editName.trim(),
      writingRole: editRole,
      focusArea: editFocus,
      selectedTheme: editTheme
    });
    setShowProfileModal(false);
  };

  const handleThemePreview = (themeKey: string) => {
    setEditTheme(themeKey);
    applyThemePreset(themeKey, lightTheme);
  };

  return (
    <>
      <div className="dashboard-container no-print">
        {/* Top Navbar */}
        <div className="dashboard-header">
          <div className="brand">
            <BookMarked className="brand-icon" />
            <div>
              <h1 className="brand-title">Ligama Book Writer</h1>
              <p className="brand-subtitle">Where your passionate stories & screenplays come to life</p>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
            <button className="btn btn-secondary" onClick={onCheckUpdates} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <RefreshCw size={14} style={{ color: 'var(--accent-secondary)' }} />
              Check Updates
            </button>
            <button className="btn btn-secondary" onClick={handleOpenProfileModal} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Settings size={14} />
              Studio Setup
            </button>

            {/* Dark/Light mode button */}
            <button 
              className="btn btn-secondary" 
              onClick={toggleTheme}
              style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
              title="Toggle Light/Dark Mode"
            >
              {lightTheme ? <Moon size={14} /> : <Sun size={14} />}
              {lightTheme ? 'Dark Mode' : 'Light Mode'}
            </button>

            {/* Colors Preset Selector Dropdown */}
            <div style={{ position: 'relative' }}>
              <button 
                className="btn btn-secondary" 
                onClick={() => setShowColorsDropdown(!showColorsDropdown)}
                style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '6px', 
                  background: showColorsDropdown ? 'var(--accent-glow)' : '',
                  border: showColorsDropdown ? '1.5px solid var(--accent-primary)' : ''
                }}
                title="Select Theme Colors"
              >
                <Palette size={14} style={{ color: 'var(--accent-primary)' }} />
                Colors
              </button>
              
              {showColorsDropdown && (
                <div 
                  style={{
                    position: 'absolute',
                    top: 'calc(100% + 8px)',
                    right: 0,
                    background: 'var(--bg-card)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '12px',
                    padding: '8px',
                    width: '220px',
                    zIndex: 999,
                    boxShadow: '0 10px 25px rgba(0,0,0,0.45)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '4px'
                  }}
                >
                  <div style={{ fontSize: '10.5px', color: 'var(--text-secondary)', padding: '4px 8px', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid var(--border-color)', marginBottom: '4px', fontWeight: 600 }}>
                    Workspace Themes
                  </div>
                  {THEME_PRESETS.map((preset) => {
                    const isActive = userProfile.selectedTheme === preset.key;
                    const primaryColor = preset.colors.dark['--accent-primary'];
                    const secondaryColor = preset.colors.dark['--accent-secondary'];
                    return (
                      <button
                        key={preset.key}
                        type="button"
                        onClick={() => {
                          onUpdateProfile({
                            ...userProfile,
                            selectedTheme: preset.key
                          });
                          applyThemePreset(preset.key, lightTheme);
                          setShowColorsDropdown(false);
                        }}
                        style={{
                          width: '100%',
                          background: isActive ? 'var(--accent-glow)' : 'transparent',
                          border: 'none',
                          padding: '8px 10px',
                          borderRadius: '8px',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          cursor: 'pointer',
                          textAlign: 'left',
                          transition: 'background 0.2s'
                        }}
                      >
                        <span style={{ fontSize: '12.5px', color: 'var(--text-primary)', fontWeight: isActive ? 600 : 400 }}>
                          {preset.name}
                        </span>
                        <div style={{ display: 'flex', gap: '3px' }}>
                          <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: primaryColor }} />
                          <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: secondaryColor }} />
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            <button className="btn btn-primary" onClick={onOpenCreateModal}>
              <Plus size={18} />
              Create New Book
            </button>
          </div>
        </div>

        {/* Sleek, 1-2 line Studio Banner */}
        <div 
          style={{
            width: '100%',
            maxWidth: '1100px',
            background: 'linear-gradient(90deg, var(--accent-glow) 0%, rgba(255, 255, 255, 0.02) 100%)',
            border: '1.5px solid var(--border-color)',
            borderRadius: '12px',
            padding: '14px 20px',
            marginBottom: '24px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: '16px',
            flexWrap: 'wrap'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              background: 'var(--accent-glow)',
              color: 'var(--accent-primary)',
              width: '32px',
              height: '32px',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0
            }}>
              {getRoleIcon(userProfile.writingRole)}
            </div>
            <div style={{ fontSize: '13.5px', color: 'var(--text-primary)', lineHeight: 1.4 }}>
              <strong>{getGreeting()}, {userProfile.name}!</strong> {getRoleGreetingSubtitle(userProfile.writingRole)} 
              {lastBook ? (
                <span>
                  {' '}Continue working on <strong style={{ color: 'var(--accent-secondary)' }}>{lastBook.title}</strong>.
                </span>
              ) : (
                <span> Get started by creating your first literary project.</span>
              )}
            </div>
          </div>
          
          {lastBook ? (
            <button 
              onClick={() => onOpenBook(lastBook.id)}
              className="btn btn-primary"
              style={{
                padding: '6px 14px',
                borderRadius: '8px',
                fontSize: '12px',
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                boxShadow: '0 2px 8px var(--accent-glow)'
              }}
            >
              Resume Writing
              <ArrowRight size={12} />
            </button>
          ) : (
            <button 
              onClick={onOpenCreateModal}
              className="btn btn-primary"
              style={{
                padding: '6px 14px',
                borderRadius: '8px',
                fontSize: '12px',
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                boxShadow: '0 2px 8px var(--accent-glow)'
              }}
            >
              Create Book
              <ArrowRight size={12} />
            </button>
          )}
        </div>

        {/* Existing Projects Grid */}
        <h2 style={{ width: '100%', maxWidth: '1100px', marginBottom: '20px', fontSize: '18px', opacity: 0.8 }}>
          Your Literary Projects
        </h2>

        {books.length === 0 ? (
          <div
            className="book-card"
            style={{ maxWidth: '1100px', width: '100%', alignItems: 'center', justifyContent: 'center', textAlign: 'center', opacity: 0.8 }}
            onClick={onOpenCreateModal}
          >
            <BookOpen size={48} style={{ color: 'var(--accent-secondary)', marginBottom: '16px' }} />
            <h3 style={{ fontSize: '20px', fontWeight: 600, marginBottom: '8px' }}>Create Your First Book</h3>
            <p style={{ color: 'var(--text-secondary)', maxWidth: '400px' }}>
              Begin your writing journey. Organize chapters, track characters, and view your history—all in one place.
            </p>
          </div>
        ) : (
          <div className="books-grid">
            {books.map((book) => (
              <div key={book.id} className="book-card" onClick={() => onOpenBook(book.id)}>
                <div>
                  <h3 className="book-card-title">{book.title}</h3>
                  <p className="book-card-author">By {book.author}</p>
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', margin: '10px 0 6px 0' }}>
                    {book.project_type === 'screenplay' ? (
                      <span style={{ 
                        fontSize: '10.5px', 
                        background: 'rgba(245, 158, 11, 0.08)', 
                        color: '#f59e0b', 
                        padding: '3px 8px', 
                        borderRadius: '6px', 
                        border: '1px solid rgba(245, 158, 11, 0.25)', 
                        display: 'inline-flex', 
                        alignItems: 'center', 
                        gap: '4px',
                        fontWeight: 500
                      }}>
                        <Film size={11} />
                        Screenplay
                      </span>
                    ) : (
                      <span style={{ 
                        fontSize: '10.5px', 
                        background: 'var(--accent-glow)', 
                        color: 'var(--accent-secondary)', 
                        padding: '3px 8px', 
                        borderRadius: '6px', 
                        border: '1px solid var(--accent-primary)', 
                        display: 'inline-flex', 
                        alignItems: 'center', 
                        gap: '4px',
                        fontWeight: 500
                      }}>
                        <BookOpen size={11} />
                        Novel
                      </span>
                    )}
                    {book.genre && (
                      <span style={{ 
                        fontSize: '10.5px', 
                        background: 'rgba(255, 255, 255, 0.03)', 
                        color: 'var(--text-secondary)', 
                        padding: '3px 8px', 
                        borderRadius: '6px',
                        border: '1px solid var(--border-color)',
                        opacity: 0.9
                      }}>
                        # {book.genre.toLowerCase()}
                      </span>
                    )}
                  </div>
                  <p className="book-card-description">{book.description || 'No description provided.'}</p>
                </div>
                <div className="book-card-footer">
                  <span className="book-card-meta">
                    Edited {new Date(book.updated_at * 1000).toLocaleDateString()}
                  </span>
                  <button
                    className="book-card-delete"
                    onClick={(e) => onDeleteBook(book.id, e)}
                    title="Delete Book"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Profile & Theme Studio Settings Modal */}
      {showProfileModal && (
        <div className="modal-backdrop no-print">
          <div className="modal-content" style={{ maxWidth: '580px', width: '90%' }}>
            <h3 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Settings size={18} style={{ color: 'var(--accent-primary)' }} />
              Workspace Studio Settings
            </h3>
            
            <form onSubmit={handleSaveProfile}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div>
                  <label style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>Name / Identity</label>
                  <input 
                    type="text" 
                    className="input" 
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    required 
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div>
                    <label style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>Writing Format</label>
                    <select className="select" value={editRole} onChange={(e) => setEditRole(e.target.value)}>
                      <option value="screenwriter">Screenplay & Film Writer</option>
                      <option value="novelist">Novel & Story Writer</option>
                      <option value="playwright">Playwright & Dramatist</option>
                      <option value="poet">Poet / Songwriter</option>
                    </select>
                  </div>
                  
                  <div>
                    <label style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>Creative Focus</label>
                    <select className="select" value={editFocus} onChange={(e) => setEditFocus(e.target.value)}>
                      <option value="outlining">Plotting & Storyboard</option>
                      <option value="characters">Dialogue & Character Arc</option>
                      <option value="drafting">Speed Drafting</option>
                      <option value="publishing">Industry Formatting</option>
                    </select>
                  </div>
                </div>

                {/* Theme Selector */}
                <div>
                  <label style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'block', marginBottom: '8px' }}>
                    Select Color Combination (Previews Instantly)
                  </label>
                  <div 
                    style={{ 
                      display: 'grid', 
                      gridTemplateColumns: 'repeat(2, 1fr)', 
                      gap: '8px',
                      maxHeight: '180px',
                      overflowY: 'auto',
                      paddingRight: '4px'
                    }}
                  >
                    {THEME_PRESETS.map((preset) => {
                      const isActive = editTheme === preset.key;
                      const primaryColor = preset.colors.dark['--accent-primary'];
                      const secondaryColor = preset.colors.dark['--accent-secondary'];
                      
                      return (
                        <div
                          key={preset.key}
                          onClick={() => handleThemePreview(preset.key)}
                          style={{
                            background: isActive ? 'var(--accent-glow)' : 'rgba(255, 255, 255, 0.02)',
                            border: `1.5px solid ${isActive ? 'var(--accent-primary)' : 'var(--border-color)'}`,
                            borderRadius: '8px',
                            padding: '10px',
                            cursor: 'pointer',
                            transition: 'all 0.2s',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center'
                          }}
                        >
                          <div>
                            <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)' }}>{preset.name}</div>
                          </div>
                          
                          <div style={{ display: 'flex', gap: '3px' }}>
                            <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: primaryColor }} />
                            <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: secondaryColor }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '10px' }}>
                  <button 
                    type="button" 
                    className="btn btn-secondary" 
                    onClick={() => {
                      // Reset real-time preview back to the saved theme
                      applyThemePreset(userProfile.selectedTheme, lightTheme);
                      setShowProfileModal(false);
                    }}
                  >
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary">Save Changes</button>
                </div>

              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create Book Modal */}
      {showCreateBookModal && (
        <div className="modal-backdrop no-print">
          <div className="modal-content">
            <h3 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '20px' }}>Create New Literary Project</h3>
            <form onSubmit={onSubmitCreateBook}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div>
                  <label style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>Book Title *</label>
                  <input type="text" className="input" placeholder="Enter book title..." value={newBookTitle} onChange={(e) => onNewBookTitle(e.target.value)} required />
                </div>
                <div>
                  <label style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>Author *</label>
                  <input type="text" className="input" placeholder="Author's name..." value={newBookAuthor} onChange={(e) => onNewBookAuthor(e.target.value)} required />
                </div>
                <div>
                  <label style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>Project Format *</label>
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <button
                      type="button"
                      className={`btn ${newBookProjectType === 'novel' ? 'btn-primary' : 'btn-secondary'}`}
                      style={{ flexGrow: 1, padding: '10px', fontSize: '13px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                      onClick={() => onNewBookProjectType('novel')}
                    >
                      <BookOpen size={14} /> Novel (Prose)
                    </button>
                    <button
                      type="button"
                      className={`btn ${newBookProjectType === 'screenplay' ? 'btn-primary' : 'btn-secondary'}`}
                      style={{ flexGrow: 1, padding: '10px', fontSize: '13px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                      onClick={() => onNewBookProjectType('screenplay')}
                    >
                      <Film size={14} /> Script (Screenplay)
                    </button>
                  </div>
                </div>
                <div>
                  <label style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>Genre / Subheading</label>
                  <input type="text" className="input" placeholder="Fiction, Drama, Poetry..." value={newBookGenre} onChange={(e) => onNewBookGenre(e.target.value)} />
                </div>
                <div>
                  <label style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>Project Description</label>
                  <textarea
                    className="input"
                    style={{ resize: 'none', height: '80px' }}
                    placeholder="A brief overview of your project..."
                    value={newBookDesc}
                    onChange={(e) => onNewBookDesc(e.target.value)}
                  />
                </div>
                <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '10px' }}>
                  <button type="button" className="btn btn-secondary" onClick={onCancelCreateBook}>Cancel</button>
                  <button type="submit" className="btn btn-primary">Create Project</button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
};

export default Dashboard;
