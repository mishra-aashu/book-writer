import React, { useState, useEffect, useRef } from 'react';
import {
  BookOpen, ChevronLeft, ChevronRight, Sun, Moon, EyeOff,
  FileText, File, Copyright, Heart, Quote, List, Map, MessageSquare,
  PenTool, Award, Play, Columns, Heading, AlignLeft, Clock, Compass,
  Folder, Book as BookIcon, User, Layers, MessagesSquare, Film, Users, Tv, Clipboard,
  Square, ChevronDown, Sparkles, Undo, Redo
} from 'lucide-react';
import RichTextEditor from './RichTextEditor';
import { ScreenplayEditor } from './ScreenplayEditor';
import { ConfirmModal } from './Modals';
import type { Book, Page, ActiveFont, HeaderFont, EditorWidth, AutosaveStatus, Template } from './types';
import { HEADER_FONT_FAMILIES } from './types';

const layoutIcons: Record<string, React.ComponentType<{ size?: number; style?: React.CSSProperties }>> = {
  half_title: FileText,
  verso_blank: File,
  full_title: BookOpen,
  copyright: Copyright,
  dedication: Heart,
  epigraph: Quote,
  toc: List,
  illustrations: Map,
  foreword: MessageSquare,
  preface: PenTool,
  acknowledgments: Award,
  prologue: Play,
  divider: Columns,
  chapter_start: Heading,
  standard_prose: AlignLeft,
  interlude: Clock,
  epilogue: Compass,
  afterword: BookOpen,
  appendix: Folder,
  glossary: BookIcon,
  about_author: User,
  also_by: Layers,
  discussion: MessagesSquare,
  screenplay_title: BookOpen,
  screenplay_fade_in: Play,
  screenplay_standard: Film,
  screenplay_cast: Users,
  screenplay_toc: List,
  screenplay_act_break: Tv,
  screenplay_revision: Clipboard,
  screenplay_fade_out: Square
};

export const getLayoutIcon = (type: string, size = 14) => {
  const IconComponent = layoutIcons[type] || FileText;
  return <IconComponent size={size} style={{ flexShrink: 0 }} />;
};

interface LayoutOption {
  value: string;
  label: string;
  isUnique?: boolean;
}

interface LayoutGroup {
  label: string;
  options: LayoutOption[];
}

const getScreenplayOptions = (showAll: boolean): LayoutGroup[] => {
  if (!showAll) {
    return [
      {
        label: "",
        options: [
          { value: "screenplay_title", label: "Title Page", isUnique: true },
          { value: "screenplay_fade_in", label: "FADE IN Page", isUnique: true },
          { value: "screenplay_standard", label: "Standard Script Scene" },
          { value: "screenplay_fade_out", label: "FADE OUT Page", isUnique: true }
        ]
      }
    ];
  }
  return [
    {
      label: "Intro Pages",
      options: [
        { value: "screenplay_title", label: "Title Page", isUnique: true },
        { value: "screenplay_fade_in", label: "FADE IN Page", isUnique: true },
        { value: "screenplay_cast", label: "Cast List Page" }
      ]
    },
    {
      label: "Script Elements",
      options: [
        { value: "screenplay_standard", label: "Standard Script Scene" },
        { value: "screenplay_act_break", label: "Act Break Page" },
        { value: "screenplay_revision", label: "Revision Draft Page" }
      ]
    },
    {
      label: "Outro Pages",
      options: [
        { value: "screenplay_toc", label: "Table of Contents" },
        { value: "screenplay_fade_out", label: "FADE OUT Page", isUnique: true }
      ]
    }
  ];
};

const getFrontMatterOptions = (showAll: boolean): LayoutGroup[] => {
  if (!showAll) {
    return [
      {
        label: "",
        options: [
          { value: "full_title", label: "Full Title Page" },
          { value: "copyright", label: "Copyright Page", isUnique: true },
          { value: "toc", label: "Table of Contents", isUnique: true },
          { value: "dedication", label: "Dedication Page" }
        ]
      }
    ];
  }
  return [
    {
      label: "Opening Pages",
      options: [
        { value: "half_title", label: "Half Title Page" },
        { value: "verso_blank", label: "Blank / Verso Page" },
        { value: "full_title", label: "Full Title Page" },
        { value: "copyright", label: "Copyright Page", isUnique: true }
      ]
    },
    {
      label: "Reader Intro",
      options: [
        { value: "dedication", label: "Dedication Page" },
        { value: "epigraph", label: "Epigraph Page" },
        { value: "preface", label: "Preface" },
        { value: "foreword", label: "Foreword" },
        { value: "acknowledgments", label: "Acknowledgments" }
      ]
    },
    {
      label: "Book Navigation & Opening",
      options: [
        { value: "toc", label: "Table of Contents", isUnique: true },
        { value: "illustrations", label: "List of Illustrations/Maps" },
        { value: "prologue", label: "Prologue" }
      ]
    }
  ];
};

const getBodyOptions = (showAll: boolean): LayoutGroup[] => {
  if (!showAll) {
    return [
      {
        label: "",
        options: [
          { value: "standard_prose", label: "Standard Prose Page" },
          { value: "chapter_start", label: "Chapter Opening Page" }
        ]
      }
    ];
  }
  return [
    {
      label: "Core Content",
      options: [
        { value: "standard_prose", label: "Standard Prose Page" },
        { value: "chapter_start", label: "Chapter Opening Page" }
      ]
    },
    {
      label: "Structural Blocks",
      options: [
        { value: "divider", label: "Part Divider Page" },
        { value: "interlude", label: "Interlude / Intermission" }
      ]
    }
  ];
};

const getBackMatterOptions = (showAll: boolean): LayoutGroup[] => {
  if (!showAll) {
    return [
      {
        label: "",
        options: [
          { value: "epilogue", label: "Epilogue" },
          { value: "about_author", label: "About the Author" },
          { value: "glossary", label: "Glossary" }
        ]
      }
    ];
  }
  return [
    {
      label: "Narrative Outros",
      options: [
        { value: "epilogue", label: "Epilogue" },
        { value: "afterword", label: "Afterword" }
      ]
    },
    {
      label: "Appendices & Reference",
      options: [
        { value: "appendix", label: "Appendix" },
        { value: "glossary", label: "Glossary" }
      ]
    },
    {
      label: "Author & Reader Engagement",
      options: [
        { value: "about_author", label: "About the Author" },
        { value: "also_by", label: "Also By This Author" },
        { value: "discussion", label: "Book Club Discussion" }
      ]
    }
  ];
};

interface EditorPaneProps {
  // Layout / sidebar controls
  sidebarCollapsed: boolean;
  onToggleSidebar: () => void;
  focusMode: boolean;
  onToggleFocusMode: () => void;
  // Active page info
  activePageId: string | null;
  activePageObj: Page | undefined;
  activeBook: Book | null;
  activeChapterName?: string;
  allPages?: Page[];
  layout: any;
  pageContent: Record<string, string>;
  activeRegionKey: string;
  // Appearance controls
  showAppearanceMenu: boolean;
  onToggleAppearanceMenu: () => void;
  activeFont: ActiveFont;
  onSetActiveFont: (f: ActiveFont) => void;
  headerFont: HeaderFont;
  onSetHeaderFont: (f: HeaderFont) => void;
  fontSize: number;
  onSetFontSize: (n: number) => void;
  lineHeight: number;
  onSetLineHeight: (n: number) => void;
  letterSpacing: number;
  onSetLetterSpacing: (n: number) => void;
  paragraphSpacing: number;
  onSetParagraphSpacing: (n: number) => void;
  editorWidth: EditorWidth;
  onSetEditorWidth: (w: EditorWidth) => void;
  fitToScreen: boolean;
  onSetFitToScreen: (v: boolean) => void;
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
  // Autosave indicator
  autosaveStatus: AutosaveStatus;
  // Theme
  lightTheme: boolean;
  onToggleTheme: () => void;
  // Handlers
  onFocusRegion: (regionKey: string) => void;
  onFieldChange: (regionKey: string, val: string) => void;
  onFieldBlur: (regionKey: string, val: string) => void;
  onAutoCreateContinuation: (overflowContent: string, regionKey: string) => void;
  onUpdatePageMeta: (category: 'front_matter' | 'body' | 'back_matter' | 'screenplay', pageType: string) => void;
  getGridRegions: (areasStr?: string) => string[];
  onMergePages: (prevPageId: string, currentPageId: string, regionKey: string, mergedContent: string) => void;
  onReflowNextPage: (nextPageId: string, regionKey: string, newNextContent: string, deletePage: boolean, focusNextPage?: boolean) => Promise<void>;
  onFetchPageContent: (pageId: string) => Promise<Record<string, string>>;
  onMergeBackward: (currentPageId: string, regionKey: string) => void;
  onOpenPreview: () => void;
  templates: Template[];
  onCreateContinuationFromPage?: (fromPageId: string, overflowContent: string, regionKey: string) => Promise<string>;
  focusHint: { target: 'start' | 'end' | 'none'; timestamp: number };
}

const getDynamicGridTemplateRows = (rowsStr?: string) => {
  if (!rowsStr) return 'minmax(0, 1fr)';
  return rowsStr.replace(/\b1fr\b/g, 'minmax(0, 1fr)');
};

const EditorPane: React.FC<EditorPaneProps> = ({
  sidebarCollapsed,
  onToggleSidebar,
  focusMode,
  onToggleFocusMode,
  activePageId,
  activePageObj,
  activeBook,
  activeChapterName = '',
  allPages = [],
  layout,
  pageContent,
  activeRegionKey,
  showAppearanceMenu: _showAppearanceMenu,
  onToggleAppearanceMenu: _onToggleAppearanceMenu,
  activeFont,
  onSetActiveFont: _onSetActiveFont,
  headerFont,
  onSetHeaderFont: _onSetHeaderFont,
  fontSize,
  onSetFontSize: _onSetFontSize,
  lineHeight,
  onSetLineHeight: _onSetLineHeight,
  letterSpacing,
  onSetLetterSpacing: _onSetLetterSpacing,
  paragraphSpacing,
  onSetParagraphSpacing: _onSetParagraphSpacing,
  editorWidth: _editorWidth,
  onSetEditorWidth: _onSetEditorWidth,
  fitToScreen,
  onSetFitToScreen,
  pageHeight,
  onSetPageHeight: _onSetPageHeight,
  pagePadding,
  onSetPagePadding: _onSetPagePadding,
  limitEnabled,
  onSetLimitEnabled: _onSetLimitEnabled,
  limitType,
  onSetLimitType: _onSetLimitType,
  limitValue,
  onSetLimitValue: _onSetLimitValue,
  autosaveStatus,
  lightTheme,
  onToggleTheme,
  onFocusRegion,
  onFieldChange,
  onFieldBlur,
  onAutoCreateContinuation,
  onUpdatePageMeta,
  getGridRegions,
  onMergePages: _onMergePages,
  onReflowNextPage,
  onFetchPageContent,
  onMergeBackward,
  onOpenPreview,
  templates,
  onCreateContinuationFromPage,
  focusHint,
}) => {
  const [showAllLayouts, setShowAllLayouts] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [confirmChange, setConfirmChange] = useState<{ cat: 'front_matter' | 'body' | 'back_matter' | 'screenplay'; val: string } | null>(null);

  const canvasRef = useRef<HTMLDivElement>(null);
  const debounceTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const extractLastBlock = (html: string) => {
    if (typeof window === 'undefined') return { keep: html, move: '' };
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    const nodes = Array.from(doc.body.childNodes);
    if (nodes.length === 0) return { keep: '', move: '' };
    
    if (nodes.length === 1) {
      const singleNode = nodes[0];
      const text = singleNode.textContent || '';
      if (text.length > 30) {
        const words = text.split(/\s+/);
        if (words.length > 5) {
          const splitWordIdx = Math.max(1, Math.round(words.length * 0.85));
          const keepText = words.slice(0, splitWordIdx).join(' ');
          const moveText = words.slice(splitWordIdx).join(' ');
          
          const keepDiv = document.createElement('div');
          const keepP = document.createElement('p');
          keepP.className = (singleNode as HTMLElement).className || '';
          keepP.innerHTML = keepText;
          keepDiv.appendChild(keepP);
          
          const moveDiv = document.createElement('div');
          const moveP = document.createElement('p');
          moveP.className = (singleNode as HTMLElement).className || '';
          moveP.innerHTML = moveText;
          moveDiv.appendChild(moveP);
          
          return {
            keep: keepDiv.innerHTML,
            move: moveDiv.innerHTML
          };
        }
      }
      return { keep: html, move: '' };
    }
    
    const lastNode = nodes[nodes.length - 1];
    const keepNodes = nodes.slice(0, nodes.length - 1);
    
    const keepDiv = document.createElement('div');
    keepNodes.forEach(n => keepDiv.appendChild(n.cloneNode(true)));
    
    const moveDiv = document.createElement('div');
    moveDiv.appendChild(lastNode.cloneNode(true));
    
    return {
      keep: keepDiv.innerHTML,
      move: moveDiv.innerHTML
    };
  };

  const copyTextStyles = (src: HTMLElement, dest: HTMLElement) => {
    const style = window.getComputedStyle(src);
    dest.style.fontFamily = style.fontFamily;
    dest.style.fontSize = style.fontSize;
    dest.style.fontWeight = style.fontWeight;
    dest.style.fontStyle = style.fontStyle;
    dest.style.lineHeight = style.lineHeight;
    dest.style.letterSpacing = style.letterSpacing;
    dest.style.textTransform = style.textTransform;
    dest.style.whiteSpace = 'pre-wrap';
    dest.style.wordBreak = 'break-word';
    dest.style.wordWrap = 'break-word';
    dest.style.overflowWrap = 'break-word';
    dest.style.boxSizing = 'border-box';
    dest.style.padding = style.padding;
    dest.style.margin = style.margin;
  };

  const splitActiveRegionContent = (
    editorEl: HTMLElement,
    availableHeight: number
  ) => {
    const children = Array.from(editorEl.children) as HTMLElement[];
    if (children.length === 0) {
      const text = editorEl.textContent || '';
      if (!text.trim()) return { keep: editorEl.innerHTML, move: '' };

      const childAvailableHeight = availableHeight;
      // 1. Sentences
      const sentences = text.match(/[^.!?]+[.!?]+\s*|[^.!?]+$/g) || [text];
      if (sentences.length > 1 && childAvailableHeight > 20) {
        const tempDiv = document.createElement('div');
        tempDiv.style.width = `${editorEl.clientWidth}px`;
        copyTextStyles(editorEl, tempDiv);
        document.body.appendChild(tempDiv);

        let fitSentencesCount = 0;
        for (let i = 0; i < sentences.length; i++) {
          tempDiv.innerHTML += sentences[i];
          if (tempDiv.offsetHeight > childAvailableHeight) {
            if (i > 0) {
              fitSentencesCount = i;
            }
            break;
          }
        }
        document.body.removeChild(tempDiv);

        if (fitSentencesCount > 0) {
          const keepText = sentences.slice(0, fitSentencesCount).join('');
          const moveText = sentences.slice(fitSentencesCount).join('');
          return { keep: keepText, move: moveText };
        }
      }

      // 2. Words
      if (childAvailableHeight > 20) {
        const words = text.split(/(\s+)/);
        if (words.length > 1) {
          const tempDiv = document.createElement('div');
          tempDiv.style.width = `${editorEl.clientWidth}px`;
          copyTextStyles(editorEl, tempDiv);
          document.body.appendChild(tempDiv);

          let fitWordsCount = 0;
          for (let i = 0; i < words.length; i++) {
            tempDiv.innerHTML += words[i];
            if (tempDiv.offsetHeight > childAvailableHeight) {
              if (i > 0) {
                fitWordsCount = i;
              }
              break;
            }
          }
          document.body.removeChild(tempDiv);

          if (fitWordsCount > 0) {
            const keepText = words.slice(0, fitWordsCount).join('');
            const moveText = words.slice(fitWordsCount).join('');
            return { keep: keepText, move: moveText };
          }
        }
      }

      // 3. Characters
      if (childAvailableHeight > 20) {
        const chars = Array.from(text);
        if (chars.length > 1) {
          const tempDiv = document.createElement('div');
          tempDiv.style.width = `${editorEl.clientWidth}px`;
          copyTextStyles(editorEl, tempDiv);
          document.body.appendChild(tempDiv);

          let fitCharsCount = 0;
          for (let i = 0; i < chars.length; i++) {
            tempDiv.innerHTML += chars[i];
            if (tempDiv.offsetHeight > childAvailableHeight) {
              if (i > 0) {
                fitCharsCount = i;
              }
              break;
            }
          }
          document.body.removeChild(tempDiv);

          if (fitCharsCount > 0) {
            const keepText = chars.slice(0, fitCharsCount).join('');
            const moveText = chars.slice(fitCharsCount).join('');
            return { keep: keepText, move: moveText };
          }
        }
      }

      return { keep: editorEl.innerHTML, move: '' };
    }

    let splitChildIdx = -1;
    const editorRect = editorEl.getBoundingClientRect();
    for (let i = 0; i < children.length; i++) {
      const child = children[i];
      const childRect = child.getBoundingClientRect();
      const bottom = childRect.bottom - editorRect.top;
      if (bottom > availableHeight) {
        splitChildIdx = i;
        break;
      }
    }

    if (splitChildIdx === -1) {
      return { keep: editorEl.innerHTML, move: '' };
    }

    // Attempt to split the overflowing block element at sentence level
    const child = children[splitChildIdx];
    const text = child.textContent || '';
    // Match sentences including punctuation (., !, ?) followed by whitespace, or trailing text
    const sentences = text.match(/[^.!?]+[.!?]+\s*|[^.!?]+$/g) || [text];
    
    // Calculate the remaining height available for this child
    const childRect = child.getBoundingClientRect();
    const childOffsetTop = childRect.top - editorRect.top;
    const childAvailableHeight = availableHeight - childOffsetTop;

    if (sentences.length > 1 && childAvailableHeight > 20) {
      const tempDiv = document.createElement('div');
      tempDiv.style.width = `${editorEl.clientWidth}px`;
      // Use child's computed styles to measure text wrapping and font sizes accurately
      copyTextStyles(child, tempDiv);
      document.body.appendChild(tempDiv);

      let fitSentencesCount = 0;
      for (let i = 0; i < sentences.length; i++) {
        tempDiv.innerHTML += sentences[i];
        if (tempDiv.offsetHeight > childAvailableHeight) {
          if (i > 0) {
            fitSentencesCount = i;
          }
          break;
        }
      }
      document.body.removeChild(tempDiv);

      // Widow/Orphan adjustment
      // Rule 1 (Orphan): If only 1 sentence fits on current page, shift the whole paragraph
      if (fitSentencesCount === 1) {
        fitSentencesCount = 0;
      }
      // Rule 2 (Widow): If only 1 sentence is left for next page, shift 2 sentences
      if (fitSentencesCount === sentences.length - 1) {
        fitSentencesCount = Math.max(0, fitSentencesCount - 1);
      }

      if (fitSentencesCount > 0) {
        const keepText = sentences.slice(0, fitSentencesCount).join('');
        const moveText = sentences.slice(fitSentencesCount).join('');
        
        const keepP = document.createElement(child.tagName.toLowerCase());
        keepP.className = child.className;
        keepP.innerHTML = keepText;
        
        const moveP = document.createElement(child.tagName.toLowerCase());
        moveP.className = child.className;
        moveP.innerHTML = moveText;

        const keepChildren = children.slice(0, splitChildIdx);
        const moveChildren = children.slice(splitChildIdx + 1);

        const keepHTML = keepChildren.map(c => c.outerHTML).join('') + keepP.outerHTML;
        const moveHTML = moveP.outerHTML + moveChildren.map(c => c.outerHTML).join('');

        return {
          keep: keepHTML,
          move: moveHTML
        };
      }
    }

    // Fallback: If sentence split failed or didn't fit, try word-level splitting
    if (childAvailableHeight > 20) {
      const words = text.split(/(\s+)/); // Preserve whitespace formatting
      if (words.length > 1) {
        const tempDiv = document.createElement('div');
        tempDiv.style.width = `${editorEl.clientWidth}px`;
        copyTextStyles(child, tempDiv);
        document.body.appendChild(tempDiv);

        let fitWordsCount = 0;
        for (let i = 0; i < words.length; i++) {
          tempDiv.innerHTML += words[i];
          if (tempDiv.offsetHeight > childAvailableHeight) {
            if (i > 0) {
              fitWordsCount = i;
            }
            break;
          }
        }
        document.body.removeChild(tempDiv);

        if (fitWordsCount > 0) {
          const keepText = words.slice(0, fitWordsCount).join('');
          const moveText = words.slice(fitWordsCount).join('');
          
          const keepP = document.createElement(child.tagName.toLowerCase());
          keepP.className = child.className;
          keepP.innerHTML = keepText;
          
          const moveP = document.createElement(child.tagName.toLowerCase());
          moveP.className = child.className;
          moveP.innerHTML = moveText;

          const keepChildren = children.slice(0, splitChildIdx);
          const moveChildren = children.slice(splitChildIdx + 1);

          const keepHTML = keepChildren.map(c => c.outerHTML).join('') + keepP.outerHTML;
          const moveHTML = moveP.outerHTML + moveChildren.map(c => c.outerHTML).join('');

          return {
            keep: keepHTML,
            move: moveHTML
          };
        }
      }
    }

    // Final Fallback: Character-level splitting (handles single giant words with no spaces)
    if (childAvailableHeight > 20) {
      const chars = Array.from(text);
      if (chars.length > 1) {
        const tempDiv = document.createElement('div');
        tempDiv.style.width = `${editorEl.clientWidth}px`;
        copyTextStyles(child, tempDiv);
        document.body.appendChild(tempDiv);

        let fitCharsCount = 0;
        for (let i = 0; i < chars.length; i++) {
          tempDiv.innerHTML += chars[i];
          if (tempDiv.offsetHeight > childAvailableHeight) {
            if (i > 0) {
              fitCharsCount = i;
            }
            break;
          }
        }
        document.body.removeChild(tempDiv);

        if (fitCharsCount > 0) {
          const keepText = chars.slice(0, fitCharsCount).join('');
          const moveText = chars.slice(fitCharsCount).join('');
          
          const keepP = document.createElement(child.tagName.toLowerCase());
          keepP.className = child.className;
          keepP.innerHTML = keepText;
          
          const moveP = document.createElement(child.tagName.toLowerCase());
          moveP.className = child.className;
          moveP.innerHTML = moveText;

          const keepChildren = children.slice(0, splitChildIdx);
          const moveChildren = children.slice(splitChildIdx + 1);

          const keepHTML = keepChildren.map(c => c.outerHTML).join('') + keepP.outerHTML;
          const moveHTML = moveP.outerHTML + moveChildren.map(c => c.outerHTML).join('');

          return {
            keep: keepHTML,
            move: moveHTML
          };
        }
      }
    }

    // Default block-level split if sentence and word splitting cannot be applied
    const keepChildren = children.slice(0, splitChildIdx);
    const moveChildren = children.slice(splitChildIdx);

    const keepHTML = keepChildren.map(c => c.outerHTML).join('');
    const moveHTML = moveChildren.map(c => c.outerHTML).join('');

    return {
      keep: keepHTML,
      move: moveHTML
    };
  };

  const reflowPageHeadlessly = async (pageIndex: number): Promise<void> => {
    if (pageIndex < 0 || pageIndex >= allPages.length) return;
    
    const page = allPages[pageIndex];
    // Avoid headlessly reflowing the currently active page since it is managed by the main useEffect hook.
    if (page.id === activePageId) return;

    const template = templates.find(t => t.id === page.template_id);
    if (!template) return;
    const layoutObj = JSON.parse(template.layout_json);
    
    const contentData = await onFetchPageContent(page.id);
    const regionKey = activeRegionKey || 'main';
    const isScreenplay = page.category === 'screenplay';
    
    const tempCanvas = document.createElement('div');
    tempCanvas.className = `book-page-canvas font-${isScreenplay ? 'courier' : activeFont} page-type-${page.page_type || 'standard'}`;
    
    tempCanvas.style.display = layoutObj.display || 'grid';
    tempCanvas.style.gridTemplateAreas = layoutObj.gridTemplateAreas;
    tempCanvas.style.gridTemplateColumns = layoutObj.gridTemplateColumns;
    
    const getDynamicGridTemplateRowsLocal = (rowsStr?: string) => {
      if (!rowsStr) return 'minmax(0, 1fr)';
      return rowsStr.replace(/\b1fr\b/g, 'minmax(0, 1fr)');
    };
    tempCanvas.style.gridTemplateRows = getDynamicGridTemplateRowsLocal(layoutObj.gridTemplateRows);
    tempCanvas.style.gap = layoutObj.gap || '20px';
    tempCanvas.style.fontSize = `${fontSize}px`;
    tempCanvas.style.lineHeight = String(lineHeight);
    tempCanvas.style.letterSpacing = `${letterSpacing}em`;
    tempCanvas.style.setProperty('--paragraph-spacing', `${paragraphSpacing}em`);
    tempCanvas.style.setProperty('--font-display-current', HEADER_FONT_FAMILIES[headerFont] || HEADER_FONT_FAMILIES.playfair);
    
    tempCanvas.style.width = `${Math.round(pageHeight / 1.414)}px`;
    tempCanvas.style.height = `${pageHeight}px`;
    tempCanvas.style.padding = `${pagePadding}px ${Math.round(pagePadding * 1.33)}px`;
    tempCanvas.style.boxSizing = 'border-box';
    tempCanvas.style.overflow = 'hidden';
    tempCanvas.style.position = 'absolute';
    tempCanvas.style.visibility = 'hidden';
    tempCanvas.style.left = '-9999px';
    
    document.body.appendChild(tempCanvas);
    
    const regions = getGridRegions(layoutObj.gridTemplateAreas);
    const regionElements: Record<string, HTMLElement> = {};
    
    for (const key of regions) {
      const regionDiv = document.createElement('div');
      regionDiv.className = `book-page-region grid-${key}`;
      regionDiv.style.gridArea = key;
      regionDiv.style.display = 'flex';
      regionDiv.style.flexDirection = 'column';
      
      const isStandardProse = page.template_id === 'standard';
      const isStaticHeaderFooter = isStandardProse && (key === 'header' || key === 'footer');
      
      if (!isStaticHeaderFooter) {
        const editorTextarea = document.createElement('div');
        editorTextarea.className = 'editor-textarea';
        editorTextarea.style.outline = 'none';
        editorTextarea.style.whiteSpace = 'pre-wrap';
        editorTextarea.style.wordBreak = 'break-word';
        editorTextarea.style.width = '100%';
        editorTextarea.style.minHeight = '100%';
        editorTextarea.innerHTML = contentData[key] || '';
        regionDiv.appendChild(editorTextarea);
        regionElements[key] = editorTextarea;
      } else {
        regionDiv.innerHTML = key === 'header' ? 'HEADER' : '1';
      }
      tempCanvas.appendChild(regionDiv);
    }
    
    let hasOverflowed = false;
    let availableHeight = tempCanvas.clientHeight - (2 * pagePadding) - 10;
    
    const editorEl = regionElements[regionKey];
    if (!isScreenplay && editorEl) {
      const regionContainer = editorEl.parentElement;
      if (regionContainer) {
        availableHeight = regionContainer.clientHeight - 8;
      }
      hasOverflowed = editorEl.scrollHeight > availableHeight;
    } else {
      hasOverflowed = tempCanvas.scrollHeight > tempCanvas.clientHeight + 5;
    }
    
    if (hasOverflowed) {
      const val = contentData[regionKey] || '';
      let keep = '';
      let move = '';
      
      if (isScreenplay) {
        const res = extractLastBlock(val);
        keep = res.keep;
        move = res.move;
      } else if (editorEl) {
        const res = splitActiveRegionContent(editorEl, availableHeight);
        keep = res.keep;
        move = res.move;
      } else {
        const res = extractLastBlock(val);
        keep = res.keep;
        move = res.move;
      }
      
      document.body.removeChild(tempCanvas);
      
      if (move && move.trim()) {
        await onReflowNextPage(page.id, regionKey, keep, false, false);
        
        if (pageIndex < allPages.length - 1) {
          const nextPage = allPages[pageIndex + 1];
          const nextPageData = await onFetchPageContent(nextPage.id);
          const nextPageContent = nextPageData[regionKey] || '';
          const mergedContent = move + nextPageContent;
          
          await onReflowNextPage(nextPage.id, regionKey, mergedContent, false, false);
          await reflowPageHeadlessly(pageIndex + 1);
        } else {
          if (onCreateContinuationFromPage) {
            await onCreateContinuationFromPage(page.id, move, regionKey);
          }
        }
      }
      return;
    }
    
    if (pageIndex < allPages.length - 1) {
      const nextPage = allPages[pageIndex + 1];
      if (nextPage.category === page.category) {
        const nextPageData = await onFetchPageContent(nextPage.id);
        const nextPageContent = nextPageData[regionKey] || '';
        
        if (nextPageContent.trim()) {
          const nextParser = new DOMParser();
          const nextDoc = nextParser.parseFromString(nextPageContent, 'text/html');
          const nextNodes = Array.from(nextDoc.body.childNodes);
          
          if (nextNodes.length > 0) {
            const firstNextNode = nextNodes[0] as HTMLElement;
            const currentVal = contentData[regionKey] || '';
            let fits = false;
            
            if (!isScreenplay && editorEl) {
              const tempDiv = document.createElement('div');
              tempDiv.style.width = `${editorEl.clientWidth}px`;
              copyTextStyles(editorEl, tempDiv);
              tempDiv.style.visibility = 'hidden';
              tempDiv.style.position = 'absolute';
              document.body.appendChild(tempDiv);
              tempDiv.innerHTML = currentVal + firstNextNode.outerHTML;
              fits = tempDiv.offsetHeight <= availableHeight;
              document.body.removeChild(tempDiv);
            } else {
              const tempCanvasUnderflow = document.createElement('div');
              tempCanvasUnderflow.className = tempCanvas.className;
              tempCanvasUnderflow.style.cssText = tempCanvas.style.cssText;
              tempCanvasUnderflow.style.height = `${tempCanvas.clientHeight}px`;
              tempCanvasUnderflow.style.visibility = 'hidden';
              tempCanvasUnderflow.style.position = 'absolute';
              document.body.appendChild(tempCanvasUnderflow);
              
              const tempEditor = document.createElement('div');
              tempEditor.innerHTML = currentVal + firstNextNode.outerHTML;
              tempCanvasUnderflow.appendChild(tempEditor);
              
              fits = tempCanvasUnderflow.scrollHeight <= tempCanvasUnderflow.clientHeight;
              document.body.removeChild(tempCanvasUnderflow);
            }
            
            if (fits) {
              const updatedCurrentContent = currentVal + firstNextNode.outerHTML;
              const remainingNextNodes = nextNodes.slice(1);
              const nextDiv = document.createElement('div');
              remainingNextNodes.forEach(n => nextDiv.appendChild(n.cloneNode(true)));
              const updatedNextContent = nextDiv.innerHTML;
              
              document.body.removeChild(tempCanvas);
              
              await onReflowNextPage(page.id, regionKey, updatedCurrentContent, false, false);
              const deleteNext = remainingNextNodes.length === 0;
              await onReflowNextPage(nextPage.id, regionKey, updatedNextContent, deleteNext, false);
              
              if (!deleteNext) {
                await reflowPageHeadlessly(pageIndex + 1);
              }
              return;
            }
          }
        }
      }
    }
    
    document.body.removeChild(tempCanvas);
  };

  useEffect(() => {
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }

    debounceTimeoutRef.current = setTimeout(() => {
      const canvas = canvasRef.current;
      if (!canvas || !activePageId) return;

      const regionKey = activeRegionKey || 'main';
      const isScreenplay = activePageObj?.category === 'screenplay';

      // 1. FORWARD PAGINATION (OVERFLOW)
      let hasOverflowed = false;
      let availableHeight = canvas.clientHeight - (2 * pagePadding) - 10;

      const editorEl = canvas.querySelector(`.grid-${regionKey} .editor-textarea`) as HTMLElement;
      if (!isScreenplay && editorEl) {
        const regionContainer = canvas.querySelector(`.grid-${regionKey}`) as HTMLElement;
        if (regionContainer) {
          const comp = window.getComputedStyle(regionContainer);
          const padTop = parseFloat(comp.paddingTop) || 0;
          const padBot = parseFloat(comp.paddingBottom) || 0;
          availableHeight = regionContainer.clientHeight - padTop - padBot - 4;
        }
        hasOverflowed = editorEl.scrollHeight > availableHeight;
      } else {
        hasOverflowed = canvas.scrollHeight > canvas.clientHeight + 5;
      }

      if (hasOverflowed) {
        const val = pageContent[regionKey] || '';
        let keep = '';
        let move = '';

        if (isScreenplay) {
          const res = extractLastBlock(val);
          keep = res.keep;
          move = res.move;
        } else if (editorEl) {
          const res = splitActiveRegionContent(editorEl, availableHeight);
          keep = res.keep;
          move = res.move;
        } else {
          const res = extractLastBlock(val);
          keep = res.keep;
          move = res.move;
        }

        if (move && move.trim()) {
          onFieldChange(regionKey, keep);
          onFieldBlur(regionKey, keep);
          
          const currentPageIndex = allPages.findIndex(p => p.id === activePageId);
          if (currentPageIndex !== -1 && currentPageIndex < allPages.length - 1) {
            // Next page exists in the book! Flow overflow text into the start of the next page.
            const nextPage = allPages[currentPageIndex + 1];
            onFetchPageContent(nextPage.id).then((nextData) => {
              const nextPageContent = nextData[regionKey] || '';
              const mergedContent = move + nextPageContent;
              onReflowNextPage(nextPage.id, regionKey, mergedContent, false, true);
            });
          } else {
            // No next page exists, create a new one.
            onAutoCreateContinuation(move, regionKey);
          }
        }
        return;
      }

      // 2. BACKWARD MERGE (UNDERFLOW)
      const currentPageIndex = allPages.findIndex(p => p.id === activePageId);
      if (currentPageIndex !== -1 && currentPageIndex < allPages.length - 1) {
        const nextPage = allPages[currentPageIndex + 1];
        if (nextPage.category === activePageObj?.category) {
          onFetchPageContent(nextPage.id).then((nextData) => {
            const nextPageContent = nextData[regionKey] || '';
            if (!nextPageContent.trim()) {
              reflowPageHeadlessly(currentPageIndex + 1);
              return;
            }

            const nextParser = new DOMParser();
            const nextDoc = nextParser.parseFromString(nextPageContent, 'text/html');
            const nextNodes = Array.from(nextDoc.body.childNodes);
            if (nextNodes.length === 0) {
              reflowPageHeadlessly(currentPageIndex + 1);
              return;
            }

            const firstNextNode = nextNodes[0] as HTMLElement;

            const currentVal = pageContent[regionKey] || '';
            let fits = false;

            if (!isScreenplay && editorEl) {
              const tempDiv = document.createElement('div');
              tempDiv.style.width = `${editorEl.clientWidth}px`;
              copyTextStyles(editorEl, tempDiv);
              tempDiv.style.visibility = 'hidden';
              tempDiv.style.position = 'absolute';
              document.body.appendChild(tempDiv);
              tempDiv.innerHTML = currentVal + firstNextNode.outerHTML;
              fits = tempDiv.offsetHeight <= availableHeight;
              document.body.removeChild(tempDiv);
            } else {
              const tempCanvas = document.createElement('div');
              tempCanvas.className = canvas.className;
              tempCanvas.style.cssText = window.getComputedStyle(canvas).cssText;
              tempCanvas.style.height = `${canvas.clientHeight}px`;
              tempCanvas.style.visibility = 'hidden';
              tempCanvas.style.position = 'absolute';
              document.body.appendChild(tempCanvas);

              const tempEditor = document.createElement('div');
              tempEditor.innerHTML = currentVal + firstNextNode.outerHTML;
              tempCanvas.appendChild(tempEditor);

              fits = tempCanvas.scrollHeight <= tempCanvas.clientHeight;
              document.body.removeChild(tempCanvas);
            }

            if (fits) {
              const updatedCurrentContent = currentVal + firstNextNode.outerHTML;
              const remainingNextNodes = nextNodes.slice(1);
              const nextDiv = document.createElement('div');
              remainingNextNodes.forEach(n => nextDiv.appendChild(n.cloneNode(true)));
              const updatedNextContent = nextDiv.innerHTML;

              onFieldChange(regionKey, updatedCurrentContent);
              onFieldBlur(regionKey, updatedCurrentContent);
              
              const deleteNext = remainingNextNodes.length === 0;
              onReflowNextPage(nextPage.id, regionKey, updatedNextContent, deleteNext, false).then(() => {
                if (!deleteNext) {
                  reflowPageHeadlessly(currentPageIndex + 1);
                }
              });
            } else {
              reflowPageHeadlessly(currentPageIndex + 1);
            }
          }).catch(err => console.error(err));
        }
      }
    }, 200);

    return () => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
    };
  }, [
    pageContent,
    activePageId,
    activeRegionKey,
    pageHeight,
    pagePadding,
    allPages,
    activePageObj,
    onFieldChange,
    onFieldBlur,
    onFetchPageContent,
    onReflowNextPage,
    onAutoCreateContinuation,
    templates,
    onCreateContinuationFromPage
  ]);

  useEffect(() => {
    setShowAllLayouts(false);
    setIsDropdownOpen(false);
  }, [activePageId]);

  // Unique page checks for sequence awareness
  const hasFadeIn = allPages.some(p => p.page_type === 'screenplay_fade_in' && p.id !== activePageObj?.id);
  const hasFadeOut = allPages.some(p => p.page_type === 'screenplay_fade_out' && p.id !== activePageObj?.id);
  const hasTitlePage = allPages.some(p => p.page_type === 'screenplay_title' && p.id !== activePageObj?.id);
  const hasToc = allPages.some(p => p.page_type === 'toc' && p.id !== activePageObj?.id);
  const hasCopyright = allPages.some(p => p.page_type === 'copyright' && p.id !== activePageObj?.id);

  let activeLabel = "Standard Prose Page";
  let groups: LayoutGroup[] = [];

  if (activePageObj) {
    const activeValue = activePageObj.page_type || 'standard_prose';
    const allPossibleGroups = [
      ...getScreenplayOptions(true),
      ...getFrontMatterOptions(true),
      ...getBodyOptions(true),
      ...getBackMatterOptions(true)
    ];
    for (const g of allPossibleGroups) {
      const match = g.options.find(o => o.value === activeValue);
      if (match) {
        activeLabel = match.label;
        break;
      }
    }

    if (activePageObj.category === 'screenplay') {
      groups = getScreenplayOptions(showAllLayouts);
    } else if (activePageObj.category === 'front_matter') {
      groups = getFrontMatterOptions(showAllLayouts);
    } else if (activePageObj.category === 'back_matter') {
      groups = getBackMatterOptions(showAllLayouts);
    } else {
      groups = getBodyOptions(showAllLayouts);
    }
  }

  const handleSelectOption = (val: string) => {
    if (!activePageObj) return;
    let cat: 'front_matter' | 'body' | 'back_matter' | 'screenplay' = 'body';
    if (activeBook?.project_type === 'screenplay' || val.startsWith('screenplay_')) {
      cat = 'screenplay';
    } else {
      const frontTypes = ['half_title', 'verso_blank', 'full_title', 'copyright', 'dedication', 'epigraph', 'toc', 'illustrations', 'foreword', 'preface', 'acknowledgments', 'prologue'];
      const backTypes = ['epilogue', 'afterword', 'appendix', 'glossary', 'about_author', 'also_by', 'discussion'];
      if (frontTypes.includes(val)) cat = 'front_matter';
      else if (backTypes.includes(val)) cat = 'back_matter';
    }

    const currentIsScreenplay = activePageObj.category === 'screenplay';
    const targetIsScreenplay = cat === 'screenplay';
    const hasContent = Object.values(pageContent).some(c => c && c.replace(/<[^>]*>/g, '').trim().length > 10);

    if (currentIsScreenplay !== targetIsScreenplay && hasContent) {
      setConfirmChange({ cat, val });
    } else {
      onUpdatePageMeta(cat, val);
    }
  };
  return (
    <div className="editor-pane">
      {/* ─── Editor Header ─── */}
      <div className="editor-header no-print">
        <div className="editor-header-left">
          <button
            className="btn-icon-only"
            onClick={onToggleSidebar}
            title="Toggle Outline Sidebar"
          >
            {sidebarCollapsed ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
          </button>

          {activePageObj && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '11px', background: 'var(--accent-glow)', color: 'var(--accent-secondary)', padding: '2px 6px', borderRadius: '4px', border: '1px solid var(--accent-primary)', fontWeight: 500, textTransform: 'capitalize' }}>
                {activePageObj.category === 'front_matter' ? 'Front Matter' : activePageObj.category === 'back_matter' ? 'Back Matter' : activePageObj.category === 'screenplay' ? 'Screenplay' : 'Main Body'}
              </span>
              
              <span style={{ color: 'var(--text-muted)', fontSize: '11px' }}>➜</span>

              <div className="custom-select-container">
                <button
                  type="button"
                  className="custom-select-trigger"
                  onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                >
                  {getLayoutIcon(activePageObj.page_type || 'standard_prose')}
                  <span>{activeLabel}</span>
                  <ChevronDown size={12} style={{ opacity: 0.7 }} />
                </button>

                {isDropdownOpen && (
                  <>
                    <div
                      className="custom-select-overlay"
                      onClick={() => setIsDropdownOpen(false)}
                      style={{
                        position: 'fixed',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        zIndex: 998,
                        background: 'transparent'
                      }}
                    />
                    <div className="custom-select-dropdown">
                      {groups.map((group, gIdx) => (
                        <React.Fragment key={gIdx}>
                          {group.label && (
                            <div className="custom-select-group-title">{group.label}</div>
                          )}
                          {group.options.map((opt) => {
                            const isUniqueAndExists = opt.isUnique && (
                              opt.value === 'screenplay_title' ? hasTitlePage :
                              opt.value === 'screenplay_fade_in' ? hasFadeIn :
                              opt.value === 'screenplay_fade_out' ? hasFadeOut :
                              opt.value === 'toc' ? hasToc :
                              opt.value === 'copyright' ? hasCopyright : false
                            );
                            const isActive = opt.value === activePageObj.page_type;
                            return (
                              <div
                                key={opt.value}
                                className={`custom-select-option ${isActive ? 'active' : ''} ${isUniqueAndExists ? 'disabled' : ''}`}
                                onClick={() => {
                                  if (isUniqueAndExists) return;
                                  setIsDropdownOpen(false);
                                  handleSelectOption(opt.value);
                                }}
                              >
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                  {getLayoutIcon(opt.value)}
                                  <span>{opt.label}</span>
                                </div>
                                {isUniqueAndExists && (
                                  <span style={{ fontSize: '9px', opacity: 0.6 }}>Exists</span>
                                )}
                              </div>
                            );
                          })}
                        </React.Fragment>
                      ))}

                      {!showAllLayouts && (
                        <div
                          className="custom-select-option show-more"
                          onClick={() => setShowAllLayouts(true)}
                        >
                          <Sparkles size={11} />
                          <span>Show More Layouts...</span>
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="editor-header-right">
          {/* Autosave Indicator */}
          <div className="autosave-status">
            <div className={`status-dot ${autosaveStatus}`} />
            <span style={{ fontSize: '11px' }}>
              {autosaveStatus === 'idle' && 'Saved'}
              {autosaveStatus === 'saving' && 'Saving...'}
              {autosaveStatus === 'saved' && 'Saved'}
              {autosaveStatus === 'error' && 'Error'}
            </span>
          </div>

          {/* Divider */}
          <div style={{ width: '1px', height: '20px', background: 'var(--border-color)', flexShrink: 0 }} />

          {/* Undo / Redo — icon-only pill group */}
          <div style={{ display: 'flex', gap: '1px', alignItems: 'center', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '6px', padding: '2px' }}>
            <button
              className="toolbar-icon-btn"
              onClick={() => window.dispatchEvent(new CustomEvent('editor-undo'))}
              title="Undo (Ctrl+Z)"
            >
              <Undo size={13} />
            </button>
            <button
              className="toolbar-icon-btn"
              onClick={() => window.dispatchEvent(new CustomEvent('editor-redo'))}
              title="Redo (Ctrl+Y)"
            >
              <Redo size={13} />
            </button>
          </div>

          {/* Divider */}
          <div style={{ width: '1px', height: '20px', background: 'var(--border-color)', flexShrink: 0 }} />

          {/* View actions group: Focus + Preview */}
          <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
            <button
              className={`btn btn-secondary ${focusMode ? 'btn-primary' : ''}`}
              style={{ height: '32px', padding: '0 11px', fontSize: '12px', gap: '5px', display: 'inline-flex', alignItems: 'center', whiteSpace: 'nowrap', flexShrink: 0 }}
              onClick={onToggleFocusMode}
              title="Focus Mode"
            >
              <EyeOff size={13} />
              <span className="btn-text-responsive">{focusMode ? 'Exit Focus' : 'Focus'}</span>
            </button>
            <button
              className="btn btn-secondary"
              style={{ height: '32px', padding: '0 11px', fontSize: '12px', gap: '5px', display: 'inline-flex', alignItems: 'center', whiteSpace: 'nowrap', flexShrink: 0 }}
              onClick={onOpenPreview}
              title="Book Print Preview"
            >
              <BookOpen size={13} />
              <span className="btn-text-responsive">Preview</span>
            </button>
          </div>

          {/* Scroll / Fit Screen pill toggle */}
          <div style={{ display: 'flex', alignItems: 'center', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '6px', padding: '2px', flexShrink: 0 }}>
            <button
              type="button"
              className={!fitToScreen ? 'toolbar-seg-active' : 'toolbar-seg'}
              onClick={() => onSetFitToScreen(false)}
            >
              Scroll
            </button>
            <button
              type="button"
              className={fitToScreen ? 'toolbar-seg-active' : 'toolbar-seg'}
              onClick={() => onSetFitToScreen(true)}
            >
              Fit
            </button>
          </div>



          <button 
            className="btn-icon-only" 
            onClick={onToggleTheme}
            style={{
              height: '32px',
              width: '32px',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxSizing: 'border-box',
              padding: 0,
              flexShrink: 0
            }}
          >
            {lightTheme ? <Moon size={18} /> : <Sun size={18} />}
          </button>
        </div>
      </div>
      {/* ─── Page Canvas ─── */}
      <div className="editor-scrollable">
        {activePageId && layout ? (
          activePageObj?.page_type === 'screenplay_standard' || activePageObj?.template_id === 'screenplay_standard' ? (
            (() => {
              const val = pageContent['main'] || '';
              const cleanText = val.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
              const wordCount = cleanText === '' ? 0 : cleanText.split(/\s+/).length;
              const charCount = cleanText.length;
              const currentCount = limitType === 'words' ? wordCount : charCount;
              const percent = limitEnabled ? Math.min(100, Math.round((currentCount / limitValue) * 100)) : 0;
              const isOverLimit = limitEnabled && currentCount > limitValue;
              const isWarningLimit = limitEnabled && currentCount > limitValue * 0.9 && currentCount <= limitValue;

              return (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0', width: '100%' }}>
                   <div
                    ref={canvasRef}
                    className={`book-page-canvas font-courier screenplay-mode ${isOverLimit ? 'limit-exceeded' : ''} ${isWarningLimit ? 'limit-warning' : ''}`}
                    style={{
                      maxWidth: '100%',
                      width: fitToScreen ? 'calc((100vh - 180px) / 1.414)' : `${Math.round(pageHeight / 1.414)}px`,
                      padding: `${pagePadding}px ${Math.round(pagePadding * 1.33)}px`,
                      height: fitToScreen ? 'calc(100vh - 180px)' : `${pageHeight}px`,
                      overflow: 'hidden',
                      position: 'relative',
                    }}
                  >
                    <ScreenplayEditor
                      initialValue={val}
                      pageId={activePageId || ''}
                      focusHint={focusHint}
                      onChange={(newVal) => onFieldChange('main', newVal)}
                      onBlur={(finalVal) => onFieldBlur('main', finalVal)}
                      onMergeBackward={() => onMergeBackward(activePageId!, 'main')}
                    />

                  </div>

                  {/* Outer Controls Row (Outside the Page) */}
                  <div 
                    className="no-print"
                    style={{ 
                      display: 'flex', 
                      justifyContent: 'space-between', 
                      alignItems: 'center', 
                      width: fitToScreen ? 'calc((100vh - 180px) / 1.414)' : `${Math.round(pageHeight / 1.414)}px`, 
                      marginTop: '12px',
                      minHeight: '36px'
                    }}
                  >
                    <div>
                      {isOverLimit && (
                        <button
                          type="button"
                          onClick={() => onAutoCreateContinuation('', 'main')}
                          style={{
                            padding: '6px 14px',
                            background: 'linear-gradient(135deg, var(--accent-primary), var(--accent-secondary))',
                            color: '#fff',
                            border: 'none',
                            borderRadius: '6px',
                            fontSize: '11px',
                            fontWeight: 700,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            boxShadow: '0 2px 8px rgba(139,92,246,0.2)',
                            transition: 'transform 0.15s',
                          }}
                          onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-1px)'; }}
                          onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; }}
                        >
                          📄 Content Limit Reached — Continue on New Page →
                        </button>
                      )}
                    </div>

                    {limitEnabled && (
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          fontSize: '11px',
                          fontWeight: 600,
                          color: isOverLimit ? '#ef4444' : isWarningLimit ? '#d97706' : 'var(--text-secondary)',
                          background: 'var(--bg-card)',
                          border: `1px solid var(--border-color)`,
                          padding: '4px 10px',
                          borderRadius: '6px',
                          boxShadow: 'var(--shadow-sm)',
                        }}
                      >
                        <div style={{ width: '28px', height: '3px', background: 'rgba(139,92,246,0.15)', borderRadius: '2px', overflow: 'hidden' }}>
                          <div style={{ width: `${percent}%`, height: '100%', background: isOverLimit ? '#ef4444' : isWarningLimit ? '#f59e0b' : 'var(--accent-primary)', transition: 'width 0.3s' }} />
                        </div>
                        {currentCount}/{limitValue} {limitType === 'words' ? 'w' : 'c'}
                      </div>
                    )}
                  </div>
                </div>
              );
            })()
          ) : (
            (() => {
              // Compute total page-level limit status
              const allText = Object.values(pageContent).join(' ');
              const allClean = allText.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
              const totalWords = allClean === '' ? 0 : allClean.split(/\s+/).length;
              const totalChars = allClean.length;
              const totalCount = limitType === 'words' ? totalWords : totalChars;
              const totalPercent = limitEnabled ? Math.min(100, Math.round((totalCount / limitValue) * 100)) : 0;
              const pageOverLimit = limitEnabled && totalCount > limitValue;
              const pageWarning = limitEnabled && totalCount > limitValue * 0.9 && totalCount <= limitValue;

              return (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0', width: '100%' }}>
                   <div
                    ref={canvasRef}
                    className={`book-page-canvas font-${activePageObj?.category === 'screenplay' ? 'courier' : activeFont} page-type-${activePageObj?.page_type || 'standard'} ${pageOverLimit ? 'limit-exceeded' : ''} ${pageWarning ? 'limit-warning' : ''}`}
                    style={{
                      ['--font-display-current' as any]: HEADER_FONT_FAMILIES[headerFont] || HEADER_FONT_FAMILIES.playfair,
                      display: layout.display || 'grid',
                      gridTemplateAreas: layout.gridTemplateAreas,
                      gridTemplateColumns: layout.gridTemplateColumns,
                      gridTemplateRows: getDynamicGridTemplateRows(layout.gridTemplateRows),
                      gap: fitToScreen ? '10px' : (layout.gap || '20px'),
                      fontSize: `${fitToScreen ? Math.max(12, Math.round(fontSize * 0.75)) : fontSize}px`,
                      lineHeight: lineHeight,
                      letterSpacing: `${letterSpacing}em`,
                      ['--paragraph-spacing' as any]: `${paragraphSpacing}em`,
                      maxWidth: '100%',
                      width: fitToScreen ? 'calc((100vh - 180px) / 1.414)' : `${Math.round(pageHeight / 1.414)}px`,
                      padding: fitToScreen 
                        ? '30px 40px' 
                        : `${pagePadding}px ${Math.round(pagePadding * 1.33)}px`,
                      height: fitToScreen ? 'calc(100vh - 180px)' : `${pageHeight}px`,
                      overflow: 'hidden',
                      position: 'relative',
                    }}
                  >
                    {getGridRegions(layout.gridTemplateAreas).map((regionKey) => {
                      const val = pageContent[regionKey] || '';
                      const isEditing = activeRegionKey === regionKey;
                      const bodyPages = allPages.filter(p => p.category === 'body' || !p.category || p.category === 'screenplay');
                      const bodyPageIndex = bodyPages.findIndex(p => p.id === activePageId);
                      const pageNumber = bodyPageIndex !== -1 ? bodyPageIndex + 1 : 1;

                      const isStandardProse = activePageObj?.template_id === 'standard';
                      const isStaticHeaderFooter = isStandardProse && (regionKey === 'header' || regionKey === 'footer');

                      if (isStaticHeaderFooter) {
                        const staticText = regionKey === 'header'
                          ? (pageNumber % 2 === 0 
                              ? (activeBook?.title || 'Book Title').toUpperCase() 
                              : (activeChapterName || 'Chapter Title').toUpperCase())
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
                              color: 'rgba(26, 26, 46, 0.45)', // Premium paper ink color
                              fontFamily: 'var(--font-display-current)',
                              userSelect: 'none',
                              pointerEvents: 'none',
                              padding: '4px 0'
                            }}
                          >
                            {staticText}
                          </div>
                        );
                      }

                      return (
                        <div
                          key={regionKey}
                          className={`book-page-region grid-${regionKey} ${isEditing ? 'active-edit' : ''}`}
                          style={{ 
                            gridArea: regionKey, 
                            overflow: 'visible',
                            display: 'flex',
                            flexDirection: 'column',
                            justifyContent: regionKey === 'header' ? 'flex-start' : regionKey === 'footer' ? 'flex-end' : 'stretch',
                            textAlign: (regionKey === 'header' || regionKey === 'footer') ? 'center' : 'inherit'
                          }}
                          onFocus={() => onFocusRegion(regionKey)}
                        >
                          <span className="book-page-region-label no-print">{regionKey}</span>
                          <RichTextEditor
                            initialValue={val}
                            pageId={activePageId || ''}
                            focusHint={focusHint}
                            onChange={(newVal) => onFieldChange(regionKey, newVal)}
                            onBlur={(finalVal) => onFieldBlur(regionKey, finalVal)}
                            placeholder={`Write ${regionKey} region content...`}
                            onMergeBackward={() => onMergeBackward(activePageId!, regionKey)}
                          />
                        </div>
                      );
                    })}

                  </div>

                  {/* Outer Controls Row (Outside the Page) */}
                  <div 
                    className="no-print"
                    style={{ 
                      display: 'flex', 
                      justifyContent: 'space-between', 
                      alignItems: 'center', 
                      width: fitToScreen ? 'calc((100vh - 180px) / 1.414)' : `${Math.round(pageHeight / 1.414)}px`, 
                      marginTop: '12px',
                      minHeight: '36px'
                    }}
                  >
                    <div>
                      {pageOverLimit && (
                        <button
                          type="button"
                          onClick={() => {
                            const regions = getGridRegions(layout.gridTemplateAreas);
                            const mainRegion = regions.includes('main') ? 'main' : regions[0];
                            onAutoCreateContinuation('', mainRegion);
                          }}
                          style={{
                            padding: '6px 14px',
                            background: 'linear-gradient(135deg, var(--accent-primary), var(--accent-secondary))',
                            color: '#fff',
                            border: 'none',
                            borderRadius: '6px',
                            fontSize: '11px',
                            fontWeight: 700,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            boxShadow: '0 2px 8px rgba(139,92,246,0.2)',
                            transition: 'transform 0.15s',
                          }}
                          onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-1px)'; }}
                          onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; }}
                        >
                          📄 Content Limit Reached — Continue on New Page →
                        </button>
                      )}
                    </div>

                    {limitEnabled && (
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          fontSize: '11px',
                          fontWeight: 600,
                          color: pageOverLimit ? '#ef4444' : pageWarning ? '#d97706' : 'var(--text-secondary)',
                          background: 'var(--bg-card)',
                          border: `1px solid var(--border-color)`,
                          padding: '4px 10px',
                          borderRadius: '6px',
                          boxShadow: 'var(--shadow-sm)',
                        }}
                      >
                        <div style={{ width: '28px', height: '3px', background: 'rgba(139,92,246,0.15)', borderRadius: '2px', overflow: 'hidden' }}>
                          <div style={{ width: `${totalPercent}%`, height: '100%', background: pageOverLimit ? '#ef4444' : pageWarning ? '#f59e0b' : 'var(--accent-primary)', transition: 'width 0.3s' }} />
                        </div>
                        {totalCount}/{limitValue} {limitType === 'words' ? 'w' : 'c'}
                      </div>
                    )}
                  </div>
                </div>
              );
            })()
          )
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '60%', opacity: 0.5, color: 'var(--text-secondary)' }}>
            <BookOpen size={48} style={{ marginBottom: '16px' }} />
            <h3>No Page Selected</h3>
            <p style={{ fontSize: '14px' }}>Select a page from the outline sidebar to start writing.</p>
          </div>
        )}
      </div>

      {confirmChange && (
        <ConfirmModal
          isOpen={true}
          title="Change Layout Format?"
          message={`Are you sure you want to change this page layout from ${activePageObj?.category === 'screenplay' ? 'Screenplay' : 'Prose'} to ${confirmChange.cat === 'screenplay' ? 'Screenplay' : 'Prose'}? This changes the editor type, and existing text structure might need manual adjustments.`}
          isDanger={true}
          onConfirm={() => {
            onUpdatePageMeta(confirmChange.cat, confirmChange.val);
            setConfirmChange(null);
          }}
          onCancel={() => setConfirmChange(null)}
        />
      )}
    </div>
  );
};

export default EditorPane;
