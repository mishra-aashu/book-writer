import React from 'react';
import { BookMarked, Plus, Sun, Moon, Sparkles, Trash2, BookOpen, Film } from 'lucide-react';
import type { Book } from './types';

interface DashboardProps {
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
  return (
    <>
      <div className="dashboard-container no-print">
        <div className="dashboard-header">
          <div className="brand">
            <BookMarked className="brand-icon" />
            <div>
              <h1 className="brand-title">Ligama Book Writer</h1>
              <p className="brand-subtitle">Professional high-performance desktop studio</p>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '12px' }}>
            <button className="btn btn-secondary" onClick={onCheckUpdates} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Sparkles size={14} style={{ color: 'var(--accent-secondary)' }} />
              Check Updates
            </button>
            <button className="btn btn-secondary" onClick={toggleTheme}>
              {lightTheme ? <Moon size={16} /> : <Sun size={16} />}
              Theme
            </button>
            <button className="btn btn-primary" onClick={onOpenCreateModal}>
              <Plus size={18} />
              Create New Book
            </button>
          </div>
        </div>

        <h2 style={{ width: '100%', maxWidth: '1100px', marginBottom: '20px', fontSize: '18px', opacity: 0.8 }}>
          Your Literary Projects
        </h2>

        {books.length === 0 ? (
          <div
            className="book-card"
            style={{ maxWidth: '1100px', width: '100%', alignItems: 'center', justifyContent: 'center', textAlign: 'center', opacity: 0.8 }}
            onClick={onOpenCreateModal}
          >
            <Sparkles size={48} style={{ color: 'var(--accent-secondary)', marginBottom: '16px' }} />
            <h3 style={{ fontSize: '20px', fontWeight: 600, marginBottom: '8px' }}>Create Your First Masterpiece</h3>
            <p style={{ color: 'var(--text-secondary)', maxWidth: '400px' }}>
              Start writing with async FTS5 text search, automatic character linking, page versioning, and customized page templates.
            </p>
          </div>
        ) : (
          <div className="books-grid">
            {books.map((book) => (
              <div key={book.id} className="book-card" onClick={() => onOpenBook(book.id)}>
                <div>
                  <h3 className="book-card-title">{book.title}</h3>
                  <p className="book-card-author">By {book.author}</p>
                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', margin: '8px 0' }}>
                    <span style={{ fontSize: '11px', background: 'rgba(255, 255, 255, 0.05)', color: 'var(--text-secondary)', padding: '2px 6px', borderRadius: '4px', border: '1px solid var(--border-color)', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                      {book.project_type === 'screenplay' ? (
                        <>
                          <Film size={11} style={{ marginRight: '2px' }} />
                          Screenplay
                        </>
                      ) : (
                        <>
                          <BookOpen size={11} style={{ marginRight: '2px' }} />
                          Novel
                        </>
                      )}
                    </span>
                    {book.genre && (
                      <span style={{ fontSize: '11px', background: 'var(--accent-glow)', color: 'var(--accent-secondary)', padding: '2px 6px', borderRadius: '4px' }}>
                        {book.genre}
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
