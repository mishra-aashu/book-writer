import { useState, useEffect, useRef } from 'react';
import './App.css';
import { invoke } from './mockInvoke';
import { ConfirmModal, PromptModal, TemplateSelectModal } from './Modals';

import Dashboard from './Dashboard';
import OutlineSidebar from './OutlineSidebar';
import EditorPane from './EditorPane';
import RightPanel from './RightPanel';
import { Preview } from './prev';

import type {
  Book, Chapter, Page, Template, PageVersion,
  SearchResult, BookDetails, AutosaveStatus, ActiveTab, ActiveFont, HeaderFont, EditorWidth,
} from './types';

const splitHtmlAtLimit = (html: string, limitValue: number, limitType: 'words' | 'chars') => {
  if (typeof window === 'undefined') return { keep: html, move: '' };
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');
  const nodes = Array.from(doc.body.childNodes);
  
  let currentCount = 0;
  let splitIndex = nodes.length;
  
  for (let i = 0; i < nodes.length; i++) {
    const text = nodes[i].textContent || '';
    const cleanText = text.replace(/\s+/g, ' ').trim();
    const count = limitType === 'words' 
      ? (cleanText === '' ? 0 : cleanText.split(/\s+/).length)
      : cleanText.length;
      
    if (currentCount + count > limitValue) {
      splitIndex = i;
      break;
    }
    currentCount += count;
  }
  
  if (splitIndex === 0 && nodes.length > 1) {
    splitIndex = 1;
  }
  
  const keepNodes = nodes.slice(0, splitIndex);
  const moveNodes = nodes.slice(splitIndex);
  
  const keepDiv = document.createElement('div');
  keepNodes.forEach(n => keepDiv.appendChild(n.cloneNode(true)));
  
  const moveDiv = document.createElement('div');
  moveNodes.forEach(n => moveDiv.appendChild(n.cloneNode(true)));
  
  return {
    keep: keepDiv.innerHTML,
    move: moveDiv.innerHTML
  };
};

function App() {
  // ── Core Data State ──
  const [books, setBooks] = useState<Book[]>([]);
  const [activeBookId, setActiveBookId] = useState<string | null>(null);
  const [activeBookDetails, setActiveBookDetails] = useState<BookDetails | null>(null);
  const [activeChapterId, setActiveChapterId] = useState<string | null>(null);
  const [activePageId, setActivePageId] = useState<string | null>(null);
  const [pageContent, setPageContent] = useState<Record<string, string>>({});
  const [templates, setTemplates] = useState<Template[]>([]);

  // ── Right Sidebar State ──
  const [activeTab, setActiveTab] = useState<ActiveTab>('write');
  const [versions, setVersions] = useState<PageVersion[]>([]);
  const [activeRegionKey, setActiveRegionKey] = useState<string>('main');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [selectedCharacterId, setSelectedCharacterId] = useState<string | null>(null);
  const [selectedCharacterMentions, setSelectedCharacterMentions] = useState<Page[]>([]);

  // ── Modal & Form State ──
  const [showCreateBookModal, setShowCreateBookModal] = useState(false);
  const [newBookTitle, setNewBookTitle] = useState('');
  const [newBookAuthor, setNewBookAuthor] = useState('');
  const [newBookGenre, setNewBookGenre] = useState('');
  const [newBookDesc, setNewBookDesc] = useState('');
  const [newBookProjectType, setNewBookProjectType] = useState<'novel' | 'screenplay'>('novel');

  const [showCreateCharModal, setShowCreateCharModal] = useState(false);
  const [newCharName, setNewCharName] = useState('');
  const [newCharDesc, setNewCharDesc] = useState('');
  const [newCharKeywords, setNewCharKeywords] = useState('');

  const [editingChapterId, setEditingChapterId] = useState<string | null>(null);
  const [editingChapterTitle, setEditingChapterTitle] = useState('');

  // ── Focus Tracking State ──
  const [focusHint, setFocusHint] = useState<{ target: 'start' | 'end' | 'none'; timestamp: number }>({ target: 'none', timestamp: 0 });

  // ── UI / Appearance State ──
  const [previewMode, setPreviewMode] = useState(false);
  const [autosaveStatus, setAutosaveStatus] = useState<AutosaveStatus>('idle');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [lightTheme, setLightTheme] = useState(false);
  const [activeFont, setActiveFont] = useState<ActiveFont>('garamond');
  const [headerFont, setHeaderFont] = useState<HeaderFont>('playfair');
  const [fontSize, setFontSize] = useState<number>(18);
  const [lineHeight, setLineHeight] = useState<number>(1.65);
  const [letterSpacing, setLetterSpacing] = useState<number>(0);
  const [paragraphSpacing, setParagraphSpacing] = useState<number>(0.5);
  const [editorWidth, setEditorWidth] = useState<EditorWidth>('medium');
  const [focusMode, setFocusMode] = useState(false);
  const [showAppearanceMenu, setShowAppearanceMenu] = useState(false);
  const [fitToScreen, setFitToScreen] = useState(false);
  const [pageHeight, setPageHeight] = useState<number>(1000);
  const [pagePadding, setPagePadding] = useState<number>(60);
  const [limitEnabled, setLimitEnabled] = useState<boolean>(true);
  const [limitType, setLimitType] = useState<'words' | 'chars'>('chars');
  const [limitValue, setLimitValue] = useState<number>(2000);
  const [selectedTextExists, setSelectedTextExists] = useState(false);
  const [allPagesContent, setAllPagesContent] = useState<Record<string, Record<string, string>>>({});

  // ── Export State ──
  const [exportPath, setExportPath] = useState('/home/aashu/Downloads/my_novel.epub');
  const [exportMessage, setExportMessage] = useState<{ success: boolean; text: string } | null>(null);

  // ── System Modal State ──
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean; title: string; message: string; isDanger?: boolean; onConfirm: () => void;
  } | null>(null);
  const [promptModal, setPromptModal] = useState<{
    isOpen: boolean; title: string; placeholder?: string; defaultValue?: string; onConfirm: (val: string) => void;
  } | null>(null);
  const [templateModal, setTemplateModal] = useState<{ isOpen: boolean; chapterId: string; targetCategory: 'front_matter' | 'body' | 'back_matter' | 'screenplay' } | null>(null);

  const saveTimerRef = useRef<any>(null);
  const currentSavePromise = useRef<Promise<any> | null>(null);

  // ── Effects ──
  useEffect(() => { loadBooks(); loadTemplates(); }, []);

  useEffect(() => {
    if (activeBookId) { loadBookDetails(activeBookId); }
    else { setActiveBookDetails(null); setActiveChapterId(null); setActivePageId(null); }
  }, [activeBookId]);

  useEffect(() => {
    if (activePageId) { loadPageContent(activePageId); }
    else { setPageContent({}); }
  }, [activePageId]);

  const savedRangeRef = useRef<Range | null>(null);

  useEffect(() => {
    let hideTimeout: any = null;
    const handleSelectionChange = () => {
      const selection = window.getSelection();
      if (selection && !selection.isCollapsed && selection.toString().trim().length > 0) {
        const range = selection.getRangeAt(0);
        let node: Node | null = range.commonAncestorContainer;
        let isInsideEditor = false;
        while (node) {
          if (node instanceof HTMLElement && node.classList.contains('editor-pane')) { isInsideEditor = true; break; }
          node = node.parentNode;
        }
        if (isInsideEditor) {
          if (hideTimeout) clearTimeout(hideTimeout);
          setSelectedTextExists(true);
          setActiveTab('write');
          savedRangeRef.current = range.cloneRange();
          return;
        }
      }
      
      if (hideTimeout) clearTimeout(hideTimeout);
      hideTimeout = setTimeout(() => {
        const activeEl = document.activeElement;
        const isFocusingToolbar = activeEl && (activeEl.closest('.floating-selection-toolbar') || activeEl.closest('.right-sidebar'));
        if (!isFocusingToolbar) {
          setSelectedTextExists(false);
        }
      }, 250);
    };
    document.addEventListener('selectionchange', handleSelectionChange);
    return () => {
      document.removeEventListener('selectionchange', handleSelectionChange);
      if (hideTimeout) clearTimeout(hideTimeout);
    };
  }, []);

  // ── Data Loaders ──
  const loadBooks = async () => {
    try { setBooks(await invoke('get_books')); } catch (err) { console.error(err); }
  };
  const loadTemplates = async () => {
    try { setTemplates(await invoke('get_templates')); } catch (err) { console.error(err); }
  };
  const loadBookDetails = async (bookId: string) => {
    try {
      const data: BookDetails = await invoke('get_book_details', { bookId });
      setActiveBookDetails(data);
      if (data.chapters.length > 0 && !activeChapterId) {
        setActiveChapterId(data.chapters[0].id);
        const chPages = data.pages.filter(p => p.chapter_id === data.chapters[0].id);
        if (chPages.length > 0) setActivePageId(chPages[0].id);
      }
    } catch (err) { console.error(err); }
  };
  const loadPageContent = async (pageId: string) => {
    try {
      const data: Record<string, string> = await invoke('get_page_content', { pageId });
      setPageContent(data);
      loadVersions(pageId, activeRegionKey || 'main');
    } catch (err) { console.error(err); }
  };
  const loadVersions = async (pageId: string, regionKey: string) => {
    try { setVersions(await invoke('get_page_versions', { pageId, regionKey })); } catch (err) { console.error(err); }
  };

  // ── Book Handlers ──
  const handleCreateBook = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBookTitle.trim() || !newBookAuthor.trim()) return;
    try {
      const nb: Book = await invoke('create_book', {
        title: newBookTitle,
        author: newBookAuthor,
        genre: newBookGenre || undefined,
        description: newBookDesc || undefined,
        project_type: newBookProjectType,
      });
      setShowCreateBookModal(false);
      setNewBookTitle(''); setNewBookAuthor(''); setNewBookGenre(''); setNewBookDesc('');
      setNewBookProjectType('novel');
      await loadBooks();
      setActiveBookId(nb.id);
    } catch (err) { console.error(err); }
  };
  const handleDeleteBook = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setConfirmModal({
      isOpen: true, title: 'Delete Book Project',
      message: 'Are you sure? This cannot be undone and will erase all chapters, pages, characters, and history.',
      isDanger: true,
      onConfirm: async () => {
        setConfirmModal(null);
        try { await invoke('delete_book', { id }); if (activeBookId === id) setActiveBookId(null); loadBooks(); } catch (err) { console.error(err); }
      }
    });
  };

  // ── Chapter Handlers ──
  const handleCreateChapter = () => {
    if (!activeBookId) return;
    setPromptModal({
      isOpen: true, title: 'Create New Chapter', placeholder: 'Chapter title', defaultValue: '',
      onConfirm: async (title) => {
        setPromptModal(null);
        try {
          const newCh: Chapter = await invoke('create_chapter', { bookId: activeBookId, title: title.trim() });
          await loadBookDetails(activeBookId);
          setActiveChapterId(newCh.id);
          const updated: BookDetails = await invoke('get_book_details', { bookId: activeBookId });
          const pages = updated.pages.filter(p => p.chapter_id === newCh.id);
          if (pages.length > 0) setActivePageId(pages[0].id);
        } catch (err) { console.error(err); }
      }
    });
  };
  const handleDeleteChapter = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setConfirmModal({
      isOpen: true, title: 'Delete Chapter',
      message: 'This will permanently delete all associated pages and content.',
      isDanger: true,
      onConfirm: async () => {
        setConfirmModal(null);
        try { await invoke('delete_chapter', { id }); if (activeChapterId === id) { setActiveChapterId(null); setActivePageId(null); } loadBookDetails(activeBookId!); } catch (err) { console.error(err); }
      }
    });
  };
  const handleStartRenameChapter = (ch: Chapter, e: React.MouseEvent) => { e.stopPropagation(); setEditingChapterId(ch.id); setEditingChapterTitle(ch.title); };
  const handleSaveChapterRename = async (chId: string) => {
    if (!editingChapterTitle.trim()) return;
    try { await invoke('update_chapter_title', { id: chId, title: editingChapterTitle.trim() }); setEditingChapterId(null); loadBookDetails(activeBookId!); } catch (err) { console.error(err); }
  };
  const handleReorderChapters = async (idx: number, direction: 'up' | 'down') => {
    if (!activeBookDetails) return;
    const chapters = [...activeBookDetails.chapters];
    const target = direction === 'up' ? idx - 1 : idx + 1;
    if (target < 0 || target >= chapters.length) return;
    [chapters[idx], chapters[target]] = [chapters[target], chapters[idx]];
    try { await invoke('reorder_chapters', { chapterIds: chapters.map(c => c.id) }); loadBookDetails(activeBookId!); } catch (err) { console.error(err); }
  };

  // ── Page Handlers ──
  const handleCreatePage = (
    chapterId: string,
    category: 'front_matter' | 'body' | 'back_matter' | 'screenplay',
    e: React.MouseEvent
  ) => {
    e.stopPropagation();
    setTemplateModal({ isOpen: true, chapterId, targetCategory: category });
  };
  const handleConfirmCreatePage = async (
    templateId: string,
    category: 'front_matter' | 'body' | 'back_matter' | 'screenplay',
    pageType: string
  ) => {
    if (!templateModal) return;
    const chapterId = templateModal.chapterId;
    setTemplateModal(null);
    try {
      const newPage: Page = await invoke('create_page', { chapterId, templateId, category, pageType });
      await loadBookDetails(activeBookId!);
      setActiveChapterId(chapterId);
      setActivePageId(newPage.id);
    } catch (err) { console.error(err); }
  };
  const handleUpdatePageMeta = async (
    category: 'front_matter' | 'body' | 'back_matter' | 'screenplay',
    pageType: string
  ) => {
    if (!activePageId) return;
    try {
      await invoke('update_page_meta', { pageId: activePageId, category, pageType });
      await loadBookDetails(activeBookId!);
    } catch (err) { console.error(err); }
  };
  const handleDeletePage = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setConfirmModal({
      isOpen: true, title: 'Delete Page', message: 'Delete this page and all its region contents?', isDanger: true,
      onConfirm: async () => {
        setConfirmModal(null);
        try { await invoke('delete_page', { id }); if (activePageId === id) setActivePageId(null); loadBookDetails(activeBookId!); } catch (err) { console.error(err); }
      }
    });
  };
  const handleReorderPages = async (chapterId: string, idx: number, direction: 'up' | 'down') => {
    if (!activeBookDetails) return;
    
    let chPages: Page[] = [];
    const isVirtual = chapterId === activeBookDetails.book.id;
    
    if (isVirtual) {
      const targetPage = activeBookDetails.pages.filter(p => p.chapter_id === chapterId)[idx];
      if (!targetPage) return;
      const category = targetPage.category;
      chPages = activeBookDetails.pages.filter(p => p.chapter_id === chapterId && p.category === category);
    } else {
      chPages = activeBookDetails.pages.filter(p => p.chapter_id === chapterId && (p.category === 'body' || !p.category));
    }
    
    const target = direction === 'up' ? idx - 1 : idx + 1;
    if (target < 0 || target >= chPages.length) return;
    
    const itemA = chPages[idx];
    const itemB = chPages[target];
    
    const pagesCopy = [...activeBookDetails.pages];
    const idxA = pagesCopy.findIndex(p => p.id === itemA.id);
    const idxB = pagesCopy.findIndex(p => p.id === itemB.id);
    if (idxA !== -1 && idxB !== -1) {
      pagesCopy[idxA] = itemB;
      pagesCopy[idxB] = itemA;
    }
    
    try {
      await invoke('reorder_pages', { pageIds: pagesCopy.map(p => p.id) });
      await loadBookDetails(activeBookId!);
    } catch (err) { console.error(err); }
  };

  // ── Autosave Engine ──
  const handleFieldChange = (regionKey: string, val: string) => {
    // Check if limit is enabled, region is 'main', and the limit is exceeded
    if (limitEnabled && regionKey === 'main') {
      const cleanText = val.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
      const count = limitType === 'words' 
        ? (cleanText === '' ? 0 : cleanText.split(/\s+/).length)
        : cleanText.length;

      if (count > limitValue) {
        const { keep, move } = splitHtmlAtLimit(val, limitValue, limitType);
        
        // Update current page with kept content
        setPageContent(prev => ({ ...prev, [regionKey]: keep }));
        saveFieldData(regionKey, keep);

        // Auto-create next page and move the overflow content to it
        handleAutoCreateContinuation(move, regionKey);
        return;
      }
    }

    setPageContent(prev => ({ ...prev, [regionKey]: val }));
    setAutosaveStatus('saving');
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => saveFieldData(regionKey, val), 800);
  };
  const handleFieldBlur = (regionKey: string, val: string) => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    if (autosaveStatus === 'saving') saveFieldData(regionKey, val);
  };
  const saveFieldData = async (regionKey: string, val: string) => {
    if (!activePageId) return;
    const promise = invoke('save_page_content', { pageId: activePageId, regionKey, content: val });
    currentSavePromise.current = promise;
    try {
      await promise;
      if (currentSavePromise.current === promise) { setAutosaveStatus('saved'); loadVersions(activePageId, regionKey); loadBookDetails(activeBookId!); }
    } catch (err) { console.error(err); setAutosaveStatus('error'); }
  };

  // ── Character Handlers ──
  const handleCreateCharacter = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeBookId || !newCharName.trim()) return;
    try {
      await invoke('create_character', { bookId: activeBookId, name: newCharName.trim(), description: newCharDesc.trim() || undefined, keywords: newCharKeywords.trim() || undefined });
      setShowCreateCharModal(false);
      setNewCharName(''); setNewCharDesc(''); setNewCharKeywords('');
      loadBookDetails(activeBookId);
    } catch (err) { console.error(err); }
  };

  // ── Auto-Continuation Page Handler ──
  const handleAutoCreateContinuation = async (overflowContent: string, regionKey: string) => {
    if (!activePageId || !activeChapterId || !activeBookDetails) return;
    const currentPage = activeBookDetails.pages.find(p => p.id === activePageId);
    if (!currentPage) return;
    
    try {
      // Determine template and type for continuation page
      let templateId = currentPage.template_id || 'standard';
      let pageType = currentPage.page_type || 'standard_prose';
      const category = currentPage.category || 'body';

      if (category === 'screenplay') {
        if (templateId === 'screenplay_title' || templateId === 'screenplay_cast' || templateId === 'screenplay_act_break') {
          templateId = 'screenplay_standard';
          pageType = 'screenplay_standard';
        }
      } else {
        if (templateId === 'chapter_start' || templateId === 'title_page') {
          templateId = 'standard';
          pageType = 'standard_prose';
        }
      }

      // Create a new page with the clean continuation template and type
      const newPage: Page = await invoke('create_page', {
        chapterId: currentPage.chapter_id,
        templateId,
        category,
        pageType,
      });
      
      // Save overflow content to the new page's matching region
      await invoke('save_page_content', { 
        pageId: newPage.id, 
        regionKey, 
        content: overflowContent 
      });
      
      // Reload and navigate to the new page
      await loadBookDetails(activeBookId!);
      setActivePageId(newPage.id);
      setFocusHint({ target: 'start', timestamp: Date.now() });
    } catch (err) { console.error(err); }
  };

  const handleMergePages = async (prevPageId: string, currentPageId: string, regionKey: string, mergedContent: string) => {
    try {
      await invoke('save_page_content', { pageId: prevPageId, regionKey, content: mergedContent });
      await invoke('delete_page', { id: currentPageId });
      if (activePageId === currentPageId) setActivePageId(prevPageId);
      await loadBookDetails(activeBookId!);
    } catch (err) {
      console.error(err);
    }
  };

  const handleReflowNextPage = async (nextPageId: string, regionKey: string, newNextContent: string, deletePage: boolean, focusNextPage?: boolean) => {
    try {
      if (deletePage) {
        await invoke('delete_page', { id: nextPageId });
        if (activePageId === nextPageId) setActivePageId(null);
      } else {
        await invoke('save_page_content', { pageId: nextPageId, regionKey, content: newNextContent });
        if (focusNextPage) {
          setActivePageId(nextPageId);
          setFocusHint({ target: 'start', timestamp: Date.now() });
        }
      }
      await loadBookDetails(activeBookId!);
    } catch (err) {
      console.error(err);
    }
  };

  const handleFetchPageContent = async (pageId: string) => {
    return await invoke('get_page_content', { pageId });
  };

  const handleMergeBackward = async (currentPageId: string, regionKey: string) => {
    const pages = activeBookDetails?.pages || [];
    const currentIndex = pages.findIndex(p => p.id === currentPageId);
    if (currentIndex <= 0) return;
    
    const prevPage = pages[currentIndex - 1];
    
    try {
      const prevData: Record<string, string> = await invoke('get_page_content', { pageId: prevPage.id });
      const curData: Record<string, string> = await invoke('get_page_content', { pageId: currentPageId });
      
      const prevVal = prevData[regionKey] || '';
      const curVal = curData[regionKey] || '';
      
      const merged = prevVal.trim() + curVal;
      
      await invoke('save_page_content', { pageId: prevPage.id, regionKey, content: merged });
      await invoke('delete_page', { id: currentPageId });
      setActivePageId(prevPage.id);
      setFocusHint({ target: 'end', timestamp: Date.now() });
      await loadBookDetails(activeBookId!);
    } catch (err) {
      console.error(err);
    }
  };
  const handleDeleteCharacter = (charId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setConfirmModal({
      isOpen: true, title: 'Delete Character', message: 'Delete this character from the directory?', isDanger: true,
      onConfirm: async () => {
        setConfirmModal(null);
        try { await invoke('delete_character', { id: charId }); if (selectedCharacterId === charId) { setSelectedCharacterId(null); setSelectedCharacterMentions([]); } loadBookDetails(activeBookId!); } catch (err) { console.error(err); }
      }
    });
  };
  const loadCharacterMentions = async (charId: string) => {
    setSelectedCharacterId(charId);
    try { setSelectedCharacterMentions(await invoke('get_character_mentions', { characterId: charId })); } catch (err) { console.error(err); }
  };

  // ── Version Handler ──
  const handleRestoreVersion = (vId: string) => {
    setConfirmModal({
      isOpen: true, title: 'Restore Version Checkpoint', message: 'This will overwrite your current region content with the snapshot.', isDanger: false,
      onConfirm: async () => {
        setConfirmModal(null);
        try { await invoke('restore_page_version', { versionId: vId }); loadPageContent(activePageId!); } catch (err) { console.error(err); }
      }
    });
  };

  // ── Search ──
  const handleTriggerSearch = async () => {
    if (!activeBookId || !searchQuery.trim()) { setSearchResults([]); return; }
    try { setSearchResults(await invoke('search_book', { bookId: activeBookId, query: searchQuery.trim() })); } catch (err) { console.error(err); }
  };
  const handleJumpToSearchResult = (result: SearchResult) => {
    setActiveChapterId(result.chapter_id); setActivePageId(result.page_id); setActiveRegionKey(result.region_key);
  };

  // ── Export / Print ──
  const handleExportEpub = async () => {
    if (!activeBookId) return;
    setExportMessage(null);
    try { await invoke('export_book_to_epub', { bookId: activeBookId, savePath: exportPath }); setExportMessage({ success: true, text: `Successfully compiled to EPUB at ${exportPath}` }); }
    catch (err: any) { setExportMessage({ success: false, text: `Export Failed: ${err.toString()}` }); }
  };
  const handleTriggerPrint = async () => {
    if (!activeBookDetails) return;
    const contents: Record<string, Record<string, string>> = {};
    try {
      for (const pg of activeBookDetails.pages) { contents[pg.id] = await invoke('get_page_content', { pageId: pg.id }); }
      setAllPagesContent(contents);
      setTimeout(() => window.print(), 500);
    } catch (err) { console.error(err); }
  };

  // ── Helpers ──
  const getGridRegions = (areasStr?: string): string[] => {
    if (!areasStr) return ['header', 'main', 'footer'];
    const keys = areasStr.replace(/['"]/g, '').split(/\s+/).filter(k => k.trim().length > 0);
    return Array.from(new Set(keys));
  };
  const toggleTheme = () => { setLightTheme(prev => !prev); document.documentElement.classList.toggle('light-mode'); };
  const applySelectionStyle = (styleName: string, value: string) => {
    const selection = window.getSelection();
    if (savedRangeRef.current && selection) {
      selection.removeAllRanges();
      selection.addRange(savedRangeRef.current);
    }
    if (!selection || selection.isCollapsed || selection.rangeCount === 0) return;
    const range = selection.getRangeAt(0);
    
    // Find the closest editor element containing this selection
    let editorEl: HTMLElement | null = null;
    let anchor = selection.anchorNode;
    if (anchor) {
      let curr: Node | null = anchor;
      while (curr && curr !== document.body) {
        if (curr.nodeType === Node.ELEMENT_NODE && (curr as HTMLElement).contentEditable === 'true') {
          editorEl = curr as HTMLElement;
          break;
        }
        curr = curr.parentNode;
      }
    }

    if (['bold', 'italic', 'underline'].includes(styleName)) {
      document.execCommand(styleName, false);
    } else if (['justifyLeft', 'justifyCenter', 'justifyRight', 'justifyFull'].includes(styleName)) {
      document.execCommand(styleName, false);
    } else {
      const span = document.createElement('span');
      if (styleName === 'fontSize') span.style.fontSize = value;
      else if (styleName === 'fontFamily') span.style.fontFamily = value;
      else if (styleName === 'color') span.style.color = value;
      try { span.appendChild(range.extractContents()); range.insertNode(span); } catch (e) { console.error(e); }
    }
    
    if (editorEl) {
      const html = editorEl.innerHTML;
      // Dispatch formatted event so that RichTextEditor updates its ref without resetting cursor
      editorEl.dispatchEvent(new CustomEvent('editor-content-formatted', { detail: { html } }));
      
      // Save changes immediately
      handleFieldChange(activeRegionKey || 'main', html);
      handleFieldBlur(activeRegionKey || 'main', html);
    }
    
    savedRangeRef.current = null;
    setSelectedTextExists(false);
  };

  const activePageObj = activeBookDetails?.pages.find(p => p.id === activePageId);
  const activeTemplate = templates.find(t => t.id === activePageObj?.template_id);
  const layout = activeTemplate ? JSON.parse(activeTemplate.layout_json) : null;

  return (
    <div className={`workspace-container ${lightTheme ? 'light-mode' : ''}`}>

      {/* ── Dashboard ── */}
      {!activeBookId && (
        <Dashboard
          books={books}
          lightTheme={lightTheme}
          toggleTheme={toggleTheme}
          onOpenBook={(id) => setActiveBookId(id)}
          onDeleteBook={handleDeleteBook}
          onOpenCreateModal={() => setShowCreateBookModal(true)}
          showCreateBookModal={showCreateBookModal}
          newBookTitle={newBookTitle} newBookAuthor={newBookAuthor}
          newBookGenre={newBookGenre} newBookDesc={newBookDesc}
          newBookProjectType={newBookProjectType}
          onNewBookTitle={setNewBookTitle} onNewBookAuthor={setNewBookAuthor}
          onNewBookGenre={setNewBookGenre} onNewBookDesc={setNewBookDesc}
          onNewBookProjectType={setNewBookProjectType}
          onSubmitCreateBook={handleCreateBook}
          onCancelCreateBook={() => setShowCreateBookModal(false)}
        />
      )}

      {/* ── Workspace Studio ── */}
      {activeBookId && activeBookDetails && (
        previewMode ? (
          <Preview
            bookDetails={activeBookDetails}
            templates={templates}
            onClose={() => setPreviewMode(false)}
            activeFont={activeFont}
            headerFont={headerFont}
            fontSize={fontSize}
            lineHeight={lineHeight}
            letterSpacing={letterSpacing}
            paragraphSpacing={paragraphSpacing}
          />
        ) : (
          <>
            <OutlineSidebar
              activeBookDetails={activeBookDetails}
              activeChapterId={activeChapterId}
              activePageId={activePageId}
              editingChapterId={editingChapterId}
              editingChapterTitle={editingChapterTitle}
              sidebarCollapsed={sidebarCollapsed}
              focusMode={focusMode}
              onBackToDashboard={() => setActiveBookId(null)}
              onCreateChapter={handleCreateChapter}
              onToggleChapter={(id) => setActiveChapterId(activeChapterId === id ? null : id)}
              onSelectPage={(id) => { setActivePageId(id); setFocusHint({ target: 'none', timestamp: Date.now() }); }}
              onDeleteChapter={handleDeleteChapter}
              onDeletePage={handleDeletePage}
              onStartRenameChapter={handleStartRenameChapter}
              onSaveChapterRename={handleSaveChapterRename}
              onEditingChapterTitle={setEditingChapterTitle}
              onCreatePage={handleCreatePage}
              onReorderChapters={handleReorderChapters}
              onReorderPages={handleReorderPages}
            />

            <EditorPane
              sidebarCollapsed={sidebarCollapsed}
              onToggleSidebar={() => setSidebarCollapsed(prev => !prev)}
              focusMode={focusMode}
              onToggleFocusMode={() => { setFocusMode(prev => { setSidebarCollapsed(!prev); return !prev; }); }}
              activePageId={activePageId}
              activePageObj={activePageObj}
              activeBook={activeBookDetails?.book || null}
              activeChapterName={activeBookDetails?.chapters.find(c => c.id === activePageObj?.chapter_id)?.title || ''}
              allPages={activeBookDetails?.pages || []}
              layout={layout}
              focusHint={focusHint}
              pageContent={pageContent}
              activeRegionKey={activeRegionKey}
              showAppearanceMenu={showAppearanceMenu}
              onToggleAppearanceMenu={() => { setActiveTab('write'); setSidebarCollapsed(false); }}
              activeFont={activeFont} onSetActiveFont={setActiveFont}
              headerFont={headerFont} onSetHeaderFont={setHeaderFont}
              fontSize={fontSize} onSetFontSize={setFontSize}
              lineHeight={lineHeight} onSetLineHeight={setLineHeight}
              letterSpacing={letterSpacing} onSetLetterSpacing={setLetterSpacing}
              paragraphSpacing={paragraphSpacing} onSetParagraphSpacing={setParagraphSpacing}
              editorWidth={editorWidth} onSetEditorWidth={setEditorWidth}
              fitToScreen={fitToScreen} onSetFitToScreen={setFitToScreen}
              pageHeight={pageHeight} onSetPageHeight={setPageHeight}
              pagePadding={pagePadding} onSetPagePadding={setPagePadding}
              limitEnabled={limitEnabled} onSetLimitEnabled={setLimitEnabled}
              limitType={limitType} onSetLimitType={setLimitType}
              limitValue={limitValue} onSetLimitValue={setLimitValue}
              autosaveStatus={autosaveStatus}
              lightTheme={lightTheme} onToggleTheme={toggleTheme}
              onFocusRegion={(key) => { setActiveRegionKey(key); if (activePageId) loadVersions(activePageId, key); }}
              onFieldChange={handleFieldChange}
              onFieldBlur={handleFieldBlur}
              onAutoCreateContinuation={handleAutoCreateContinuation}
              onUpdatePageMeta={handleUpdatePageMeta}
              getGridRegions={getGridRegions}
              onMergePages={handleMergePages}
              onReflowNextPage={handleReflowNextPage}
              onFetchPageContent={handleFetchPageContent}
              onMergeBackward={handleMergeBackward}
              onOpenPreview={() => setPreviewMode(true)}
            />

            <RightPanel
              focusMode={focusMode}
              activeTab={activeTab} onSetActiveTab={setActiveTab}
              activeBookDetails={activeBookDetails}
              activeRegionKey={activeRegionKey}
              selectedTextExists={selectedTextExists}
              onApplySelectionStyle={applySelectionStyle}
              showCreateCharModal={showCreateCharModal}
              onOpenCreateCharModal={() => setShowCreateCharModal(true)}
              onCloseCreateCharModal={() => setShowCreateCharModal(false)}
              selectedCharacterId={selectedCharacterId}
              selectedCharacterMentions={selectedCharacterMentions}
              onDeleteCharacter={handleDeleteCharacter}
              onLoadCharacterMentions={loadCharacterMentions}
              onJumpToPage={(chId, pgId) => { setActiveChapterId(chId); setActivePageId(pgId); setFocusHint({ target: 'none', timestamp: Date.now() }); }}
              newCharName={newCharName} newCharDesc={newCharDesc} newCharKeywords={newCharKeywords}
              onNewCharName={setNewCharName} onNewCharDesc={setNewCharDesc} onNewCharKeywords={setNewCharKeywords}
              onSubmitCreateChar={handleCreateCharacter}
              versions={versions} onRestoreVersion={handleRestoreVersion}
              searchQuery={searchQuery} onSetSearchQuery={setSearchQuery}
              searchResults={searchResults}
              onTriggerSearch={handleTriggerSearch}
              onJumpToSearchResult={handleJumpToSearchResult}
              exportPath={exportPath} onSetExportPath={setExportPath}
              exportMessage={exportMessage}
              onExportEpub={handleExportEpub}
              onTriggerPrint={handleTriggerPrint}
              activeFont={activeFont} onSetActiveFont={setActiveFont}
              headerFont={headerFont} onSetHeaderFont={setHeaderFont}
              fontSize={fontSize} onSetFontSize={setFontSize}
              lineHeight={lineHeight} onSetLineHeight={setLineHeight}
              letterSpacing={letterSpacing} onSetLetterSpacing={setLetterSpacing}
              paragraphSpacing={paragraphSpacing} onSetParagraphSpacing={setParagraphSpacing}
              pageHeight={pageHeight} onSetPageHeight={setPageHeight}
              pagePadding={pagePadding} onSetPagePadding={setPagePadding}
              limitEnabled={limitEnabled} onSetLimitEnabled={setLimitEnabled}
              limitType={limitType} onSetLimitType={setLimitType}
              limitValue={limitValue} onSetLimitValue={setLimitValue}
            />
          </>
        )
      )}

      {/* ── Print View (hidden) ── */}
      {activeBookId && activeBookDetails && !previewMode && (
        <div className={`book-print-view ${activeBookDetails.book.project_type === 'screenplay' ? 'print-screenplay' : ''}`} style={{ display: 'none' }}>
          <div style={{ textAlign: 'center', marginTop: '4in' }}>
            <h1 style={{ fontSize: '32pt', marginBottom: '12pt' }}>{activeBookDetails.book.title}</h1>
            <h2 style={{ fontSize: '20pt', fontWeight: 'normal', fontStyle: 'italic', marginBottom: '36pt' }}>{activeBookDetails.book.genre || 'Novel'}</h2>
            <p style={{ fontSize: '16pt' }}>By {activeBookDetails.book.author}</p>
          </div>
          <div className="print-page-break" />
          {(() => {
            let globalPageNum = 0;
            return activeBookDetails.chapters.map((ch, idx) => {
              const chapterPages = activeBookDetails.pages.filter(p => p.chapter_id === ch.id);
              return (
                <div key={ch.id}>
                  {activeBookDetails.book.project_type !== 'screenplay' && (
                    <div className="print-chapter-header">
                      <h1 style={{ fontSize: '20pt', textTransform: 'uppercase', letterSpacing: '2px', fontWeight: 'normal', marginBottom: '10pt' }}>Chapter {idx + 1}</h1>
                      <h2 style={{ fontSize: '24pt', fontWeight: 'bold' }}>{ch.title}</h2>
                    </div>
                  )}
                  {chapterPages.map(pg => {
                    globalPageNum++;
                    const pgContent = allPagesContent[pg.id] || {};
                    const isScreenplay = pg.category === 'screenplay';
                    return (
                      <div 
                        key={pg.id} 
                        className={isScreenplay ? "print-screenplay-page font-courier" : "print-prose"} 
                        style={{ marginBottom: '24pt', position: 'relative' }}
                      >
                        {isScreenplay && globalPageNum > 1 && (
                          <div 
                            className="screenplay-print-page-number" 
                            style={{ 
                              position: 'absolute', 
                              top: '-0.4in', 
                              right: '0', 
                              fontFamily: "'Courier Prime', 'Courier New', monospace", 
                              fontSize: '12pt' 
                            }}
                          >
                            {globalPageNum}.
                          </div>
                        )}
                        {Object.entries(pgContent).map(([region, content]) => (
                          <div key={region} style={{ marginBottom: '12px' }}>
                            {!isScreenplay && region !== 'main' && <span style={{ fontSize: '9pt', color: '#666', textTransform: 'uppercase', display: 'block', marginBottom: '2px' }}>[{region}]</span>}
                            <div dangerouslySetInnerHTML={{ __html: content }} />
                          </div>
                        ))}
                      </div>
                    );
                  })}
                  <div className="print-page-break" />
                </div>
              );
            });
          })()}
        </div>
      )}

      {/* ── System Modals ── */}
      {confirmModal && <ConfirmModal isOpen={confirmModal.isOpen} title={confirmModal.title} message={confirmModal.message} isDanger={confirmModal.isDanger} onConfirm={confirmModal.onConfirm} onCancel={() => setConfirmModal(null)} />}
      {promptModal && <PromptModal isOpen={promptModal.isOpen} title={promptModal.title} placeholder={promptModal.placeholder} defaultValue={promptModal.defaultValue} onConfirm={promptModal.onConfirm} onCancel={() => setPromptModal(null)} />}
      {templateModal && (
        <TemplateSelectModal
          isOpen={templateModal.isOpen}
          projectType={activeBookDetails?.book?.project_type || 'novel'}
          existingPageTypes={activeBookDetails?.pages.map(p => p.page_type || '') || []}
          targetCategory={templateModal.targetCategory}
          onConfirm={handleConfirmCreatePage}
          onCancel={() => setTemplateModal(null)}
        />
      )}

    </div>
  );
}

export default App;
