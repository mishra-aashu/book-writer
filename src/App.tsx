import { useState, useEffect, useRef } from 'react';
import './App.css';
import { invoke, isTauri, compressBase64Image } from './mockInvoke';
import { check } from '@tauri-apps/plugin-updater';
import { relaunch } from '@tauri-apps/plugin-process';
import { getVersion } from '@tauri-apps/api/app';
import { RefreshCw } from 'lucide-react';
import { ConfirmModal, PromptModal, TemplateSelectModal, ImageCropModal } from './Modals';
import { MASK_OPTIONS, getSvgMaskDataUri } from './Mask';

import Dashboard from './Dashboard';
import OutlineSidebar from './OutlineSidebar';
import EditorPane from './EditorPane';
import RightPanel from './RightPanel';
import { Preview } from './prev';
import { StoryboardBoard } from './StoryboardBoard';
import { OnboardingPage } from './OnboardingPage';
import { applyThemePreset } from './utils/themePresets';
import FloatingToolbar from './FloatingToolbar';

import type {
  Book, Chapter, Page, Template, PageVersion,
  SearchResult, BookDetails, AutosaveStatus, ActiveTab, ActiveFont, HeaderFont, EditorWidth,
  EditorialNote,
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
  const [rightSidebarWidth, setRightSidebarWidth] = useState<number>(() => {
    const saved = localStorage.getItem('right_sidebar_width');
    return saved ? parseInt(saved, 10) : 360;
  });

  const [leftSidebarWidth, setLeftSidebarWidth] = useState<number>(() => {
    const saved = localStorage.getItem('left_sidebar_width');
    return saved ? parseInt(saved, 10) : 280;
  });

  const handleLeftSidebarResizeStart = (e: React.MouseEvent) => {
    e.preventDefault();
    const startX = e.clientX;
    const startWidth = leftSidebarWidth;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const deltaX = moveEvent.clientX - startX;
      const newWidth = Math.max(200, Math.min(600, startWidth + deltaX));
      setLeftSidebarWidth(newWidth);
      localStorage.setItem('left_sidebar_width', newWidth.toString());
    };

    const handleMouseUp = () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'default';
      document.body.style.userSelect = 'auto';
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    const startX = e.clientX;
    const startWidth = rightSidebarWidth;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const deltaX = startX - moveEvent.clientX;
      const newWidth = Math.max(260, Math.min(800, startWidth + deltaX));
      setRightSidebarWidth(newWidth);
      localStorage.setItem('right_sidebar_width', newWidth.toString());
    };

    const handleMouseUp = () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'default';
      document.body.style.userSelect = 'auto';
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  };

  // ── Update System State ──
  const [updateState, setUpdateState] = useState<{
    isOpen: boolean;
    status: 'checking' | 'up-to-date' | 'available' | 'downloading' | 'installing' | 'complete';
    currentVersion: string;
    latestVersion: string;
    progress: number;
  } | null>(null);
  const [activeUpdateObj, setActiveUpdateObj] = useState<any>(null);

  const handleCheckForUpdates = async () => {
    let currentVer = '0.3.0';
    if (isTauri) {
      try {
        currentVer = await getVersion();
      } catch (e) {
        console.error('Failed to get version:', e);
      }
    }

    setUpdateState({
      isOpen: true,
      status: 'checking',
      currentVersion: currentVer,
      latestVersion: currentVer,
      progress: 0
    });

    if (!isTauri) {
      // Mock environment behavior
      setTimeout(() => {
        setUpdateState(prev => prev ? {
          ...prev,
          status: 'up-to-date'
        } : null);
      }, 1500);
      return;
    }

    // Actual Tauri environment update check
    try {
      const update = await check();
      if (update && update.available) {
        setActiveUpdateObj(update);
        setUpdateState(prev => prev ? {
          ...prev,
          status: 'available',
          latestVersion: update.version
        } : null);
      } else {
        setUpdateState(prev => prev ? {
          ...prev,
          status: 'up-to-date'
        } : null);
      }
    } catch (err) {
      console.error('Failed to check for updates:', err);
      setUpdateState(prev => prev ? {
        ...prev,
        status: 'up-to-date'
      } : null);
    }
  };

  const handleStartUpdate = async () => {
    if (!updateState) return;

    if (!isTauri) {
      // Mock environment update flow
      setUpdateState(prev => prev ? { ...prev, status: 'downloading', progress: 0 } : null);
      let currentProgress = 0;
      const interval = setInterval(() => {
        currentProgress += 10;
        setUpdateState(prev => {
          if (!prev) {
            clearInterval(interval);
            return null;
          }
          if (currentProgress >= 100) {
            clearInterval(interval);
            setTimeout(() => {
              setUpdateState(p => p ? { ...p, status: 'installing', progress: 100 } : null);
              setTimeout(() => {
                setUpdateState(p => p ? { ...p, status: 'complete' } : null);
              }, 1200);
            }, 400);
            return { ...prev, progress: 100 };
          }
          return { ...prev, progress: currentProgress };
        });
      }, 200);
      return;
    }

    // Actual Tauri environment update execution
    if (!activeUpdateObj) return;

    try {
      setUpdateState(prev => prev ? { ...prev, status: 'downloading', progress: 0 } : null);
      
      let totalBytes = 0;
      let downloadedBytes = 0;

      await activeUpdateObj.downloadAndInstall((event: any) => {
        switch (event.event) {
          case 'Started':
            totalBytes = event.data.contentLength || 0;
            break;
          case 'Progress':
            downloadedBytes += event.data.chunkLength || 0;
            if (totalBytes > 0) {
              const percent = Math.min(99, Math.floor((downloadedBytes / totalBytes) * 100));
              setUpdateState(prev => prev ? { ...prev, progress: percent } : null);
            }
            break;
          case 'Finished':
            setUpdateState(prev => prev ? { ...prev, status: 'installing', progress: 100 } : null);
            break;
        }
      });

      // Transition to complete after installation finishes
      setUpdateState(prev => prev ? { ...prev, status: 'complete' } : null);
      
      // Automatic restart
      setTimeout(async () => {
        try {
          await relaunch();
        } catch (e) {
          console.error('Failed to relaunch:', e);
          window.location.reload();
        }
      }, 1000);

    } catch (err) {
      console.error('Failed to install update:', err);
      alert('Failed to install update: ' + err);
      setUpdateState(null);
    }
  };

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
  const [showStoryboard, setShowStoryboard] = useState(false);
  const [autosaveStatus, setAutosaveStatus] = useState<AutosaveStatus>('idle');
  const [editorialNotes, setEditorialNotes] = useState<EditorialNote[]>([]);
  const [projectAssets, setProjectAssets] = useState<any[]>([]);
  const [newCommentAnchor, setNewCommentAnchor] = useState<{
    commentId: string;
    selectedText: string;
    textOffset: number;
    textLength: number;
    regionKey: string;
  } | null>(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [lightTheme, setLightTheme] = useState(false);
  const [userProfile, setUserProfile] = useState<{
    name: string;
    writingRole: string;
    focusArea: string;
    selectedTheme: string;
  } | null>(() => {
    const saved = localStorage.getItem('user_profile');
    return saved ? JSON.parse(saved) : null;
  });
  const [activeFont, setActiveFont] = useState<ActiveFont>('garamond');
  const [headerFont, setHeaderFont] = useState<HeaderFont>('playfair');
  const [fontSize, setFontSize] = useState<number>(18);
  const [lineHeight, setLineHeight] = useState<number>(1.65);
  const [letterSpacing, setLetterSpacing] = useState<number>(0);
  const [paragraphSpacing, setParagraphSpacing] = useState<number>(0.5);
  const [editorWidth, setEditorWidth] = useState<EditorWidth>('medium');
  const [focusMode, setFocusMode] = useState(false);
  const [_showAppearanceMenu, _setShowAppearanceMenu] = useState(false);
  const [fitToScreen, setFitToScreen] = useState(false);
  const [pageHeight, setPageHeight] = useState<number>(1000);
  const [pagePadding, setPagePadding] = useState<number>(60);
  const [limitEnabled, setLimitEnabled] = useState<boolean>(true);
  const [limitType, setLimitType] = useState<'words' | 'chars'>('chars');
  const [limitValue, setLimitValue] = useState<number>(2000);
  const [smartCap, setSmartCap] = useState<boolean>(true);
  const [smartI, setSmartI] = useState<boolean>(true);
  const [smartSpace, setSmartSpace] = useState<boolean>(true);
  const [selectedTextExists, setSelectedTextExists] = useState(false);
  const [selectedText, setSelectedText] = useState('');
  const [allPagesContent, setAllPagesContent] = useState<Record<string, Record<string, string>>>({});
  const [draftingMode, setDraftingMode] = useState<boolean>(false);
  const [projectWordGoal, setProjectWordGoal] = useState<number>(80000);
  const [dailyWordGoal, setDailyWordGoal] = useState<number>(1000);
  const [sessionWordCount, setSessionWordCount] = useState<number>(0);
  const [startingTotalWords, setStartingTotalWords] = useState<number>(0);
  const [bookTotalWords, setBookTotalWords] = useState<number>(0);

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
  const isInitializingSettingsRef = useRef(false);
  const saveSettingsTimerRef = useRef<any>(null);

  // ── Effects ──
  useEffect(() => {
    loadBooks();
    loadTemplates();
    if (!localStorage.getItem('groq_api_key')) {
      localStorage.setItem('groq_api_key', import.meta.env.VITE_GROQ_API_KEY || '');
    }
    const savedModel = localStorage.getItem('groq_model');
    const validModels = ['openai/gpt-oss-120b', 'openai/gpt-oss-20b', 'groq/compound', 'groq/compound-mini'];
    if (!savedModel || !validModels.includes(savedModel)) {
      localStorage.setItem('groq_model', 'openai/gpt-oss-120b');
    }
  }, []);

  useEffect(() => {
    if (activeBookId) { loadBookDetails(activeBookId); }
    else { setActiveBookDetails(null); setActiveChapterId(null); setActivePageId(null); }
  }, [activeBookId]);

  useEffect(() => {
    const handleDbChange = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (activeBookId && detail && detail.bookId === activeBookId) {
        loadBookDetails(activeBookId).then(() => {
          if (detail.pageId) {
            setActiveChapterId(detail.chapterId);
            setActivePageId(detail.pageId);
          }
        });
      }
    };
    window.addEventListener('book-writer-db-change', handleDbChange);
    return () => window.removeEventListener('book-writer-db-change', handleDbChange);
  }, [activeBookId]);

  useEffect(() => {
    if (activePageId) { loadPageContent(activePageId); }
    else { setPageContent({}); }
  }, [activePageId]);

  // Synchronize document theme class list with the theme state
  useEffect(() => {
    if (lightTheme) {
      document.documentElement.classList.add('light-mode');
    } else {
      document.documentElement.classList.remove('light-mode');
    }
  }, [lightTheme]);

  // Synchronize custom theme presets dynamically
  useEffect(() => {
    if (userProfile?.selectedTheme) {
      applyThemePreset(userProfile.selectedTheme, lightTheme);
    } else {
      applyThemePreset('obsidian-royal', lightTheme);
    }
  }, [userProfile?.selectedTheme, lightTheme]);

  // Load typography/appearance settings per book
  useEffect(() => {
    if (!activeBookId) return;
    isInitializingSettingsRef.current = true;
    invoke('get_book_settings', { bookId: activeBookId })
      .then((settings: any) => {
        if (settings) {
          if (settings.lightTheme !== undefined) setLightTheme(settings.lightTheme);
          if (settings.bodyFont !== undefined) setActiveFont(settings.bodyFont);
          if (settings.headerFont !== undefined) setHeaderFont(settings.headerFont);
          if (settings.fontSize !== undefined) setFontSize(settings.fontSize);
          if (settings.lineHeight !== undefined) setLineHeight(settings.lineHeight);
          if (settings.letterSpacing !== undefined) setLetterSpacing(settings.letterSpacing);
          if (settings.paragraphSpacing !== undefined) setParagraphSpacing(settings.paragraphSpacing);
          if (settings.editorWidth !== undefined) setEditorWidth(settings.editorWidth);
          if (settings.focusMode !== undefined) setFocusMode(settings.focusMode);
          if (settings.pageHeight !== undefined) setPageHeight(settings.pageHeight);
          if (settings.pagePadding !== undefined) setPagePadding(settings.pagePadding);
          if (settings.limitEnabled !== undefined) setLimitEnabled(settings.limitEnabled);
          if (settings.limitType !== undefined) setLimitType(settings.limitType);
          if (settings.limitValue !== undefined) setLimitValue(settings.limitValue);
          if (settings.smartCap !== undefined) setSmartCap(settings.smartCap);
          if (settings.smartI !== undefined) setSmartI(settings.smartI);
          if (settings.smartSpace !== undefined) setSmartSpace(settings.smartSpace);
          if (settings.draftingMode !== undefined) setDraftingMode(settings.draftingMode);
          if (settings.projectWordGoal !== undefined) setProjectWordGoal(settings.projectWordGoal);
          if (settings.dailyWordGoal !== undefined) setDailyWordGoal(settings.dailyWordGoal);
        }
      })
      .catch((e) => {
        console.error("Error loading settings:", e);
      })
      .finally(() => {
        setTimeout(() => {
          isInitializingSettingsRef.current = false;
        }, 0);
      });

    invoke('get_book_word_count', { bookId: activeBookId })
      .then((words: any) => {
        setStartingTotalWords(words || 0);
        setBookTotalWords(words || 0);
        setSessionWordCount(0);
      })
      .catch((e) => console.error("Error loading word count:", e));
  }, [activeBookId]);

  // Save typography/appearance settings per book
  useEffect(() => {
    if (!activeBookId || isInitializingSettingsRef.current) return;
    const settings = {
      bookId: activeBookId,
      bodyFont: activeFont,
      headerFont,
      fontSize,
      lineHeight,
      letterSpacing,
      paragraphSpacing,
      editorWidth,
      pageHeight,
      pagePadding,
      lightTheme,
      focusMode,
      limitEnabled,
      limitType,
      limitValue,
      smartCap,
      smartI,
      smartSpace,
      draftingMode,
      projectWordGoal,
      dailyWordGoal
    };
    if (saveSettingsTimerRef.current) {
      clearTimeout(saveSettingsTimerRef.current);
    }
    saveSettingsTimerRef.current = setTimeout(() => {
      invoke('save_book_settings', { bookId: activeBookId, settings })
        .catch((e) => console.error("Error saving settings:", e));
    }, 500);

    return () => {
      if (saveSettingsTimerRef.current) {
        clearTimeout(saveSettingsTimerRef.current);
      }
    };
  }, [
    activeBookId,
    lightTheme,
    activeFont,
    headerFont,
    fontSize,
    lineHeight,
    letterSpacing,
    paragraphSpacing,
    editorWidth,
    focusMode,
    pageHeight,
    pagePadding,
    limitEnabled,
    limitType,
    limitValue,
    smartCap,
    smartI,
    smartSpace,
    draftingMode,
    projectWordGoal,
    dailyWordGoal
  ]);

  const toggleDraftingMode = async (enabled: boolean) => {
    if (!activeBookDetails || !activeBookId) return;

    if (enabled) {
      // Transitioning to Drafting Mode (ON)
      // Group pages by chapter
      const updatedPages = [...activeBookDetails.pages];
      const pagesByChapter: Record<string, any[]> = {};
      updatedPages.forEach(p => {
        if (p.category === 'body' || !p.category || p.category === 'screenplay') {
          if (!pagesByChapter[p.chapter_id]) {
            pagesByChapter[p.chapter_id] = [];
          }
          pagesByChapter[p.chapter_id].push(p);
        }
      });
      
      for (const chapterId of Object.keys(pagesByChapter)) {
        const pages = pagesByChapter[chapterId].sort((a, b) => a.sort_order - b.sort_order);
        if (pages.length > 1) {
          const firstPage = pages[0];
          let mergedMainContent = "";
          
          // Get first page content
          const firstPageContent: Record<string, string> = await invoke('get_page_content', { pageId: firstPage.id });
          mergedMainContent = firstPageContent.main || "";
          
          for (let i = 1; i < pages.length; i++) {
            const curPage = pages[i];
            const curContent: Record<string, string> = await invoke('get_page_content', { pageId: curPage.id });
            const pageText = curContent.main || "";
            if (pageText.trim()) {
              mergedMainContent += "\n" + pageText;
            }
            // Delete this page
            await invoke('delete_page', { id: curPage.id });
          }
          
          // Save merged content to the first page
          await invoke('save_page_content', { pageId: firstPage.id, regionKey: 'main', content: mergedMainContent });
        }
      }
      
      setDraftingMode(true);
      await loadBookDetails(activeBookId);
      if (activeChapterId) {
        const chPages = activeBookDetails.pages.filter(p => p.chapter_id === activeChapterId);
        if (chPages.length > 0) setActivePageId(chPages[0].id);
      }
    } else {
      // Transitioning to Page Layout View (OFF)
      setDraftingMode(false);
      await loadBookDetails(activeBookId);
    }
  };

  const [selectedImageEl, setSelectedImageEl] = useState<HTMLImageElement | null>(null);
  const [imageWidth, setImageWidth] = useState<number>(100);
  const [imageAlign, setImageAlign] = useState<'left' | 'center' | 'right'>('left');
  const [imageMaskId, setImageMaskId] = useState<string>('none');
  const [imageBlendMode, setImageBlendMode] = useState<string>('normal');
  const [imageFeather, setImageFeather] = useState<number>(0);
  const [imageFeatherX, setImageFeatherX] = useState<number>(50);
  const [imageFeatherY, setImageFeatherY] = useState<number>(50);

  const handleImageMaskChange = (maskId: string) => {
    if (selectedImageEl) {
      const selectedMask = MASK_OPTIONS.find(m => m.id === maskId);
      if (selectedMask) {
        setImageMaskId(maskId);

        const style = selectedImageEl.style as any;
        if (imageFeather === 0) {
          style.clipPath = selectedMask.clipPath;
          style.webkitClipPath = selectedMask.clipPath;
          style.maskImage = 'none';
          style.webkitMaskImage = 'none';
        } else {
          style.clipPath = 'none';
          style.webkitClipPath = 'none';
          
          const maskUri = getSvgMaskDataUri(maskId, imageFeather, imageFeatherX, imageFeatherY);
          style.maskImage = maskUri;
          style.webkitMaskImage = maskUri;
          style.maskRepeat = 'no-repeat';
          style.webkitMaskRepeat = 'no-repeat';
          style.maskSize = '100% 100%';
          style.webkitMaskSize = '100% 100%';
        }

        triggerEditorUpdateFromImage();
      }
    }
  };

  const handleImageBlendModeChange = (mode: string) => {
    if (selectedImageEl) {
      (selectedImageEl.style as any).mixBlendMode = mode;
      setImageBlendMode(mode);
      triggerEditorUpdateFromImage();
    }
  };

  const applyFeatherStyle = (featherVal: number, x: number, y: number) => {
    if (selectedImageEl) {
      const style = selectedImageEl.style as any;
      if (featherVal === 0) {
        style.maskImage = 'none';
        style.webkitMaskImage = 'none';
        
        const selectedMask = MASK_OPTIONS.find(m => m.id === imageMaskId) || MASK_OPTIONS[0];
        style.clipPath = selectedMask.clipPath;
        style.webkitClipPath = selectedMask.clipPath;
      } else {
        style.clipPath = 'none';
        style.webkitClipPath = 'none';

        const maskUri = getSvgMaskDataUri(imageMaskId, featherVal, x, y);
        style.maskImage = maskUri;
        style.webkitMaskImage = maskUri;
        style.maskRepeat = 'no-repeat';
        style.webkitMaskRepeat = 'no-repeat';
        style.maskSize = '100% 100%';
        style.webkitMaskSize = '100% 100%';
      }
    }
  };

  const handleImageFeatherChange = (featherVal: number) => {
    if (selectedImageEl) {
      applyFeatherStyle(featherVal, imageFeatherX, imageFeatherY);
      setImageFeather(featherVal);
      triggerEditorUpdateFromImage();
    }
  };

  const handleImageFeatherXChange = (x: number) => {
    if (selectedImageEl) {
      applyFeatherStyle(imageFeather, x, imageFeatherY);
      setImageFeatherX(x);
      triggerEditorUpdateFromImage();
    }
  };

  const handleImageFeatherYChange = (y: number) => {
    if (selectedImageEl) {
      applyFeatherStyle(imageFeather, imageFeatherX, y);
      setImageFeatherY(y);
      triggerEditorUpdateFromImage();
    }
  };

  const handleImageWidthChange = (widthPercent: number) => {
    if (selectedImageEl) {
      selectedImageEl.style.width = `${widthPercent}%`;
      selectedImageEl.style.height = 'auto'; // Maintain aspect ratio
      setImageWidth(widthPercent);
      triggerEditorUpdateFromImage();
    }
  };

  const handleImageAlignChange = (align: 'left' | 'center' | 'right') => {
    if (selectedImageEl) {
      if (align === 'center') {
        selectedImageEl.style.display = 'block';
        selectedImageEl.style.margin = '0 auto';
      } else if (align === 'right') {
        selectedImageEl.style.display = 'block';
        selectedImageEl.style.margin = '0 0 0 auto';
      } else {
        selectedImageEl.style.display = 'inline-block';
        selectedImageEl.style.margin = '0';
      }
      setImageAlign(align);
      triggerEditorUpdateFromImage();
    }
  };

  const handleDeleteSelectedImage = () => {
    if (selectedImageEl) {
      const parent = selectedImageEl.parentNode;
      selectedImageEl.remove();
      setSelectedImageEl(null);
      if (parent) {
        triggerEditorUpdateFromParent(parent as HTMLElement);
      }
    }
  };

  const [cropModal, setCropModal] = useState<{ isOpen: boolean; imageSrc: string } | null>(null);

  const handleCropSelectedImage = () => {
    if (selectedImageEl) {
      setCropModal({
        isOpen: true,
        imageSrc: selectedImageEl.src
      });
    }
  };

  const handleConfirmCrop = (croppedDataBase64: string) => {
    console.log('[Confirm Crop] Starting...', { hasSrc: !!croppedDataBase64 });
    const imgEl = document.querySelector('.inserted-manuscript-image.selected') as HTMLImageElement | null;
    console.log('[Confirm Crop] Found imgEl in DOM:', imgEl);
    const targetImage = imgEl || selectedImageEl;

    if (targetImage) {
      targetImage.src = croppedDataBase64;
      setCropModal(null);
      
      let curr: Node | null = targetImage;
      let editorEl: HTMLElement | null = null;
      while (curr && curr !== document.body) {
        if (curr.nodeType === Node.ELEMENT_NODE && (curr as HTMLElement).classList.contains('editor-textarea')) {
          editorEl = curr as HTMLElement;
          break;
        }
        curr = curr.parentNode;
      }
      console.log('[Confirm Crop] Found editorEl:', editorEl);
      if (editorEl) {
        const html = editorEl.innerHTML;
        editorEl.dispatchEvent(new CustomEvent('editor-content-formatted', { detail: { html } }));
        handleFieldChange(activeRegionKey || 'main', html);
        console.log('[Confirm Crop] Update completed successfully!');
      } else {
        console.warn('[Confirm Crop] Editor element not found for cropped image!');
      }
    } else {
      console.warn('[Confirm Crop] No target image found to apply crop!');
    }
  };

  const triggerEditorUpdateFromImage = () => {
    const imgEl = document.querySelector('.inserted-manuscript-image.selected') as HTMLImageElement | null;
    const targetImage = imgEl || selectedImageEl;

    if (targetImage) {
      let curr: Node | null = targetImage;
      let editorEl: HTMLElement | null = null;
      while (curr && curr !== document.body) {
        if (curr.nodeType === Node.ELEMENT_NODE && (curr as HTMLElement).classList.contains('editor-textarea')) {
          editorEl = curr as HTMLElement;
          break;
        }
        curr = curr.parentNode;
      }
      if (editorEl) {
        const html = editorEl.innerHTML;
        editorEl.dispatchEvent(new CustomEvent('editor-content-formatted', { detail: { html } }));
        handleFieldChange(activeRegionKey || 'main', html);
      }
    }
  };

  const triggerEditorUpdateFromParent = (editorEl: HTMLElement) => {
    const html = editorEl.innerHTML;
    editorEl.dispatchEvent(new CustomEvent('editor-content-formatted', { detail: { html } }));
    saveFormattedContent(activeRegionKey || 'main', html);
  };

  useEffect(() => {
    const handleDocumentClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      
      const clickedSidebar = target.closest('.image-inspector-panel');
      const clickedModal = target.closest('.modal-backdrop, .modal-content');
      
      if (clickedSidebar || clickedModal) {
        return;
      }

      if (target && target.tagName === 'IMG' && target.classList.contains('inserted-manuscript-image')) {
        document.querySelectorAll('.inserted-manuscript-image.selected').forEach(el => {
          el.classList.remove('selected');
        });
        target.classList.add('selected');
        setSelectedImageEl(target as HTMLImageElement);
        const w = target.style.width || '';
        const numericWidth = parseInt(w) || 100;
        setImageWidth(numericWidth);
        
        let align: 'left' | 'center' | 'right' = 'left';
        if (target.style.display === 'block') {
          if (target.style.margin === '0px auto' || target.style.margin === '0 auto') align = 'center';
          else if (target.style.marginLeft === 'auto') align = 'right';
        }
        setImageAlign(align);

        const targetStyle = target.style as any;
        const currentBlend = targetStyle.mixBlendMode || 'normal';
        setImageBlendMode(currentBlend);

        const currentMaskImg = targetStyle.maskImage || targetStyle.webkitMaskImage || '';
        let featherVal = 0;
        let featherXVal = 50;
        let featherYVal = 50;
        let maskIdVal = 'none';

        if (currentMaskImg && currentMaskImg !== 'none') {
          const decoded = decodeURIComponent(currentMaskImg);
          
          const stdDevMatch = decoded.match(/stdDeviation="([\d.]+)"/i);
          if (stdDevMatch) {
            const stdDev = parseFloat(stdDevMatch[1]);
            featherVal = Math.round((stdDev / 12) * 50);
          }

          const paramsMatch = decoded.match(/params:\s*x=(\d+),\s*y=(\d+)/i);
          if (paramsMatch) {
            featherXVal = parseInt(paramsMatch[1]);
            featherYVal = parseInt(paramsMatch[2]);
          } else {
            const translateMatch = decoded.match(/translate\((\d+(?:\.\d+)?),\s*(\d+(?:\.\d+)?)\)/i);
            if (translateMatch) {
              featherXVal = Math.round(parseFloat(translateMatch[1]));
              featherYVal = Math.round(parseFloat(translateMatch[2]));
            }
          }

          if (decoded.includes('horizontal-strip') || (decoded.includes('width="100"') && !decoded.includes('y="0"'))) {
            maskIdVal = 'horizontal-strip';
          } else if (decoded.includes('vertical-strip') || (decoded.includes('height="100"') && !decoded.includes('x="0"'))) {
            maskIdVal = 'vertical-strip';
          } else if (decoded.includes('<circle')) {
            maskIdVal = 'circle';
          } else if (decoded.includes('<ellipse')) {
            maskIdVal = 'oval';
          } else if (decoded.includes('50,0 61,35') || decoded.includes('50,0, 61,35')) {
            maskIdVal = 'star';
          } else if (decoded.includes('50,15')) {
            maskIdVal = 'heart';
          } else if (decoded.includes('50,0 100,50')) {
            maskIdVal = 'diamond';
          } else if (decoded.includes('50,0 0,100')) {
            maskIdVal = 'triangle';
          } else if (decoded.includes('25,0')) {
            maskIdVal = 'hexagon';
          } else if (decoded.includes('0,0')) {
            maskIdVal = 'badge';
          }
          
          setImageMaskId(maskIdVal);
        } else {
          const currentClipPath = targetStyle.clipPath || '';
          const matchedMask = MASK_OPTIONS.find(m => m.clipPath === currentClipPath) || MASK_OPTIONS[0];
          setImageMaskId(matchedMask.id);
        }

        setImageFeather(featherVal);
        setImageFeatherX(featherXVal);
        setImageFeatherY(featherYVal);

        setActiveTab('write');
      } else {
        document.querySelectorAll('.inserted-manuscript-image.selected').forEach(el => {
          el.classList.remove('selected');
        });
        setSelectedImageEl(null);
      }
    };
    document.addEventListener('click', handleDocumentClick);
    return () => {
      document.removeEventListener('click', handleDocumentClick);
    };
  }, [activeRegionKey]);

  const savedRangeRef = useRef<Range | null>(null);

  useEffect(() => {
    let hideTimeout: any = null;
    const handleSelectionChange = () => {
      const selection = window.getSelection();
      if (selection && selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        let node: Node | null = range.commonAncestorContainer;
        let isInsideEditor = false;
        while (node) {
          if (node instanceof HTMLElement && node.classList.contains('editor-pane')) { isInsideEditor = true; break; }
          node = node.parentNode;
        }
        if (isInsideEditor) {
          savedRangeRef.current = range.cloneRange();
          if (!selection.isCollapsed && selection.toString().trim().length > 0) {
            if (hideTimeout) clearTimeout(hideTimeout);
            setSelectedTextExists(true);
            setSelectedText(selection.toString());
            setActiveTab('write');
          }
          return;
        }
      }
      
      if (hideTimeout) clearTimeout(hideTimeout);
      hideTimeout = setTimeout(() => {
        const activeEl = document.activeElement;
        const isFocusingToolbar = activeEl && (activeEl.closest('.floating-selection-toolbar') || activeEl.closest('.right-sidebar'));
        if (!isFocusingToolbar) {
          setSelectedTextExists(false);
          setSelectedText('');
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
  const loadEditorialNotes = async (bookId: string) => {
    try {
      const notes = await invoke('get_editorial_notes', { bookId });
      setEditorialNotes(notes);
    } catch (e) {
      console.error(e);
    }
  };

  const handleCreateComment = async (commentText: string, authorName: string) => {
    if (!activeBookId || !activePageId || !newCommentAnchor) return;
    try {
      const note = await invoke('create_editorial_note', {
        bookId: activeBookId,
        pageId: activePageId,
        regionKey: newCommentAnchor.regionKey,
        textOffset: newCommentAnchor.textOffset,
        textLength: newCommentAnchor.textLength,
        selectedText: newCommentAnchor.selectedText,
        commentText,
        author: authorName || 'Editor',
      });
      setEditorialNotes(prev => [...prev, note]);
      setNewCommentAnchor(null);
    } catch (e) {
      console.error(e);
    }
  };

  const handleToggleResolveNote = async (noteId: string, resolvedVal: number) => {
    try {
      await invoke('toggle_resolve_note', { id: noteId, resolved: resolvedVal });
      setEditorialNotes(prev => prev.map(n => n.id === noteId ? { ...n, resolved: resolvedVal } : n));
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeleteEditorialNote = async (noteId: string) => {
    try {
      await invoke('delete_editorial_note', { id: noteId });
      setEditorialNotes(prev => prev.filter(n => n.id !== noteId));
    } catch (e) {
      console.error(e);
    }
  };

  const loadProjectAssets = async (bookId: string) => {
    try {
      const assets = await invoke('get_project_assets', { book_id: bookId });
      setProjectAssets(assets);
    } catch (err) {
      console.error('Failed to load assets', err);
    }
  };

  const handleUploadAsset = async (name: string, mimeType: string, dataBase64: string) => {
    if (!activeBookId) return;
    try {
      let finalBase64 = dataBase64;
      let finalMimeType = mimeType;
      if (dataBase64 && dataBase64.startsWith('data:image/')) {
        finalBase64 = await compressBase64Image(dataBase64);
        finalMimeType = 'image/jpeg'; // compressBase64Image converts to jpeg
      }
      const asset = await invoke('upload_project_asset', {
        book_id: activeBookId,
        name,
        mime_type: finalMimeType,
        data_base_64: finalBase64
      });
      setProjectAssets(prev => [asset, ...prev]);
    } catch (err) {
      console.error('Failed to upload asset', err);
    }
  };

  const handleDeleteAsset = async (id: string) => {
    try {
      await invoke('delete_project_asset', { id });
      setProjectAssets(prev => prev.filter(a => a.id !== id));
    } catch (err) {
      console.error('Failed to delete asset', err);
    }
  };

  const insertImageAtCursor = (base64Data: string, fileName: string) => {
    const selection = window.getSelection();
    if (savedRangeRef.current && selection) {
      selection.removeAllRanges();
      selection.addRange(savedRangeRef.current);
    }
    if (!selection || selection.rangeCount === 0) return;
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

    if (!editorEl) {
      const region = activeRegionKey || 'main';
      editorEl = document.querySelector(`.grid-${region}.book-page-region .editor-textarea`) as HTMLElement;
    }
    if (!editorEl) {
      editorEl = document.querySelector('.grid-main.book-page-region .editor-textarea') as HTMLElement;
    }
    if (!editorEl) {
      editorEl = document.querySelector('.editor-textarea') as HTMLElement;
    }

    if (editorEl) {
      // Create image with proper sizing so it doesn't disappear
      const img = document.createElement('img');
      img.src = base64Data;
      img.alt = fileName;
      img.className = 'inserted-manuscript-image';
      img.style.width = '100%';
      img.style.height = 'auto';
      img.style.display = 'block';
      img.style.maxWidth = '100%';

      // Wrap image in a block-level div so it renders properly inside the editor
      const wrapper = document.createElement('div');
      wrapper.style.width = '100%';
      wrapper.style.lineHeight = '0';
      wrapper.style.margin = '8px 0';
      wrapper.appendChild(img);

      // Cursor paragraph after image
      const after = document.createElement('div');
      after.innerHTML = '<br>';

      editorEl.focus();
      
      if (editorEl.contains(range.commonAncestorContainer)) {
        range.deleteContents();
        range.insertNode(after);
        range.insertNode(wrapper);
        
        // Move selection cursor into the paragraph after the image
        const newRange = document.createRange();
        newRange.setStart(after, 0);
        newRange.collapse(true);
        selection.removeAllRanges();
        selection.addRange(newRange);
        savedRangeRef.current = newRange.cloneRange();
      } else {
        editorEl.appendChild(wrapper);
        editorEl.appendChild(after);
        
        // Move selection cursor into the paragraph after the image
        const newRange = document.createRange();
        newRange.setStart(after, 0);
        newRange.collapse(true);
        selection.removeAllRanges();
        selection.addRange(newRange);
        savedRangeRef.current = newRange.cloneRange();
      }

      const html = editorEl.innerHTML;
      // Dispatch event so RichTextEditor updates its lastContentRef (prevents DOM override on re-render)
      editorEl.dispatchEvent(new CustomEvent('editor-content-formatted', { detail: { html } }));
      
      // Directly save to DB
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      setAutosaveStatus('saving');
      saveFieldData(activeRegionKey || 'main', html);
    }
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
      loadEditorialNotes(bookId);
      loadProjectAssets(bookId);
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
      await invoke('update_page_meta', { pageId: activePageId, category, pageType, chapterId: null });
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

  const handleDragReorderPages = async (draggedPageId: string, targetPageId: string) => {
    if (!activeBookDetails) return;
    const draggedPage = activeBookDetails.pages.find(p => p.id === draggedPageId);
    const targetPage = activeBookDetails.pages.find(p => p.id === targetPageId);
    
    if (draggedPage && targetPage) {
      // 1. If category or chapter_id changed, update them first in backend
      if (draggedPage.category !== targetPage.category || draggedPage.chapter_id !== targetPage.chapter_id) {
        try {
          await invoke('update_page_meta', {
            pageId: draggedPageId,
            category: targetPage.category || 'body',
            pageType: draggedPage.page_type || 'standard',
            chapterId: targetPage.chapter_id
          });
        } catch (err) {
          console.error(err);
        }
      }
      
      // 2. Perform local array movement and call reorder
      const pagesCopy = [...activeBookDetails.pages];
      const dragIdx = pagesCopy.findIndex(p => p.id === draggedPageId);
      const targetIdx = pagesCopy.findIndex(p => p.id === targetPageId);
      if (dragIdx !== -1 && targetIdx !== -1 && dragIdx !== targetIdx) {
        const [removed] = pagesCopy.splice(dragIdx, 1);
        removed.category = targetPage.category;
        removed.chapter_id = targetPage.chapter_id;
        pagesCopy.splice(targetIdx, 0, removed);
        try {
          await invoke('reorder_pages', { pageIds: pagesCopy.map(p => p.id) });
        } catch (err) { console.error(err); }
      }
      await loadBookDetails(activeBookId!);
    }
  };

  const handleDragMovePageToChapter = async (pageId: string, chapterId: string) => {
    if (!activeBookDetails) return;
    const page = activeBookDetails.pages.find(p => p.id === pageId);
    if (page) {
      try {
        await invoke('update_page_meta', {
          pageId,
          category: 'body',
          pageType: page.page_type || 'standard',
          chapterId: chapterId
        });
        await loadBookDetails(activeBookId!);
      } catch (err) { console.error(err); }
    }
  };

  const handleDragMovePageToCategory = async (pageId: string, category: 'front_matter' | 'body' | 'back_matter') => {
    if (!activeBookDetails) return;
    const page = activeBookDetails.pages.find(p => p.id === pageId);
    if (page) {
      try {
        await invoke('update_page_meta', {
          pageId,
          category,
          pageType: page.page_type || 'standard',
          chapterId: activeBookDetails.book.id
        });
        await loadBookDetails(activeBookId!);
      } catch (err) { console.error(err); }
    }
  };

  const handleDragReorderChapters = async (draggedChapterId: string, targetChapterId: string) => {
    if (!activeBookDetails) return;
    const chaptersCopy = [...activeBookDetails.chapters];
    const dragIdx = chaptersCopy.findIndex(c => c.id === draggedChapterId);
    const targetIdx = chaptersCopy.findIndex(c => c.id === targetChapterId);
    if (dragIdx !== -1 && targetIdx !== -1 && dragIdx !== targetIdx) {
      const [draggedChapter] = chaptersCopy.splice(dragIdx, 1);
      chaptersCopy.splice(targetIdx, 0, draggedChapter);
      try {
        await invoke('reorder_chapters', { chapterIds: chaptersCopy.map(c => c.id) });
        await loadBookDetails(activeBookId!);
      } catch (err) { console.error(err); }
    }
  };

  // ── Autosave Engine ──
  const handleFieldChange = (regionKey: string, val: string) => {
    // Calculate word difference for the active region
    const prevVal = pageContent[regionKey] || '';
    const tempPrev = document.createElement('div');
    tempPrev.innerHTML = prevVal;
    const cleanPrev = (tempPrev.textContent || '').replace(/\s+/g, ' ').trim();
    const prevWords = cleanPrev === '' ? 0 : cleanPrev.split(/\s+/).length;

    const tempNew = document.createElement('div');
    tempNew.innerHTML = val;
    const cleanNew = (tempNew.textContent || '').replace(/\s+/g, ' ').trim();
    const newWords = cleanNew === '' ? 0 : cleanNew.split(/\s+/).length;

    const wordDiff = newWords - prevWords;
    if (wordDiff !== 0) {
      setBookTotalWords(prev => {
        const nextWords = Math.max(0, prev + wordDiff);
        setSessionWordCount(Math.max(0, nextWords - startingTotalWords));
        return nextWords;
      });
    }

    // Check if limit is enabled, region is 'main', and the limit is exceeded (disabled in drafting mode)
    if (limitEnabled && regionKey === 'main' && !draftingMode) {
      const cleanText = cleanNew;
      const count = limitType === 'words' ? newWords : cleanText.length;

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
  const saveFormattedContent = (regionKey: string, html: string) => {
    handleFieldChange(regionKey, html);
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
      saveTimerRef.current = null;
    }
    saveFieldData(regionKey, html);
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
  const handleCreateContinuationFromPage = async (fromPageId: string, overflowContent: string, regionKey: string): Promise<string> => {
    if (!activeBookDetails) throw new Error("No book details loaded");
    const currentPage = activeBookDetails.pages.find(p => p.id === fromPageId);
    if (!currentPage) throw new Error("Page not found");
    
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
    
    await loadBookDetails(activeBookId!);
    return newPage.id;
  };

  const handleAutoCreateContinuation = async (overflowContent: string, regionKey: string, focusNewPage = true) => {
    if (!activePageId) return;
    try {
      const newPageId = await handleCreateContinuationFromPage(activePageId, overflowContent, regionKey);
      if (focusNewPage) {
        setActivePageId(newPageId);
        setFocusHint({ target: 'start', timestamp: Date.now() });
      }
    } catch (err) { console.error(err); }
  };

  const handleMergePages = async (prevPageId: string, currentPageId: string, regionKey: string, mergedContent: string) => {
    try {
      await invoke('save_page_content', { pageId: prevPageId, regionKey, content: mergedContent });
      
      // Double check: does the page have text in other regions?
      const curData: Record<string, string> = await invoke('get_page_content', { pageId: currentPageId });
      const hasActualText = (htmlStr: string) => {
        if (!htmlStr) return false;
        if (htmlStr.includes('<img') || htmlStr.includes('<iframe')) return true;
        const plainText = htmlStr
          .replace(/<[^>]*>/g, '')
          .replace(/&nbsp;/g, ' ')
          .replace(/&amp;/g, '&')
          .replace(/&lt;/g, '<')
          .replace(/&gt;/g, '>')
          .trim();
        return plainText.length > 0;
      };
      
      const otherRegionsHaveContent = Object.keys(curData).some(key => {
        if (key === regionKey) return false;
        return hasActualText(curData[key]);
      });

      if (otherRegionsHaveContent) {
        // Do not delete page, just clear current region
        await invoke('save_page_content', { pageId: currentPageId, regionKey, content: '' });
      } else {
        await invoke('delete_page', { id: currentPageId });
        if (activePageId === currentPageId) setActivePageId(prevPageId);
      }
      await loadBookDetails(activeBookId!);
    } catch (err) {
      console.error(err);
    }
  };

  const handleReflowNextPage = async (nextPageId: string, regionKey: string, newNextContent: string, deletePage: boolean, focusNextPage?: boolean) => {
    try {
      if (deletePage) {
        // Double check: does the page have text in other regions?
        const curData: Record<string, string> = await invoke('get_page_content', { pageId: nextPageId });
        const hasActualText = (htmlStr: string) => {
          if (!htmlStr) return false;
          if (htmlStr.includes('<img') || htmlStr.includes('<iframe')) return true;
          const plainText = htmlStr
            .replace(/<[^>]*>/g, '')
            .replace(/&nbsp;/g, ' ')
            .replace(/&amp;/g, '&')
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>')
            .trim();
          return plainText.length > 0;
        };
        
        const otherRegionsHaveContent = Object.keys(curData).some(key => {
          if (key === regionKey) return false;
          return hasActualText(curData[key]);
        });

        if (otherRegionsHaveContent) {
          // Do not delete page, just clear current region
          await invoke('save_page_content', { pageId: nextPageId, regionKey, content: '' });
        } else {
          await invoke('delete_page', { id: nextPageId });
          if (activePageId === nextPageId) setActivePageId(null);
        }
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
    // Only allow merging back from 'main' region
    if (regionKey !== 'main') return;

    const pages = activeBookDetails?.pages || [];
    const currentIndex = pages.findIndex(p => p.id === currentPageId);
    if (currentIndex <= 0) return;
    
    const currentPage = pages[currentIndex];
    const prevPage = pages[currentIndex - 1];
    
    // Don't merge across chapters
    if (prevPage.chapter_id !== currentPage.chapter_id) return;
    
    try {
      const curData: Record<string, string> = await invoke('get_page_content', { pageId: currentPageId });
      
      const hasActualText = (htmlStr: string) => {
        if (!htmlStr) return false;
        if (htmlStr.includes('<img') || htmlStr.includes('<iframe')) return true;
        const plainText = htmlStr
          .replace(/<[^>]*>/g, '')
          .replace(/&nbsp;/g, ' ')
          .replace(/&amp;/g, '&')
          .replace(/&lt;/g, '<')
          .replace(/&gt;/g, '>')
          .trim();
        return plainText.length > 0;
      };

      const otherRegionsHaveContent = Object.keys(curData).some(key => {
        if (key === regionKey) return false;
        return hasActualText(curData[key]);
      });

      if (otherRegionsHaveContent) {
        // If other regions (like title) have content, do not delete/merge the page
        return;
      }
      
      const prevData: Record<string, string> = await invoke('get_page_content', { pageId: prevPage.id });
      
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
    try {
      await invoke('export_book_to_epub', {
        bookId: activeBookId,
        savePath: exportPath,
        bodyFont: activeFont,
        headerFont: headerFont
      });
      setExportMessage({ success: true, text: `Successfully compiled to EPUB at ${exportPath}` });
    }
    catch (err: any) { setExportMessage({ success: false, text: `Export Failed: ${err.toString()}` }); }
  };
  const handleExportDocx = async () => {
    if (!activeBookId) return;
    setExportMessage(null);
    const docxPath = exportPath.replace(/\.epub$/i, '.docx');
    try {
      await invoke('export_book_to_docx', {
        bookId: activeBookId,
        savePath: docxPath,
        bodyFont: activeFont,
        headerFont: headerFont
      });
      setExportMessage({ success: true, text: `Successfully compiled to DOCX at ${docxPath}` });
    }
    catch (err: any) { setExportMessage({ success: false, text: `Export Failed: ${err.toString()}` }); }
  };
  const handleExportPdf = async () => {
    if (!activeBookId) return;
    setExportMessage(null);
    const pdfPath = exportPath.replace(/\.epub$/i, '.pdf');
    try {
      await invoke('export_book_to_pdf', {
        bookId: activeBookId,
        savePath: pdfPath
      });
      setExportMessage({ success: true, text: `Successfully compiled to PDF at ${pdfPath}` });
    }
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
  const toggleTheme = () => { setLightTheme(prev => !prev); };
  const applySelectionStyle = (styleName: string, value: string) => {
    const selection = window.getSelection();
    if (savedRangeRef.current && selection) {
      selection.removeAllRanges();
      selection.addRange(savedRangeRef.current);
    }
    if (!selection || selection.rangeCount === 0) return;
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

    const isBlockOrExec = ['bold', 'italic', 'underline', 'justifyLeft', 'justifyCenter', 'justifyRight', 'justifyFull', 'insertUnorderedList', 'insertOrderedList', 'formatBlock', 'createLink', 'insertTable'].includes(styleName);
    if (!isBlockOrExec && selection.isCollapsed) return;

    if (['bold', 'italic', 'underline'].includes(styleName)) {
      document.execCommand(styleName, false);
    } else if (['justifyLeft', 'justifyCenter', 'justifyRight', 'justifyFull'].includes(styleName)) {
      document.execCommand(styleName, false);
    } else if (styleName === 'insertUnorderedList' || styleName === 'insertOrderedList') {
      document.execCommand(styleName, false);
    } else if (styleName === 'formatBlock') {
      document.execCommand(styleName, false, value);
    } else if (styleName === 'createLink') {
      const url = prompt('Enter URL:');
      if (url) {
        document.execCommand('createLink', false, url);
      }
    } else if (styleName === 'insertTable') {
      const rows = parseInt(prompt('Enter number of rows:', '3') || '0');
      const cols = parseInt(prompt('Enter number of columns:', '3') || '0');
      if (rows > 0 && cols > 0) {
        let tableHtml = '<table style="width: 100%; border-collapse: collapse; margin: 16px 0; border: 1px solid var(--border-color);">';
        for (let r = 0; r < rows; r++) {
          tableHtml += '<tr>';
          for (let c = 0; c < cols; c++) {
            tableHtml += '<td style="border: 1px solid var(--border-color); padding: 8px; min-width: 50px;">&nbsp;</td>';
          }
          tableHtml += '</tr>';
        }
        tableHtml += '</table>';
        document.execCommand('insertHTML', false, tableHtml);
      }
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
      saveFormattedContent(activeRegionKey || 'main', html);
    }
    
    savedRangeRef.current = null;
    setSelectedTextExists(false);
  };

  const handleReplaceSelection = (newText: string) => {
    const selection = window.getSelection();
    if (savedRangeRef.current && selection) {
      selection.removeAllRanges();
      selection.addRange(savedRangeRef.current);
    }
    if (!selection || selection.isCollapsed || selection.rangeCount === 0) return;
    const range = selection.getRangeAt(0);

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

    range.deleteContents();
    const textNode = document.createTextNode(newText);
    range.insertNode(textNode);
    
    range.setStartAfter(textNode);
    range.collapse(true);
    selection.removeAllRanges();
    selection.addRange(range);

    if (editorEl) {
      const html = editorEl.innerHTML;
      editorEl.dispatchEvent(new CustomEvent('editor-content-formatted', { detail: { html } }));
      saveFormattedContent(activeRegionKey || 'main', html);
    }

    savedRangeRef.current = null;
    setSelectedTextExists(false);
    setSelectedText('');
  };

  const handleAppendToActivePage = (newText: string) => {
    const regionKey = activeRegionKey || 'main';
    const currentVal = pageContent[regionKey] || '';
    
    let newVal = currentVal;
    if (newVal.endsWith('</p>')) {
      newVal = newVal.slice(0, -4) + ' ' + newText + '</p>';
    } else if (newVal.trim() === '') {
      newVal = `<p>${newText}</p>`;
    } else {
      newVal = newVal + ' ' + newText;
    }
    
    saveFormattedContent(regionKey, newVal);
  };

  const activePageObj = activeBookDetails?.pages.find(p => p.id === activePageId);
  const activeTemplate = templates.find(t => t.id === activePageObj?.template_id);
  const layout = activeTemplate ? JSON.parse(activeTemplate.layout_json) : null;

  if (!userProfile) {
    return <OnboardingPage onComplete={(profile) => setUserProfile(profile)} />;
  }

  return (
    <div className={`workspace-container ${lightTheme ? 'light-mode' : ''}`}>

      {/* ── Dashboard ── */}
      {!activeBookId && (
        <Dashboard
          userProfile={userProfile}
          onUpdateProfile={(profile) => {
            setUserProfile(profile);
            localStorage.setItem('user_profile', JSON.stringify(profile));
          }}
          books={books}
          lightTheme={lightTheme}
          toggleTheme={toggleTheme}
          onOpenBook={(id) => setActiveBookId(id)}
          onDeleteBook={handleDeleteBook}
          onOpenCreateModal={() => setShowCreateBookModal(true)}
          onCheckUpdates={handleCheckForUpdates}
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
        ) : showStoryboard ? (
          <StoryboardBoard
            activeBookDetails={activeBookDetails}
            onClose={() => setShowStoryboard(false)}
            onSelectPage={(id) => {
              setActivePageId(id);
              setShowStoryboard(false);
            }}
            onDragReorderPages={handleDragReorderPages}
            onRefreshBookDetails={() => loadBookDetails(activeBookId!)}
          />
        ) : (
          <>
            <OutlineSidebar
              width={leftSidebarWidth}
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
              onDragReorderChapters={handleDragReorderChapters}
              onDragReorderPages={handleDragReorderPages}
              onDragMovePageToChapter={handleDragMovePageToChapter}
              onDragMovePageToCategory={handleDragMovePageToCategory}
              onCheckUpdates={handleCheckForUpdates}
              draftingMode={draftingMode}
            />

            {!focusMode && !sidebarCollapsed && (
              <div
                className="left-sidebar-resize-handle"
                onMouseDown={handleLeftSidebarResizeStart}
              />
            )}

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
              chapters={activeBookDetails?.chapters || []}
              layout={layout}
              focusHint={focusHint}
              pageContent={pageContent}
              activeRegionKey={activeRegionKey}
              showAppearanceMenu={_showAppearanceMenu}
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
              draftingMode={draftingMode} onToggleDraftingMode={toggleDraftingMode}
              sessionWordCount={sessionWordCount}
              bookTotalWords={bookTotalWords}
              projectWordGoal={projectWordGoal}
              dailyWordGoal={dailyWordGoal}
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
              onOpenStoryboard={() => setShowStoryboard(true)}
              onCreateComment={(regionKey, commentId, selectedText, textOffset, textLength) => {
                setNewCommentAnchor({
                  regionKey,
                  commentId,
                  selectedText,
                  textOffset,
                  textLength
                });
                setActiveTab('comments');
              }}
              templates={templates}
              onCreateContinuationFromPage={handleCreateContinuationFromPage}
              characters={activeBookDetails?.characters || []}
              smartCap={smartCap}
              smartI={smartI}
              smartSpace={smartSpace}
            />

            {!focusMode && (
              <div
                className="right-sidebar-resize-handle"
                onMouseDown={handleMouseDown}
              />
            )}

            <RightPanel
              width={rightSidebarWidth}
              focusMode={focusMode}
              activeTab={activeTab} onSetActiveTab={setActiveTab}
              activeBookDetails={activeBookDetails}
              activeRegionKey={activeRegionKey}
              selectedTextExists={selectedTextExists}
              selectedText={selectedText}
              onReplaceSelection={handleReplaceSelection}
              onAppendToActivePage={handleAppendToActivePage}
              pageContent={pageContent}
              activePageId={activePageId}
              editorialNotes={editorialNotes}
              projectAssets={projectAssets}
              onUploadAsset={handleUploadAsset}
              onDeleteAsset={handleDeleteAsset}
              onInsertAsset={insertImageAtCursor}
              selectedImageEl={selectedImageEl}
              imageWidth={imageWidth}
              imageAlign={imageAlign}
              imageMaskId={imageMaskId}
              imageBlendMode={imageBlendMode}
              imageFeather={imageFeather}
              imageFeatherX={imageFeatherX}
              imageFeatherY={imageFeatherY}
              onImageWidthChange={handleImageWidthChange}
              onImageAlignChange={handleImageAlignChange}
              onImageMaskChange={handleImageMaskChange}
              onImageBlendModeChange={handleImageBlendModeChange}
              onImageFeatherChange={handleImageFeatherChange}
              onImageFeatherXChange={handleImageFeatherXChange}
              onImageFeatherYChange={handleImageFeatherYChange}
              onDeleteSelectedImage={handleDeleteSelectedImage}
              onCropSelectedImage={handleCropSelectedImage}
              newCommentAnchor={newCommentAnchor}
              onCancelComment={() => {
                if (activePageId) loadPageContent(activePageId);
                setNewCommentAnchor(null);
              }}
              onSubmitComment={handleCreateComment}
              onToggleResolveNote={handleToggleResolveNote}
              onDeleteNote={handleDeleteEditorialNote}
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
              onExportDocx={handleExportDocx}
              onExportPdf={handleExportPdf}
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
              smartCap={smartCap} onSetSmartCap={setSmartCap}
              smartI={smartI} onSetSmartI={setSmartI}
              smartSpace={smartSpace} onSetSmartSpace={setSmartSpace}
            />
            {selectedTextExists && (
              <FloatingToolbar
                focusMode={focusMode}
                applySelectionStyle={applySelectionStyle}
                rightSidebarWidth={rightSidebarWidth}
              />
            )}
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

      {cropModal && (
        <ImageCropModal
          isOpen={cropModal.isOpen}
          imageSrc={cropModal.imageSrc}
          onConfirm={handleConfirmCrop}
          onCancel={() => setCropModal(null)}
        />
      )}

      {/* ── Update System Modal ── */}
      {updateState && updateState.isOpen && (
        <div className="modal-backdrop no-print">
          <div className="modal-content" style={{ maxWidth: '420px', width: '100%', padding: '24px', position: 'relative' }}>
            {/* Close Button */}
            {(updateState.status === 'up-to-date' || updateState.status === 'available' || updateState.status === 'complete') && (
              <button 
                onClick={() => setUpdateState(null)} 
                style={{ position: 'absolute', top: '16px', right: '16px', background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '20px', lineHeight: '1' }}
              >
                &times;
              </button>
            )}

            <div style={{ textAlign: 'center', marginBottom: '20px' }}>
              <div style={{ 
                display: 'inline-flex', 
                alignItems: 'center', 
                justifyContent: 'center', 
                width: '56px', 
                height: '56px', 
                borderRadius: '50%', 
                background: 'var(--accent-glow)', 
                color: 'var(--accent-secondary)', 
                marginBottom: '16px' 
              }}>
                <RefreshCw size={28} className={updateState.status === 'checking' || updateState.status === 'downloading' || updateState.status === 'installing' ? 'spin-animation' : ''} />
              </div>
              <h3 style={{ fontSize: '18px', fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>
                {updateState.status === 'checking' && 'Checking for Updates...'}
                {updateState.status === 'up-to-date' && 'System Up to Date'}
                {updateState.status === 'available' && 'Update Available!'}
                {updateState.status === 'downloading' && 'Downloading Update...'}
                {updateState.status === 'installing' && 'Installing Update...'}
                {updateState.status === 'complete' && 'Update Installed!'}
              </h3>
              <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '6px', marginBottom: 0 }}>
                Current Version: <code style={{ background: 'rgba(255,255,255,0.05)', padding: '2px 4px', borderRadius: '4px' }}>v{updateState.currentVersion}</code>
              </p>
            </div>

            {/* Checking Screen */}
            {updateState.status === 'checking' && (
              <div style={{ textAlign: 'center', color: 'var(--text-secondary)', fontSize: '13px', padding: '10px 0' }}>
                Connecting to Ligama secure update server...
              </div>
            )}

            {/* Up to Date Screen */}
            {updateState.status === 'up-to-date' && (
              <div style={{ textAlign: 'center', fontSize: '13px', color: 'var(--text-secondary)' }}>
                <p style={{ marginBottom: '16px' }}>You are running the latest version of Ligama Book Writer. No action is required.</p>
                <button className="btn btn-primary" style={{ width: '100%' }} onClick={() => setUpdateState(null)}>
                  Close
                </button>
              </div>
            )}

            {/* Update Available Screen */}
            {updateState.status === 'available' && (
              <div>
                <div style={{ background: 'rgba(255, 255, 255, 0.02)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '14px', marginBottom: '16px', textAlign: 'left' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '13px' }}>
                    <span style={{ fontWeight: 600 }}>New Version:</span>
                    <span style={{ color: 'var(--accent-secondary)', fontWeight: 600 }}>v{updateState.latestVersion}</span>
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
                    <div style={{ fontWeight: 600, marginBottom: '4px', color: 'var(--text-primary)' }}>Changelog:</div>
                    <ul style={{ paddingLeft: '16px', margin: 0 }}>
                      <li>🚀 Added Smart Writing Assistant (Auto-Capitalize sentences & 'i', double space shortcut)</li>
                      <li>🛡️ Enhanced editor protection preventing backspace deletion on title or populated pages</li>
                      <li>🏎️ Refactored auto-pagination reflow performance for large manuscripts</li>
                    </ul>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setUpdateState(null)}>Later</button>
                  <button className="btn btn-primary" style={{ flex: 1 }} onClick={handleStartUpdate}>Update Now</button>
                </div>
              </div>
            )}

            {/* Downloading & Installing Screens */}
            {(updateState.status === 'downloading' || updateState.status === 'installing') && (
              <div>
                <div style={{ height: '8px', background: 'var(--border-color)', borderRadius: '4px', overflow: 'hidden', marginBottom: '12px' }}>
                  <div style={{ 
                    height: '100%', 
                    background: 'linear-gradient(90deg, var(--accent-primary), var(--accent-secondary))', 
                    width: `${updateState.progress}%`,
                    transition: 'width 0.3s ease'
                  }} />
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--text-secondary)' }}>
                  <span>
                    {updateState.status === 'downloading' ? `Downloading package...` : `Installing files...`}
                  </span>
                  <span>{updateState.progress}%</span>
                </div>
              </div>
            )}

            {/* Complete Screen */}
            {updateState.status === 'complete' && (
              <div style={{ textAlign: 'center', fontSize: '13px' }}>
                <p style={{ color: 'var(--text-secondary)', marginBottom: '16px' }}>
                  The update has been successfully installed. Restart the application to apply the changes.
                </p>
                <button 
                  className="btn btn-primary" 
                  style={{ width: '100%' }} 
                  onClick={() => {
                    setUpdateState(null);
                    window.location.reload();
                  }}
                >
                  Restart Now
                </button>
              </div>
            )}
          </div>
        </div>
      )}

    </div>
  );
}

export default App;
