import React, { useState } from 'react';
import { Plus, Settings, Copy, Check } from 'lucide-react';
import { invoke } from './mockInvoke';
import type { BookDetails, Page } from './types';

const detectContentType = (text: string): 'prose' | 'chat' => {
  if (!text) return 'prose';
  const clean = text.trim().toLowerCase();
  
  const chatPhrases = [
    'could you', 'would you', 'can you', 'let me know', 'how about',
    'would you like', 'here are', 'here is', 'i\'d love to', 'i can help',
    'i can craft', 'i hope this', 'feel free to', 'feedback', 'you have in mind',
    'adjust', 'tweak', 'is this what you', 'sure, ', 'of course', 'here\'s a',
    'here\'s some', 'brainstorm', 'suggestions', 'options', 'try these', 'i can write',
    'do you want', 'your story', 'your scene', 'your writing', 'what do you think',
    'can help you', 'let\'s write', 'happy to help', 'would be happy'
  ];
  
  if (chatPhrases.some(phrase => clean.includes(phrase))) {
    return 'chat';
  }

  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
  if (lines.length > 1) {
    let listIndicatorsCount = 0;
    let headerCount = 0;
    lines.forEach(line => {
      if (/^[0-9]+\.\s/.test(line)) listIndicatorsCount++;
      if (/^[-*+]\s/.test(line)) listIndicatorsCount++;
      if (/^#+\s/.test(line)) headerCount++;
      if (line.toLowerCase().startsWith('option') || line.toLowerCase().startsWith('choice') || line.toLowerCase().startsWith('idea') || line.toLowerCase().startsWith('twist')) {
        listIndicatorsCount++;
      }
    });

    if (listIndicatorsCount > 0 || headerCount > 1) {
      return 'chat';
    }
  }
  
  return 'prose';
};

const renderTextWithFormatting = (text: string): React.ReactNode[] => {
  if (!text) return [];
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, idx) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={idx} style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{part.slice(2, -2)}</strong>;
    }
    return part;
  });
};

const MarkdownRenderer: React.FC<{ text: string }> = ({ text }) => {
  if (!text) return null;

  const lines = text.split('\n');
  const blocks: React.ReactNode[] = [];
  
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    
    if (!line.trim()) {
      i++;
      continue;
    }

    // Parse Markdown Table
    if (line.trim().startsWith('|')) {
      const tableLines: string[] = [];
      while (i < lines.length && lines[i].trim().startsWith('|')) {
        tableLines.push(lines[i]);
        i++;
      }

      if (tableLines.length >= 2) {
        const headerRow = tableLines[0];
        
        const parseCols = (rowStr: string) => {
          return rowStr
            .split('|')
            .map(c => c.trim())
            .filter((_, idx, arr) => idx > 0 && idx < arr.length - 1);
        };

        const headers = parseCols(headerRow);
        const bodyRows = tableLines.slice(2).map(row => parseCols(row));

        blocks.push(
          <div key={`table-${i}`} style={{ overflowX: 'auto', margin: '12px 0', border: '1px solid var(--border-color)', borderRadius: '6px', background: 'rgba(255,255,255,0.01)' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', textAlign: 'left' }}>
              <thead>
                <tr style={{ background: 'rgba(255,255,255,0.03)', borderBottom: '1px solid var(--border-color)' }}>
                  {headers.map((h, colIdx) => (
                    <th key={colIdx} style={{ padding: '8px 12px', fontWeight: 600, color: 'var(--text-secondary)' }}>
                      {renderTextWithFormatting(h)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {bodyRows.map((row, rowIdx) => (
                  <tr key={rowIdx} style={{ borderBottom: rowIdx < bodyRows.length - 1 ? '1px solid rgba(255,255,255,0.03)' : 'none' }}>
                    {row.map((cell, cellIdx) => (
                      <td key={cellIdx} style={{ padding: '8px 12px', color: 'var(--text-primary)', verticalAlign: 'top', lineHeight: 1.4 }}>
                        {renderTextWithFormatting(cell || '')}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
        continue;
      }
    }

    // Parse Markdown Headers
    if (line.startsWith('#')) {
      const match = line.match(/^(#{1,6})\s+(.*)$/);
      if (match) {
        const level = match[1].length;
        const headingText = match[2];
        const headingStyle: React.CSSProperties = {
          color: 'var(--text-primary)',
          fontWeight: 600,
          margin: '16px 0 8px 0',
          lineHeight: 1.3
        };

        if (level === 1) {
          blocks.push(<h1 key={`h1-${i}`} style={{ ...headingStyle, fontSize: '18px' }}>{renderTextWithFormatting(headingText)}</h1>);
        } else if (level === 2) {
          blocks.push(<h2 key={`h2-${i}`} style={{ ...headingStyle, fontSize: '15px' }}>{renderTextWithFormatting(headingText)}</h2>);
        } else {
          blocks.push(<h3 key={`h3-${i}`} style={{ ...headingStyle, fontSize: '13.5px' }}>{renderTextWithFormatting(headingText)}</h3>);
        }
        i++;
        continue;
      }
    }

    // Parse Lists
    if (line.trim().startsWith('-') || line.trim().startsWith('*') || /^\d+\.\s/.test(line.trim())) {
      const listItems: { text: string; ordered: boolean; number?: number }[] = [];
      while (i < lines.length && (lines[i].trim().startsWith('-') || lines[i].trim().startsWith('*') || /^\d+\.\s/.test(lines[i].trim()))) {
        const itemLine = lines[i].trim();
        const isOrdered = /^\d+\.\s/.test(itemLine);
        if (isOrdered) {
          const match = itemLine.match(/^(\d+)\.\s+(.*)$/);
          listItems.push({ text: match ? match[2] : itemLine, ordered: true, number: match ? parseInt(match[1]) : 1 });
        } else {
          listItems.push({ text: itemLine.substring(1).trim(), ordered: false });
        }
        i++;
      }

      const listElements = listItems.map((item, idx) => (
        <li key={idx} style={{ marginBottom: '4px', lineHeight: 1.4, color: 'var(--text-primary)', listStyle: 'none' }}>
          {item.ordered && item.number ? `${item.number}. ` : '• '}
          {renderTextWithFormatting(item.text)}
        </li>
      ));

      blocks.push(
        <ul key={`list-${i}`} style={{ paddingLeft: '8px', margin: '8px 0' }}>
          {listElements}
        </ul>
      );
      continue;
    }

    // Normal Paragraph
    blocks.push(
      <p key={`p-${i}`} style={{ margin: '8px 0', lineHeight: 1.5, color: 'var(--text-primary)' }}>
        {renderTextWithFormatting(line)}
      </p>
    );
    i++;
  }

  return <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>{blocks}</div>;
};

interface AiAssistantTabProps {
  activeBookId: string | null;
  activeBookDetails?: BookDetails | null;
  activePageId?: string | null;
  activeRegionKey: string | null;
  selectedText: string;
  selectedTextExists: boolean;
  pageContent: Record<string, string>;
  onReplaceSelection: (newText: string) => void;
  onAppendToActivePage: (newText: string) => void;
  onJumpToPage?: (chapterId: string, pageId: string) => void;
}

interface ChatMessage {
  id: string;
  bookId?: string;
  sender: 'user' | 'ai';
  text: string;
  displayPrompt?: string;
  createdAt: number;
}

export const AiAssistantTab: React.FC<AiAssistantTabProps> = ({
  activeBookId,
  activeBookDetails,
  activePageId,
  activeRegionKey,
  selectedText,
  selectedTextExists,
  pageContent,
  onReplaceSelection,
  onAppendToActivePage,
  onJumpToPage,
}) => {
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [copiedMsgId, setCopiedMsgId] = useState<string | null>(null);
  const [customPrompt, setCustomPrompt] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState('');
  const [apiKeyExpanded, setApiKeyExpanded] = useState(false);
  const [quickActionsExpanded, setQuickActionsExpanded] = useState(false);

  // Smart Page Selector States
  const [insertModalOpen, setInsertModalOpen] = useState(false);
  const [insertText, setInsertText] = useState('');
  const [pageSearchQuery, setPageSearchQuery] = useState('');
  const [navigateAfterInsert, setNavigateAfterInsert] = useState(true);
  const [insertSuccessMsg, setInsertSuccessMsg] = useState('');
  const [showIndividualPages, setShowIndividualPages] = useState<Record<string, boolean>>({});
  const [acceptedBlocks, setAcceptedBlocks] = useState<Record<string, boolean>>({});

  const getPageLabelString = (pg: Page) => {
    if (!activeBookDetails) return 'Page';
    const isBodyOrScreenplay = pg.category === 'body' || !pg.category || pg.category === 'screenplay';
    const bodyPages = activeBookDetails.pages.filter(
      (p) => p.category === 'body' || !p.category || p.category === 'screenplay'
    );
    const displayIndex = isBodyOrScreenplay 
      ? bodyPages.findIndex(p => p.id === pg.id) 
      : activeBookDetails.pages.filter(p => p.category === pg.category).findIndex(p => p.id === pg.id);
    
    const useIdx = displayIndex !== -1 ? displayIndex : 0;

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

  const extractInsertableText = (msgText: string): string => {
    if (!msgText) return '';
    
    // 1. Check if there are markdown code blocks
    const codeBlockRegex = /```(?:[a-zA-Z0-9_-]+)?\n([\s\S]*?)\n```/g;
    const matches = [...msgText.matchAll(codeBlockRegex)];
    
    if (matches.length > 0) {
      return matches.map(m => m[1].trim()).join('\n\n');
    }

    // 2. Check if there's a blockquote segment
    const lines = msgText.split('\n');
    const quoteLines = lines.filter(line => line.trim().startsWith('>'));
    if (quoteLines.length > 0) {
      return quoteLines.map(line => line.trim().substring(1).trim()).join('\n');
    }

    // 3. Strip target page ID lines if any
    const cleanLines = lines.filter(line => {
      const l = line.trim().toLowerCase();
      if (l.startsWith('target page id:')) {
        return false;
      }
      return true;
    });

    return cleanLines.join('\n').trim();
  };

  const convertMarkdownToHtml = (markdown: string): string => {
    if (!markdown) return '';
    let html = markdown;
    
    // Replace markdown headers with bold lines
    html = html.replace(/^### (.*)$/gm, '<strong>$1</strong>');
    html = html.replace(/^## (.*)$/gm, '<strong>$1</strong>');
    html = html.replace(/^# (.*)$/gm, '<strong>$1</strong>');

    // Convert bullet points to bullet characters
    html = html.replace(/^\s*[-*+]\s+(.*)$/gm, '• $1');

    // Convert double bold stars **text** or __text__ to HTML strong tags
    html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    html = html.replace(/__(.*?)__/g, '<strong>$1</strong>');

    // Convert single italic stars *text* or _text_ to HTML em tags
    html = html.replace(/\*(.*?)\*/g, '<em>$1</em>');
    html = html.replace(/_(.*?)_/g, '<em>$1</em>');

    // Convert newlines to breaks to preserve spacing in paragraph tags
    html = html.replace(/\n/g, '<br />');

    return html;
  };

  const cleanAndFormatText = (text: string): string => {
    return convertMarkdownToHtml(extractInsertableText(text));
  };

  const handleInsertIntoPage = async (pageId: string, textToInsert: string) => {
    try {
      const targetPage = activeBookDetails?.pages.find(p => p.id === pageId);
      if (!targetPage) return;

      const cleanedText = cleanAndFormatText(textToInsert);

      if (pageId === activePageId) {
        onAppendToActivePage(cleanedText);
        const label = getPageLabelString(targetPage);
        setInsertSuccessMsg(`Successfully appended text to current page (${label})!`);
        setTimeout(() => setInsertSuccessMsg(''), 4000);
        return;
      }

      const currentContents: Record<string, string> = await invoke('get_page_content', { pageId });
      const regionKey = activeRegionKey || 'main';
      const currentVal = currentContents[regionKey] || '';

      let newVal = currentVal;
      if (newVal.endsWith('</p>')) {
        newVal = newVal.slice(0, -4) + ' ' + cleanedText + '</p>';
      } else if (newVal.trim() === '') {
        newVal = `<p>${cleanedText}</p>`;
      } else {
        newVal = newVal + ' ' + cleanedText;
      }

      await invoke('save_page_content', {
        pageId,
        regionKey,
        content: newVal
      });

      const label = getPageLabelString(targetPage);
      setInsertSuccessMsg(`Successfully added text to page: ${label}!`);
      setTimeout(() => setInsertSuccessMsg(''), 4000);

      if (navigateAfterInsert && onJumpToPage) {
        onJumpToPage(targetPage.chapter_id, targetPage.id);
      }
    } catch (err: any) {
      console.error(err);
      alert(`Failed to insert text: ${err.message || err}`);
    }
  };

  interface DetectedTarget {
    id: string;
    title: string;
    content: string;
    exists: boolean;
    page: Page | null;
  }

  const getDetectedBlocksAndPages = (msgText: string): DetectedTarget[] => {
    if (!activeBookDetails || !msgText) return [];
    
    const targets: DetectedTarget[] = [];
    const addedIds = new Set<string>();

    // 1. Scan for page blocks with Target Page ID
    const regex = /(?:Target\s+)?Page\s+ID:\s*([a-zA-Z0-9_-]+)/gi;
    let match;
    const matches: { id: string; index: number; matchLen: number }[] = [];

    while ((match = regex.exec(msgText)) !== null) {
      matches.push({
        id: match[1].trim(),
        index: match.index,
        matchLen: match[0].length
      });
    }

    if (matches.length > 0) {
      // We have explicit page blocks!
      for (let i = 0; i < matches.length; i++) {
        const current = matches[i];
        const nextIndex = i + 1 < matches.length ? matches[i + 1].index : msgText.length;

        // Extract content between the current match end and next match start
        const contentStart = current.index + current.matchLen;
        let blockContent = msgText.substring(contentStart, nextIndex);

        // Strip trailing separators and concluding/framing text
        if (i === matches.length - 1) {
          const lines = blockContent.split('\n');
          const cleanLines: string[] = [];
          let stop = false;
          for (const line of lines) {
            const l = line.trim().toLowerCase();
            if (
              l.startsWith('• --') || 
              l.startsWith('---') || 
              l.includes('you can insert') || 
              l.includes('happy writing') ||
              l.includes('accept & add')
            ) {
              stop = true;
            }
            if (stop) break;
            cleanLines.push(line);
          }
          blockContent = cleanLines.join('\n');
        } else {
          const separatorIdx = blockContent.search(/(?:\n\s*•\s*--|\n\s*---)/);
          if (separatorIdx !== -1) {
            blockContent = blockContent.substring(0, separatorIdx);
          }
        }

        // Clean blockquotes, asterisks, and whitespace
        blockContent = blockContent
          .split('\n')
          .map(line => {
            let l = line.trim();
            if (l.startsWith('>')) {
              l = l.substring(1).trim();
            }
            return l;
          })
          .join('\n')
          .trim();
          
        // Extract title
        const prefix = msgText.substring(Math.max(0, current.index - 180), current.index);
        const linesBefore = prefix.split('\n').map(l => l.trim()).filter(Boolean);
        let title = '';

        for (let j = linesBefore.length - 1; j >= 0; j--) {
          const line = linesBefore[j];
          if (/page|scene/i.test(line)) {
            const quoteMatch = line.match(/[“"']([^”"']+)[”"']/);
            if (quoteMatch) {
              title = quoteMatch[1].trim();
              break;
            }
            const boldMatch = line.match(/\*\*([^*]+)\*\*/);
            if (boldMatch) {
              title = boldMatch[1].replace(/page\s*\d+\s*–/gi, '').trim();
              break;
            }
            title = line.replace(/^[\s•\*-]+/, '').trim();
            break;
          }
        }

        if (!title) {
          title = `Page ${i + 1}`;
        }

        const existingPage = activeBookDetails.pages.find(p => p.id.toLowerCase() === current.id.toLowerCase());

        targets.push({
          id: current.id,
          title,
          content: blockContent,
          exists: !!existingPage,
          page: existingPage || null
        });
        addedIds.add(current.id.toLowerCase());
      }
    }

    // 2. Fallback: scan for mentions of existing pages
    if (targets.length === 0) {
      const lowercaseText = msgText.toLowerCase();

      // Scan for exact Page ID matches
      for (const pg of activeBookDetails.pages) {
        if (pg.id && pg.id.length >= 4) {
          if (lowercaseText.includes(pg.id.toLowerCase())) {
            const idLower = pg.id.toLowerCase();
            if (!addedIds.has(idLower)) {
              const label = getPageLabelString(pg);
              targets.push({
                id: pg.id,
                title: label,
                content: msgText,
                exists: true,
                page: pg
              });
              addedIds.add(idLower);
            }
          }
        }
      }

      // Scan for specific named page types if mentioned
      for (const pg of activeBookDetails.pages) {
        if (pg.page_type && pg.page_type !== 'standard_prose' && pg.page_type !== 'screenplay_standard') {
          const label = getPageLabelString(pg).toLowerCase();
          if (lowercaseText.includes(label) || lowercaseText.includes(pg.page_type.replace('_', ' '))) {
            const idLower = pg.id.toLowerCase();
            if (!addedIds.has(idLower)) {
              const displayLabel = getPageLabelString(pg);
              targets.push({
                id: pg.id,
                title: displayLabel,
                content: msgText,
                exists: true,
                page: pg
              });
              addedIds.add(idLower);
            }
          }
        }
      }

      // Scan for Chapter Titles or specific "Chapter X" mentions
      activeBookDetails.chapters.forEach((ch, idx) => {
        const chTitle = ch.title.toLowerCase();
        const chNumberStr = `chapter ${idx + 1}`;
        if ((chTitle.length > 3 && lowercaseText.includes(chTitle)) || lowercaseText.includes(chNumberStr)) {
          const chPages = activeBookDetails.pages.filter(p => p.chapter_id === ch.id);
          if (chPages.length > 0) {
            const firstPg = chPages[0];
            const idLower = firstPg.id.toLowerCase();
            if (!addedIds.has(idLower)) {
              const displayLabel = getPageLabelString(firstPg);
              targets.push({
                id: firstPg.id,
                title: displayLabel,
                content: msgText,
                exists: true,
                page: firstPg
              });
              addedIds.add(idLower);
            }
          }
        }
      });
    }

    return targets;
  };

  const handleAcceptAndAddBlock = async (block: DetectedTarget, msgId?: string) => {
    if (!activeBookId) return;
    try {
      setAiLoading(true);
      let targetPageId = block.id;
      let targetChapterId = '';

      if (!block.exists) {
        if (activePageId && activeBookDetails) {
          const activePg = activeBookDetails.pages.find(p => p.id === activePageId);
          if (activePg) targetChapterId = activePg.chapter_id;
        }
        if (!targetChapterId && activeBookDetails && activeBookDetails.chapters.length > 0) {
          targetChapterId = activeBookDetails.chapters[0].id;
        }
        if (!targetChapterId) {
          const newCh: any = await invoke('create_chapter', { bookId: activeBookId, title: 'Chapter 1' });
          targetChapterId = newCh.id;
        }

        const newPage: any = await invoke('create_page', {
          chapterId: targetChapterId,
          templateId: 'standard',
          category: 'body',
          pageType: 'standard_prose',
          id: block.id
        });
        targetPageId = newPage.id;
      } else if (block.page) {
        targetChapterId = block.page.chapter_id;
      }

      let currentMain = '';
      if (block.exists) {
        const currentContent: Record<string, string> = await invoke('get_page_content', { pageId: targetPageId });
        currentMain = currentContent.main || '';
      }

      const targetTemplateId = (block.exists && block.page) ? block.page.template_id : 'standard';
      const hasTitleRegion = ['chapter_start', 'title_page', 'screenplay_title'].includes(targetTemplateId);
      const cleanTitle = block.title ? block.title.replace(/^["'“`'”]+|["'“`'”]+$/g, '').trim() : '';

      if (hasTitleRegion && cleanTitle) {
        await invoke('save_page_content', {
          pageId: targetPageId,
          regionKey: 'title',
          content: cleanTitle
        });
      }

      const blockCleanedText = cleanAndFormatText(block.content);
      const projectType = activeBookDetails?.book.project_type || 'novel';
      const isGenericTitle = !cleanTitle || /^Page\s+\d+$/i.test(cleanTitle);

      let updatedContent = '';
      if (!hasTitleRegion && projectType !== 'screenplay' && !isGenericTitle && (!currentMain.trim() || currentMain === '<p><br></p>')) {
        const titleHtml = `<div class="page-title-block" style="text-align: center; margin-bottom: 24px; padding-bottom: 12px; border-bottom: 1px double var(--border-color);"><h2 style="font-size: 20px; font-weight: bold; margin: 0; color: var(--accent-secondary); letter-spacing: 1px; text-transform: uppercase; font-family: var(--font-display-current);">${cleanTitle}</h2></div>`;
        updatedContent = titleHtml + blockCleanedText;
      } else {
        const separator = currentMain.trim() ? '<p><br></p>' : '';
        updatedContent = currentMain + separator + blockCleanedText;
      }

      await invoke('save_page_content', {
        pageId: targetPageId,
        regionKey: 'main',
        content: updatedContent
      });

      window.dispatchEvent(new CustomEvent('book-writer-db-change', {
        detail: {
          type: 'page-created',
          bookId: activeBookId,
          chapterId: targetChapterId,
          pageId: targetPageId
        }
      }));

      setInsertSuccessMsg(block.exists ? `Successfully updated "${block.title}"!` : `Successfully created and added to "${block.title}"!`);
      setTimeout(() => setInsertSuccessMsg(''), 4000);

      if (msgId) {
        setAcceptedBlocks(prev => ({ ...prev, [`${msgId}_${block.id}`]: true }));
      }
    } catch (err: any) {
      console.error("Failed to accept block:", err);
      alert(`Failed to accept block: ${err.message || err}`);
    } finally {
      setAiLoading(false);
    }
  };

  const handleAcceptAllBlocks = async (blocks: DetectedTarget[], msgId?: string) => {
    if (!activeBookId || blocks.length === 0) return;
    try {
      setAiLoading(true);
      let firstCreatedPageId = '';
      let firstCreatedChapterId = '';

      for (const block of blocks) {
        let targetPageId = block.id;
        let targetChapterId = '';

        if (!block.exists) {
          if (activePageId && activeBookDetails) {
            const activePg = activeBookDetails.pages.find(p => p.id === activePageId);
            if (activePg) targetChapterId = activePg.chapter_id;
          }
          if (!targetChapterId && activeBookDetails && activeBookDetails.chapters.length > 0) {
            targetChapterId = activeBookDetails.chapters[0].id;
          }
          if (!targetChapterId) {
            const newCh: any = await invoke('create_chapter', { bookId: activeBookId, title: 'Chapter 1' });
            targetChapterId = newCh.id;
          }

          const newPage: any = await invoke('create_page', {
            chapterId: targetChapterId,
            templateId: 'standard',
            category: 'body',
            pageType: 'standard_prose',
            id: block.id
          });
          targetPageId = newPage.id;
        } else if (block.page) {
          targetChapterId = block.page.chapter_id;
        }

        if (!firstCreatedPageId) {
          firstCreatedPageId = targetPageId;
          firstCreatedChapterId = targetChapterId;
        }

        let currentMain = '';
        if (block.exists) {
          const currentContent: Record<string, string> = await invoke('get_page_content', { pageId: targetPageId });
          currentMain = currentContent.main || '';
        }

        const targetTemplateId = (block.exists && block.page) ? block.page.template_id : 'standard';
        const hasTitleRegion = ['chapter_start', 'title_page', 'screenplay_title'].includes(targetTemplateId);
        const cleanTitle = block.title ? block.title.replace(/^["'“`'”]+|["'“`'”]+$/g, '').trim() : '';

        if (hasTitleRegion && cleanTitle) {
          await invoke('save_page_content', {
            pageId: targetPageId,
            regionKey: 'title',
            content: cleanTitle
          });
        }

        const blockCleanedText = cleanAndFormatText(block.content);
        const projectType = activeBookDetails?.book.project_type || 'novel';
        const isGenericTitle = !cleanTitle || /^Page\s+\d+$/i.test(cleanTitle);

        let updatedContent = '';
        if (!hasTitleRegion && projectType !== 'screenplay' && !isGenericTitle && (!currentMain.trim() || currentMain === '<p><br></p>')) {
          const titleHtml = `<div class="page-title-block" style="text-align: center; margin-bottom: 24px; padding-bottom: 12px; border-bottom: 1px double var(--border-color);"><h2 style="font-size: 20px; font-weight: bold; margin: 0; color: var(--accent-secondary); letter-spacing: 1px; text-transform: uppercase; font-family: var(--font-display-current);">${cleanTitle}</h2></div>`;
          updatedContent = titleHtml + blockCleanedText;
        } else {
          const separator = currentMain.trim() ? '<p><br></p>' : '';
          updatedContent = currentMain + separator + blockCleanedText;
        }

        await invoke('save_page_content', {
          pageId: targetPageId,
          regionKey: 'main',
          content: updatedContent
        });
      }

      if (firstCreatedPageId) {
        window.dispatchEvent(new CustomEvent('book-writer-db-change', {
          detail: {
            type: 'page-created',
            bookId: activeBookId,
            chapterId: firstCreatedChapterId,
            pageId: firstCreatedPageId
          }
        }));
      }

      setInsertSuccessMsg(`Successfully created/updated all ${blocks.length} pages!`);
      setTimeout(() => setInsertSuccessMsg(''), 4000);

      if (msgId) {
        setAcceptedBlocks(prev => {
          const next = { ...prev, [msgId]: true };
          blocks.forEach(b => {
            next[`${msgId}_${b.id}`] = true;
          });
          return next;
        });
      }
    } catch (err: any) {
      console.error("Failed to accept all blocks:", err);
      alert(`Failed to accept all blocks: ${err.message || err}`);
    } finally {
      setAiLoading(false);
    }
  };

  React.useEffect(() => {
    if (selectedTextExists) {
      setQuickActionsExpanded(true);
    }
  }, [selectedTextExists]);

  const chatEndRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (activeBookId) {
      invoke('get_chat_history', { bookId: activeBookId })
        .then((history) => {
          setChatHistory(history || []);
        })
        .catch((err) => {
          console.error("Failed to load chat history:", err);
          setChatHistory([]);
        });
    } else {
      setChatHistory([]);
    }
  }, [activeBookId]);

  React.useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatHistory, aiLoading]);

  const handleDeleteMessage = (msgId: string) => {
    invoke('delete_chat_message', { id: msgId })
      .then(() => {
        setChatHistory(prev => prev.filter(msg => msg.id !== msgId));
      })
      .catch((err) => {
        console.error("Failed to delete chat message:", err);
      });
  };

  const handleNewChat = () => {
    if (!activeBookId) return;
    invoke('clear_chat_history', { bookId: activeBookId })
      .then(() => {
        setChatHistory([]);
        setAiError('');
        setCustomPrompt('');
      })
      .catch((err) => {
        console.error("Failed to clear chat history:", err);
      });
  };

  const handleCopy = (text: string, msgId: string) => {
    navigator.clipboard.writeText(text);
    setCopiedMsgId(msgId);
    setTimeout(() => setCopiedMsgId(null), 2000);
  };

  const [groqModel, setGroqModel] = useState(() => {
    return localStorage.getItem('groq_model') || 'openai/gpt-oss-120b';
  });
  const [groqKey, setGroqKey] = useState(() => {
    return localStorage.getItem('groq_api_key') || import.meta.env.VITE_GROQ_API_KEY || '';
  });

  const handleSaveGroqKey = (val: string) => {
    setGroqKey(val);
    localStorage.setItem('groq_api_key', val);
  };
  const handleSaveGroqModel = (val: string) => {
    setGroqModel(val);
    localStorage.setItem('groq_model', val);
  };

  const callGroq = async (systemInstruction: string, userContent: string, displayPromptText?: string) => {
    if (aiLoading || !activeBookId) return;

    setAiLoading(true);
    setAiError('');

    try {
      const userMsg: ChatMessage = await invoke('add_chat_message', {
        bookId: activeBookId,
        sender: 'user',
        text: userContent,
        displayPrompt: displayPromptText || userContent
      });

      setChatHistory(prev => [...prev, userMsg]);

      let finalSystemInstruction = systemInstruction;
      if (activeBookDetails) {
        let bookStructureContext = '';
        const chaptersInfo = activeBookDetails.chapters.map((ch, chIdx) => {
          const chPages = activeBookDetails.pages.filter(p => p.chapter_id === ch.id);
          const pagesStr = chPages.map((pg, pgIdx) => {
            const isBodyOrScreenplay = pg.category === 'body' || !pg.category || pg.category === 'screenplay';
            const bodyPages = activeBookDetails.pages.filter(p => p.category === 'body' || !p.category || p.category === 'screenplay');
            const displayIndex = isBodyOrScreenplay ? bodyPages.findIndex(p => p.id === pg.id) : pgIdx;
            const useIdx = displayIndex !== -1 ? displayIndex : pgIdx;
            const pageTitle = pg.page_type ? pg.page_type : `Page ${useIdx + 1}`;
            return `- Page ID: "${pg.id}" (Label: "${pageTitle}")`;
          }).join('\n  ');
          return `Chapter ${chIdx + 1}: "${ch.title}" (ID: "${ch.id}")\n  Pages:\n  ${pagesStr || 'No pages'}`;
        }).join('\n\n');
        
        const frontPagesStr = activeBookDetails.pages.filter(p => p.category === 'front_matter').map((p, idx) => `- Page ID: "${p.id}" (Label: "${p.page_type || `Front Page ${idx+1}`}")`).join('\n');
        const backPagesStr = activeBookDetails.pages.filter(p => p.category === 'back_matter').map((p, idx) => `- Page ID: "${p.id}" (Label: "${p.page_type || `Back Page ${idx+1}`}")`).join('\n');

        bookStructureContext = `\n\nActive Book Pages and Chapters Outline:\nFront Matter Pages:\n${frontPagesStr || 'None'}\n\nManuscript Chapters & Pages:\n${chaptersInfo}\n\nBack Matter Pages:\n${backPagesStr || 'None'}\n\nCurrently active Page ID is "${activePageId}".`;
        
        finalSystemInstruction = `${systemInstruction}${bookStructureContext}\n\nIMPORTANT: When writing recommendations or suggesting adding content to specific pages, ALWAYS state the target Page ID clearly in your response (e.g., "Target Page ID: teitk522j" or "You can insert this into page teitk522j"). This enables the application to automatically display a direct "Accept & Add to [Page Title]" button for the user to insert the text with a single click. Tell the user they can also use the general "Insert into Page..." button in the chat interface to write directly into any specific page, including pages that are not active.`;
      }

      const apiMessages = [
        {
          role: 'system',
          content: finalSystemInstruction
        },
        ...chatHistory.map(msg => ({
          role: msg.sender === 'user' ? 'user' : 'assistant',
          content: msg.text
        })),
        {
          role: 'user',
          content: userContent
        }
      ];

      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${groqKey}`
        },
        body: JSON.stringify({
          model: groqModel,
          messages: apiMessages,
          temperature: 0.7,
          max_tokens: 1500
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error?.message || `HTTP error! Status: ${response.status}`);
      }

      const data = await response.json();
      const output = (data.choices?.[0]?.message?.content || '').trim();

      const aiMsg: ChatMessage = await invoke('add_chat_message', {
        bookId: activeBookId,
        sender: 'ai',
        text: output
      });

      setChatHistory(prev => [...prev, aiMsg]);
    } catch (err: any) {
      console.error(err);
      setAiError(err.message || 'Failed to generate response. Please check your API key and connection.');
    } finally {
      setAiLoading(false);
    }
  };

  const renderQuickActions = () => {
    const isHistoryEmpty = chatHistory.length === 0;
    const isExpanded = isHistoryEmpty || quickActionsExpanded;

    const toggleBtn = !isHistoryEmpty && (
      <button
        type="button"
        className="btn btn-secondary"
        onClick={() => setQuickActionsExpanded(!quickActionsExpanded)}
        style={{
          width: '100%',
          padding: '6px 12px',
          fontSize: '11px',
          fontWeight: 600,
          background: 'rgba(255,255,255,0.03)',
          border: '1px solid var(--border-color)',
          borderRadius: '6px',
          color: 'var(--text-secondary)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          cursor: 'pointer',
          marginBottom: isExpanded ? '10px' : '0'
        }}
      >
        <span>{selectedTextExists ? '⚡ Quick Edit Actions (Selected Text)' : '💡 Creative Actions'}</span>
        <span>{isExpanded ? 'Collapse ▲' : 'Expand ▼'}</span>
      </button>
    );

    const actionsContent = (
      <div>
        {selectedTextExists ? (
          /* Selection Mode AI Features */
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{
              background: 'rgba(255,255,255,0.01)',
              borderLeft: '3px solid var(--accent-primary)',
              padding: '6px 10px',
              fontSize: '11.5px',
              color: 'var(--text-secondary)',
              maxHeight: '60px',
              overflowY: 'auto',
              fontStyle: 'italic'
            }}>
              "{selectedText.length > 150 ? selectedText.substring(0, 150) + '...' : selectedText}"
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
              <button
                type="button"
                className="btn btn-secondary"
                style={{ padding: '6px', fontSize: '11px', borderRadius: '4px' }}
                onClick={() => {
                  callGroq(
                    "You are a professional book editor and ghostwriter. Your task is to rewrite the provided text to improve its flow, vocabulary, and readability. Maintain the core meaning and tone. ONLY return the rewritten text, with no explanations, intro, outro, or conversational notes.",
                    `Improve the following text:\n\n${selectedText}`,
                    "Improve selected text"
                  );
                }}
                disabled={aiLoading}
              >
                Better
              </button>
              <button
                type="button"
                className="btn btn-secondary"
                style={{ padding: '6px', fontSize: '11px', borderRadius: '4px' }}
                onClick={() => {
                  callGroq(
                    "You are a meticulous copyeditor. Correct all spelling, grammar, punctuation, and typographical errors in the provided text. ONLY return the corrected text without any feedback or track-changes markings.",
                    `Fix grammar in this text:\n\n${selectedText}`,
                    "Fix Grammar"
                  );
                }}
                disabled={aiLoading}
              >
                Fix Grammar
              </button>
              <button
                type="button"
                className="btn btn-secondary"
                style={{ padding: '6px', fontSize: '11px', borderRadius: '4px' }}
                onClick={() => {
                  callGroq(
                    "You are a creative novelist. Your task is to expand the provided text by adding vivid sensory details, emotional depth, or descriptive pacing. Keep the original character voice and scene context. ONLY return the expanded text without any preamble or summary.",
                    `Elaborate on this text:\n\n${selectedText}`,
                    "Expand text"
                  );
                }}
                disabled={aiLoading}
              >
                Expand
              </button>
              <button
                type="button"
                className="btn btn-secondary"
                style={{ padding: '6px', fontSize: '11px', borderRadius: '4px' }}
                onClick={() => {
                  callGroq(
                    "You are a professional editor. Your task is to shorten and condense the provided text, removing filler words and repetitive structures while preserving the core narrative details and meaning. ONLY return the condensed text.",
                    `Shorten this text:\n\n${selectedText}`,
                    "Shorten text"
                  );
                }}
                disabled={aiLoading}
              >
                Shorten
              </button>
              <button
                type="button"
                className="btn btn-secondary"
                style={{ padding: '6px', fontSize: '11px', borderRadius: '4px' }}
                onClick={() => {
                  callGroq(
                    "You are a prize-winning novelist. Rewrite the provided text to make it highly atmospheric, literary, and engaging. ONLY return the rewritten text.",
                    `Rewrite this text creatively:\n\n${selectedText}`,
                    "Creative rewrite"
                  );
                }}
                disabled={aiLoading}
              >
                Creative
              </button>
              <button
                type="button"
                className="btn btn-secondary"
                style={{ padding: '6px', fontSize: '11px', borderRadius: '4px' }}
                onClick={() => {
                  callGroq(
                    "Translate the provided English text into natural, expressive Hindi prose. Use Devanagari script. Maintain the emotional tone and meaning. ONLY return the translated text.",
                    `Translate this text to Hindi:\n\n${selectedText}`,
                    "Translate to Hindi"
                  );
                }}
                disabled={aiLoading}
              >
                Hindi
              </button>
            </div>
          </div>
        ) : (
          /* General Mode AI Features */
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
              <button
                type="button"
                className="btn btn-secondary"
                style={{ padding: '8px 6px', fontSize: '11px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '4px', borderRadius: '6px', textAlign: 'center', minHeight: '56px' }}
                disabled={aiLoading || !pageContent[activeRegionKey || 'main']?.trim()}
                onClick={() => {
                  const rawText = pageContent[activeRegionKey || 'main'] || '';
                  const cleanText = rawText.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
                  const context = cleanText.length > 2000 ? cleanText.substring(cleanText.length - 2000) : cleanText;
                  callGroq(
                    "You are a professional novelist. Read the context of the book page provided and continue writing the next paragraph. Match the tone, style, tense, and character voice of the text exactly. ONLY return the new continuation text (about 1-2 paragraphs), do not repeat the input or provide commentaries.",
                    `Continue writing from the end of this text:\n\n${context}`,
                    "Continue Story"
                  );
                }}
              >
                <strong style={{ fontSize: '11px', color: 'var(--text-primary)' }}>Continue Story</strong>
                <span style={{ fontSize: '9px', color: 'var(--text-muted)' }}>Next paragraph</span>
              </button>

              <button
                type="button"
                className="btn btn-secondary"
                style={{ padding: '8px 6px', fontSize: '11px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '4px', borderRadius: '6px', textAlign: 'center', minHeight: '56px' }}
                disabled={aiLoading || !pageContent[activeRegionKey || 'main']?.trim()}
                onClick={() => {
                  const rawText = pageContent[activeRegionKey || 'main'] || '';
                  const cleanText = rawText.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
                  const context = cleanText.length > 2000 ? cleanText.substring(cleanText.length - 2000) : cleanText;
                  callGroq(
                    "You are a creative developmental editor and novelist. Read the scene context and suggest 3 exciting, unexpected plot twists or narrative directions. Keep them concise and tailored to the scene.",
                    `Brainstorm 3 plot twists for this scene:\n\n${context}`,
                    "Plot Twist ideas"
                  );
                }}
              >
                <strong style={{ fontSize: '11px', color: 'var(--text-primary)' }}>Plot Twist</strong>
                <span style={{ fontSize: '9px', color: 'var(--text-muted)' }}>3 twists ideas</span>
              </button>

              <button
                type="button"
                className="btn btn-secondary"
                style={{ padding: '8px 6px', fontSize: '11px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '4px', borderRadius: '6px', textAlign: 'center', minHeight: '56px' }}
                disabled={aiLoading || !pageContent[activeRegionKey || 'main']?.trim()}
                onClick={() => {
                  const rawText = pageContent[activeRegionKey || 'main'] || '';
                  const cleanText = rawText.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
                  const context = cleanText.length > 2000 ? cleanText.substring(cleanText.length - 2000) : cleanText;
                  callGroq(
                    "You are an atmospheric writer. Read the scene context and generate a descriptive paragraph focusing on sensory details (sight, sound, smell, texture, temperature) to immerse the reader in the environment.",
                    `Generate sensory descriptions for this scene environment:\n\n${context}`,
                    "Generate Sensory Details"
                  );
                }}
              >
                <strong style={{ fontSize: '11px', color: 'var(--text-primary)' }}>Sensory Details</strong>
                <span style={{ fontSize: '9px', color: 'var(--text-muted)' }}>Vivid description</span>
              </button>

              <button
                type="button"
                className="btn btn-secondary"
                style={{ padding: '8px 6px', fontSize: '11px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '4px', borderRadius: '6px', textAlign: 'center', minHeight: '56px' }}
                disabled={aiLoading || !pageContent[activeRegionKey || 'main']?.trim()}
                onClick={() => {
                  const rawText = pageContent[activeRegionKey || 'main'] || '';
                  const cleanText = rawText.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
                  const context = cleanText.length > 2000 ? cleanText.substring(cleanText.length - 2000) : cleanText;
                  callGroq(
                    "You are a master of realistic, engaging dialogue. Read the scene context and write a short dialogue snippet between the characters that increases tension or reveals character motivation.",
                    `Write a dialogue interaction starting from this context:\n\n${context}`,
                    "Add Dialogue"
                  );
                }}
              >
                <strong style={{ fontSize: '11px', color: 'var(--text-primary)' }}>Add Dialogue</strong>
                <span style={{ fontSize: '9px', color: 'var(--text-muted)' }}>Char dialogue</span>
              </button>
            </div>
          </div>
        )}
      </div>
    );

    return (
      <div style={{
        background: 'rgba(255,255,255,0.02)',
        border: '1px solid var(--border-color)',
        borderRadius: '8px',
        padding: '10px',
        marginBottom: '10px',
        flexShrink: 0
      }}>
        {toggleBtn}
        {isExpanded && actionsContent}
      </div>
    );
  };

  const renderAiAssistantUpper = () => {
    if (chatHistory.length === 0) {
      return (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '30px 20px',
          background: 'rgba(255,255,255,0.01)',
          border: '1px dashed var(--border-color)',
          borderRadius: '8px',
          color: 'var(--text-secondary)',
          textAlign: 'center',
          gap: '10px',
          flexGrow: 1
        }}>
          <div style={{ fontSize: '24px' }}>✨</div>
          <h4 style={{ fontSize: '13px', fontWeight: 600, margin: 0, color: 'var(--text-primary)' }}>Your Creative Sandbox</h4>
          <p style={{ fontSize: '11px', color: 'var(--text-muted)', margin: 0, lineHeight: 1.4 }}>
            Highlight text in the editor to run quick edit actions, or type in the chat below to brainstorm with AI.
          </p>
        </div>
      );
    }

    // Render the chat history!
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '16px'
      }}>
        {chatHistory.map((msg) => {
          const contentType = detectContentType(msg.text);
          const detectedTargets = getDetectedBlocksAndPages(msg.text);
          if (msg.sender === 'user') {
            return (
              <div
                key={msg.id}
                style={{
                  alignSelf: 'flex-end',
                  maxWidth: '85%',
                  background: 'rgba(255, 255, 255, 0.04)',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  borderRadius: '12px 12px 2px 12px',
                  padding: '10px 12px',
                  fontSize: '12.5px',
                  lineHeight: 1.4,
                  color: 'var(--text-primary)',
                  marginLeft: 'auto',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                  wordBreak: 'break-word',
                  animation: 'fadeInDown 0.15s ease-out'
                }}
              >
                <div style={{ fontSize: '9px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600, marginBottom: '4px', textAlign: 'right' }}>
                  You
                </div>
                {msg.displayPrompt || msg.text}
              </div>
            );
          } else {
            return (
              <div
                key={msg.id}
                style={{
                  alignSelf: 'flex-start',
                  width: '100%',
                  background: 'rgba(255, 255, 255, 0.015)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '12px 12px 12px 2px',
                  padding: '12px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '10px',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                  animation: 'fadeInDown 0.25s ease-out'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <label style={{ fontSize: '9px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600, margin: 0 }}>
                    AI Writer
                  </label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <button
                      type="button"
                      onClick={() => handleCopy(msg.text, msg.id)}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: copiedMsgId === msg.id ? '#34d399' : 'var(--text-muted)',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        padding: '2px',
                        borderRadius: '4px',
                        transition: 'color 0.2s',
                      }}
                      title="Copy to clipboard"
                    >
                      {copiedMsgId === msg.id ? <Check size={11} /> : <Copy size={11} />}
                    </button>
                    <span style={{
                      fontSize: '8.5px',
                      fontWeight: 600,
                      textTransform: 'uppercase',
                      padding: '2px 6px',
                      borderRadius: '3px',
                      background: contentType === 'prose' ? 'rgba(52, 211, 153, 0.1)' : 'rgba(96, 165, 250, 0.1)',
                      color: contentType === 'prose' ? '#34d399' : '#60a5fa',
                      letterSpacing: '0.3px'
                    }}>
                      {contentType === 'prose' ? 'Story Prose' : 'Conversational / Ideas'}
                    </span>
                  </div>
                </div>
                <div style={{
                  fontSize: '12.5px',
                  lineHeight: 1.5,
                  color: 'var(--text-primary)',
                  padding: '2px 0'
                }}>
                  <MarkdownRenderer text={msg.text} />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '4px' }}>
                  {(() => {
                    const isMessageAccepted = detectedTargets.length > 0 && (
                      !!acceptedBlocks[msg.id] || 
                      detectedTargets.every(t => acceptedBlocks[`${msg.id}_${t.id}`])
                    );

                    if (isMessageAccepted) {
                      return (
                        <div style={{ display: 'flex', gap: '6px', width: '100%', alignItems: 'center' }}>
                          <div style={{
                            background: 'rgba(16, 185, 129, 0.08)',
                            border: '1px solid rgba(16, 185, 129, 0.2)',
                            color: '#34d399',
                            padding: '6px 12px',
                            borderRadius: '6px',
                            fontSize: '11.5px',
                            fontWeight: 600,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '6px',
                            flexGrow: 1,
                            animation: 'scaleIn 0.2s ease-out'
                          }}>
                            <Check size={13} /> Accepted & Added to Manuscript
                          </div>
                          <button
                            type="button"
                            className="btn btn-secondary"
                            style={{ padding: '6px 12px', fontSize: '11px', borderRadius: '6px' }}
                            onClick={() => handleDeleteMessage(msg.id)}
                          >
                            Remove
                          </button>
                        </div>
                      );
                    }

                    return (
                      <>
                        {/* Smart page detection section */}
                        {detectedTargets.length > 0 && (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', width: '100%', marginBottom: '4px' }}>
                            {detectedTargets.length > 1 ? (
                              <>
                                {/* Accept & Create/Update All Pages */}
                                {acceptedBlocks[msg.id] ? (
                                  <div
                                    style={{
                                      background: 'rgba(16, 185, 129, 0.08)',
                                      border: '1px solid rgba(16, 185, 129, 0.2)',
                                      color: '#34d399',
                                      padding: '8px 16px',
                                      fontSize: '12px',
                                      borderRadius: '6px',
                                      fontWeight: 700,
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                      gap: '6px',
                                      width: '100%',
                                      boxSizing: 'border-box'
                                    }}
                                  >
                                    <Check size={14} /> Accepted All Pages
                                  </div>
                                ) : (
                                  <button
                                    type="button"
                                    className="btn"
                                    style={{
                                      background: 'linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%)',
                                      color: '#ffffff',
                                      border: 'none',
                                      padding: '8px 16px',
                                      fontSize: '12px',
                                      borderRadius: '6px',
                                      fontWeight: 700,
                                      display: 'flex',
                                      alignItems: 'center',
                                      gap: '6px',
                                      boxShadow: '0 4px 12px rgba(139, 92, 246, 0.4)',
                                      cursor: 'pointer',
                                      width: '100%',
                                      justifyContent: 'center',
                                      transition: 'transform 0.1s, box-shadow 0.1s',
                                      letterSpacing: '0.3px'
                                    }}
                                    onClick={() => handleAcceptAllBlocks(detectedTargets, msg.id)}
                                    onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.015)'}
                                    onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                                  >
                                    Accept & Create/Update All {detectedTargets.length} Pages
                                  </button>
                                )}

                                {/* Toggle to show individual page buttons */}
                                <div style={{ display: 'flex', justifyContent: 'center' }}>
                                  <button
                                    type="button"
                                    onClick={() => setShowIndividualPages(prev => ({ ...prev, [msg.id]: !prev[msg.id] }))}
                                    style={{
                                      background: 'transparent',
                                      border: 'none',
                                      color: 'var(--text-secondary)',
                                      cursor: 'pointer',
                                      fontSize: '11px',
                                      display: 'flex',
                                      alignItems: 'center',
                                      gap: '4px',
                                      padding: '2px 8px',
                                      borderRadius: '4px',
                                      transition: 'color 0.2s'
                                    }}
                                  >
                                    <span>{showIndividualPages[msg.id] ? 'Hide individual pages ▲' : 'Show individual pages ▼'}</span>
                                  </button>
                                </div>

                                {showIndividualPages[msg.id] && (
                                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', width: '100%' }}>
                                    {detectedTargets.map((target) => {
                                      const isTargetAccepted = acceptedBlocks[`${msg.id}_${target.id}`];
                                      if (isTargetAccepted) {
                                        return (
                                          <div
                                            key={target.id}
                                            style={{
                                              background: 'rgba(16, 185, 129, 0.05)',
                                              border: '1px dashed rgba(16, 185, 129, 0.2)',
                                              color: '#34d399',
                                              padding: '7px 12px',
                                              fontSize: '11px',
                                              borderRadius: '4px',
                                              fontWeight: 500,
                                              display: 'flex',
                                              alignItems: 'center',
                                              justifyContent: 'center',
                                              gap: '4px',
                                              width: '100%'
                                            }}
                                          >
                                            <Check size={12} /> Added to "{target.title}"
                                          </div>
                                        );
                                      }
                                      return (
                                        <button
                                          key={target.id}
                                          type="button"
                                          className="btn"
                                          style={{
                                            background: target.exists 
                                              ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)' 
                                              : 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
                                            color: '#ffffff',
                                            border: 'none',
                                            padding: '7px 12px',
                                            fontSize: '11px',
                                            borderRadius: '4px',
                                            fontWeight: 600,
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '6px',
                                            boxShadow: target.exists 
                                              ? '0 2px 8px rgba(16, 185, 129, 0.3)' 
                                              : '0 2px 8px rgba(59, 130, 246, 0.3)',
                                            cursor: 'pointer',
                                            width: '100%',
                                            justifyContent: 'center',
                                            transition: 'transform 0.1s'
                                          }}
                                          onClick={() => handleAcceptAndAddBlock(target, msg.id)}
                                          onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.01)'}
                                          onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                                        >
                                          {target.exists ? `Accept & Add to "${target.title}"` : `Accept & Create "${target.title}"`}
                                        </button>
                                      );
                                    })}
                                  </div>
                                )}
                              </>
                            ) : (
                              /* Exactly 1 target page - just show the single button */
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', width: '100%' }}>
                                {detectedTargets.map((target) => {
                                  const isTargetAccepted = acceptedBlocks[`${msg.id}_${target.id}`];
                                  if (isTargetAccepted) {
                                    return (
                                      <div
                                        key={target.id}
                                        style={{
                                          background: 'rgba(16, 185, 129, 0.05)',
                                          border: '1px dashed rgba(16, 185, 129, 0.2)',
                                          color: '#34d399',
                                          padding: '8px 16px',
                                          fontSize: '12px',
                                          borderRadius: '6px',
                                          fontWeight: 500,
                                          display: 'flex',
                                          alignItems: 'center',
                                          justifyContent: 'center',
                                          gap: '4px',
                                          width: '100%'
                                        }}
                                      >
                                        <Check size={12} /> Added to "{target.title}"
                                      </div>
                                    );
                                  }
                                  return (
                                    <button
                                      key={target.id}
                                      type="button"
                                      className="btn"
                                      style={{
                                        background: target.exists 
                                          ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)' 
                                          : 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
                                        color: '#ffffff',
                                        border: 'none',
                                        padding: '8px 16px',
                                        fontSize: '12px',
                                        borderRadius: '6px',
                                        fontWeight: 700,
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '6px',
                                        boxShadow: target.exists 
                                          ? '0 4px 12px rgba(16, 185, 129, 0.3)' 
                                          : '0 4px 12px rgba(59, 130, 246, 0.3)',
                                        cursor: 'pointer',
                                        width: '100%',
                                        justifyContent: 'center',
                                        transition: 'transform 0.1s'
                                      }}
                                      onClick={() => handleAcceptAndAddBlock(target, msg.id)}
                                      onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.01)'}
                                      onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                                    >
                                      {target.exists ? `Accept & Add to "${target.title}"` : `Accept & Create "${target.title}"`}
                                    </button>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        )}

                        {/* General actions section */}
                        <div style={{ display: 'flex', gap: '6px', width: '100%', flexWrap: 'wrap', marginTop: '4px' }}>
                          {detectedTargets.length > 0 ? (
                            <>
                              <button
                                type="button"
                                className="btn btn-secondary"
                                style={{ flexGrow: 1, padding: '5px', fontSize: '11px', borderRadius: '4px', display: 'flex', alignItems: 'center', gap: '4px', justifyContent: 'center' }}
                                onClick={() => handleCopy(msg.text, msg.id)}
                              >
                                {copiedMsgId === msg.id ? <Check size={11} style={{ color: '#34d399' }} /> : <Copy size={11} />}
                                <span>{copiedMsgId === msg.id ? 'Copied!' : 'Copy'}</span>
                              </button>
                              <button
                                type="button"
                                className="btn btn-secondary"
                                style={{ padding: '5px 12px', fontSize: '11px', borderRadius: '4px' }}
                                onClick={() => handleDeleteMessage(msg.id)}
                              >
                                Remove
                              </button>
                            </>
                          ) : contentType === 'prose' ? (
                            <>
                              <button
                                type="button"
                                className="btn btn-primary"
                                style={{ flexGrow: 1, padding: '5px', fontSize: '11px', borderRadius: '4px' }}
                                onClick={() => {
                                  const cleaned = cleanAndFormatText(msg.text);
                                  if (selectedTextExists) {
                                    onReplaceSelection(cleaned);
                                  } else {
                                    onAppendToActivePage(cleaned);
                                  }
                                }}
                              >
                                {selectedTextExists ? 'Replace Selection' : 'Append to Page'}
                              </button>
                              {activeBookDetails && (
                                <button
                                  type="button"
                                  className="btn btn-secondary"
                                  style={{ padding: '5px 8px', fontSize: '11px', borderRadius: '4px' }}
                                  onClick={() => {
                                    setInsertText(msg.text);
                                    setInsertModalOpen(true);
                                  }}
                                >
                                  Insert into Page...
                                </button>
                              )}
                              <button
                                type="button"
                                className="btn btn-secondary"
                                style={{ padding: '5px 10px', fontSize: '11px', borderRadius: '4px' }}
                                onClick={() => handleDeleteMessage(msg.id)}
                              >
                                Remove
                              </button>
                            </>
                          ) : (
                            <>
                              <button
                                type="button"
                                className={detectedTargets.length > 0 ? "btn btn-secondary" : "btn btn-primary"}
                                style={{
                                  flexGrow: 1,
                                  padding: '5px',
                                  fontSize: '11px',
                                  borderRadius: '4px',
                                  background: detectedTargets.length > 0 ? 'rgba(255,255,255,0.05)' : 'var(--accent-primary)',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '6px',
                                  justifyContent: 'center',
                                  border: detectedTargets.length > 0 ? '1px solid var(--border-color)' : 'none',
                                  color: detectedTargets.length > 0 ? 'var(--text-secondary)' : '#ffffff'
                                }}
                                onClick={() => handleCopy(msg.text, msg.id)}
                              >
                                {copiedMsgId === msg.id ? <Check size={12} style={{ color: '#34d399' }} /> : <Copy size={12} />}
                                {copiedMsgId === msg.id ? 'Copied!' : 'Copy to Clipboard'}
                              </button>
                              {activeBookDetails && (
                                <button
                                  type="button"
                                  className="btn btn-secondary"
                                  style={{ padding: '5px 8px', fontSize: '11px', borderRadius: '4px' }}
                                  onClick={() => {
                                    setInsertText(msg.text);
                                    setInsertModalOpen(true);
                                  }}
                                >
                                  Insert to Page...
                                </button>
                              )}
                              <button
                                type="button"
                                className="btn btn-secondary"
                                style={{
                                  padding: '5px 10px',
                                  fontSize: '11px',
                                  borderRadius: '4px',
                                  border: '1px dashed rgba(255,255,255,0.15)',
                                  background: 'transparent'
                                }}
                                title="This response looks conversational. Append anyway?"
                                onClick={() => {
                                  const cleaned = cleanAndFormatText(msg.text);
                                  if (selectedTextExists) {
                                    onReplaceSelection(cleaned);
                                  } else {
                                    onAppendToActivePage(cleaned);
                                  }
                                }}
                              >
                                Append anyway
                              </button>
                              <button
                                type="button"
                                className="btn btn-secondary"
                                style={{ padding: '5px 10px', fontSize: '11px', borderRadius: '4px' }}
                                onClick={() => handleDeleteMessage(msg.id)}
                              >
                                Remove
                              </button>
                            </>
                          )}
                        </div>
                      </>
                    );
                  })()}
                </div>
              </div>
            );
          }
        })}

        {/* Loading Indicator inside active chat */}
        {aiLoading && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            padding: '12px',
            background: 'rgba(255,255,255,0.01)',
            border: '1px dashed var(--border-color)',
            borderRadius: '6px',
            color: 'var(--text-secondary)',
            fontSize: '12px',
            alignSelf: 'flex-start',
            width: '100%',
            animation: 'fadeInDown 0.15s ease-out'
          }}>
            <div className="spinner-mini" style={{
              width: '12px',
              height: '12px',
              border: '2px solid rgba(255,255,255,0.1)',
              borderTopColor: 'var(--accent-primary)',
              borderRadius: '50%',
              animation: 'spin 0.8s linear infinite'
            }} />
            <span>Groq is thinking...</span>
          </div>
        )}

        {/* Error Output inside active chat */}
        {aiError && (
          <div style={{
            padding: '10px',
            background: 'rgba(239, 68, 68, 0.05)',
            border: '1px solid rgba(239, 68, 68, 0.2)',
            borderRadius: '6px',
            color: '#f87171',
            fontSize: '11.5px',
            lineHeight: 1.4,
            alignSelf: 'flex-start',
            width: '100%'
          }}>
            {aiError}
          </div>
        )}

        {/* Scroll anchor */}
        <div ref={chatEndRef} />
      </div>
    );
  };

  const renderAiAssistantBottom = () => {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {/* API Key Inline Settings (Only shown if toggled) */}
        {apiKeyExpanded && (
          <div style={{
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid var(--border-color)',
            borderRadius: '6px',
            padding: '10px 12px',
            display: 'flex',
            flexDirection: 'column',
            gap: '6px',
            animation: 'fadeInDown 0.2s ease-out',
            marginBottom: '4px'
          }}>
            <label style={{ display: 'block', fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Groq API Key</label>
            <input
              type="password"
              className="input"
              style={{ width: '100%', padding: '8px', fontSize: '13px', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border-color)', borderRadius: '4px', color: 'var(--text-primary)' }}
              value={groqKey}
              onChange={(e) => handleSaveGroqKey(e.target.value)}
              placeholder="Enter Groq API Key..."
            />
          </div>
        )}

        {/* Unified Chat Input Box */}
        <div style={{
          background: 'rgba(255, 255, 255, 0.02)',
          border: '1px solid var(--border-color)',
          borderRadius: '8px',
          padding: '10px 12px',
          display: 'flex',
          flexDirection: 'column',
          gap: '10px'
        }}>
          {/* Text Input */}
          <input
            type="text"
            className="input"
            style={{
              width: '100%',
              background: 'transparent',
              border: 'none',
              padding: '6px 0',
              fontSize: '15px',
              color: 'var(--text-primary)',
              outline: 'none',
              boxShadow: 'none'
            }}
            placeholder={selectedTextExists ? "Instructions (e.g. rewrite in third person...)" : "Ask for character names, plot twists..."}
            value={customPrompt}
            onChange={(e) => setCustomPrompt(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && customPrompt.trim()) {
                const promptVal = customPrompt.trim();
                setCustomPrompt('');
                if (selectedTextExists) {
                  callGroq(
                    "You are a helpful novelist and writing partner. Modify the provided text strictly according to the author's instructions. ONLY return the modified text.",
                    `Modify the text according to this command: ${promptVal}\n\nText:\n${selectedText}`,
                    promptVal
                  );
                } else {
                  const rawPage = pageContent[activeRegionKey || 'main'] || '';
                  const cleanPageText = rawPage.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
                  
                  const systemInstruction = cleanPageText 
                    ? "You are an expert storytelling coach and plot strategist. You are provided with the current page's context. Reference or use this context to help the author write, brainstorm, or refine their story. Keep suggestions helpful, relevant, and concise."
                    : "You are an expert storytelling coach and plot strategist. Help the author brainstorm character ideas, descriptions, names, settings, or narrative twists. Give helpful, concise suggestions.";
                    
                  const userContent = cleanPageText
                    ? `[Story Page Context]:\n"""\n${cleanPageText}\n"""\n\nUser Question/Instruction:\n${promptVal}`
                    : promptVal;
                    
                  callGroq(systemInstruction, userContent, promptVal);
                }
              }
            }}
          />

          {/* Bottom Toolbar row */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderTop: '1px solid rgba(255,255,255,0.04)',
            paddingTop: '8px',
            marginTop: '2px'
          }}>
            {/* Left toolbar items: Model Selector & Settings Gear */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <select
                className="select"
                style={{
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '4px',
                  color: 'var(--text-secondary)',
                  fontSize: '12.5px',
                  padding: '4px 8px',
                  cursor: 'pointer',
                  outline: 'none',
                  maxWidth: '160px'
                }}
                value={groqModel}
                onChange={(e) => handleSaveGroqModel(e.target.value)}
              >
                <option value="openai/gpt-oss-120b">GPT 120B (Best)</option>
                <option value="openai/gpt-oss-20b">GPT 20B (Fast)</option>
                <option value="groq/compound">Groq Comp (Adv)</option>
                <option value="groq/compound-mini">Groq Mini (Speed)</option>
              </select>

              <button
                type="button"
                onClick={() => setApiKeyExpanded(!apiKeyExpanded)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: apiKeyExpanded ? 'var(--accent-primary)' : 'var(--text-muted)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  padding: '4px',
                  borderRadius: '4px',
                  transition: 'background-color 0.2s',
                }}
                title="API Settings"
              >
                <Settings size={14} />
              </button>
            </div>

            {/* Right toolbar item: Ask / Submit button */}
            <button
              type="button"
              className="btn btn-primary"
              style={{
                padding: '5px 14px',
                fontSize: '13px',
                borderRadius: '4px',
                display: 'flex',
                alignItems: 'center',
                gap: '4px'
              }}
              disabled={aiLoading || !customPrompt.trim()}
              onClick={() => {
                const promptVal = customPrompt.trim();
                setCustomPrompt('');
                if (selectedTextExists) {
                  callGroq(
                    "You are a helpful novelist and writing partner. Modify the provided text strictly according to the author's instructions. ONLY return the modified text.",
                    `Modify the text according to this command: ${promptVal}\n\nText:\n${selectedText}`,
                    promptVal
                  );
                } else {
                  const rawPage = pageContent[activeRegionKey || 'main'] || '';
                  const cleanPageText = rawPage.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
                  
                  const systemInstruction = cleanPageText 
                    ? "You are an expert storytelling coach and plot strategist. You are provided with the current page's context. Reference or use this context to help the author write, brainstorm, or refine their story. Keep suggestions helpful, relevant, and concise."
                    : "You are an expert storytelling coach and plot strategist. Help the author brainstorm character ideas, descriptions, names, settings, or narrative twists. Give helpful, concise suggestions.";
                    
                  const userContent = cleanPageText
                    ? `[Story Page Context]:\n"""\n${cleanPageText}\n"""\n\nUser Question/Instruction:\n${promptVal}`
                    : promptVal;
                    
                  callGroq(systemInstruction, userContent, promptVal);
                }
              }}
            >
              {selectedTextExists ? 'Go' : 'Ask'}
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div style={{ 
      display: 'flex', 
      flexDirection: 'column', 
      height: '100%', 
      position: 'relative',
      animation: 'fadeInDown 0.25s ease-out' 
    }}>
      {/* Fixed Header */}
      <div style={{ 
        flexShrink: 0, 
        padding: '16px 20px 12px 20px', 
        borderBottom: '1px solid var(--border-color)', 
        background: 'rgba(0, 0, 0, 0.15)',
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center'
      }}>
        <h3 style={{ fontSize: '15px', fontWeight: 600, margin: 0 }}>AI Writing Assistant</h3>
        <button
          type="button"
          className="btn btn-secondary"
          style={{
            padding: '4px 8px',
            fontSize: '11px',
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            borderRadius: '4px',
            border: '1px solid var(--border-color)',
            background: 'rgba(255,255,255,0.02)',
            cursor: 'pointer'
          }}
          onClick={handleNewChat}
        >
          <Plus size={12} /> New Chat
        </button>
      </div>

      {/* Scrollable chat body */}
      <div style={{ 
        flexGrow: 1, 
        overflowY: 'auto', 
        padding: '16px 20px', 
        display: 'flex', 
        flexDirection: 'column', 
        gap: '12px' 
      }}>
        {renderQuickActions()}
        {renderAiAssistantUpper()}
      </div>

      {/* Fixed bottom typing input area */}
      <div style={{ 
        flexShrink: 0, 
        padding: '12px 20px 20px 20px', 
        borderTop: '1px solid var(--border-color)', 
        background: 'rgba(0, 0, 0, 0.15)',
        display: 'flex',
        flexDirection: 'column',
        gap: '4px'
      }}>
        {renderAiAssistantBottom()}
      </div>

      {/* Smart Page Selector Modal */}
      {insertModalOpen && (
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.65)',
          backdropFilter: 'blur(4px)',
          zIndex: 1000,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '16px',
          animation: 'fadeIn 0.2s ease-out'
        }}>
          <div style={{
            background: 'var(--bg-secondary, #1e1e1e)',
            border: '1px solid var(--border-color, #333)',
            borderRadius: '8px',
            width: '100%',
            maxHeight: '85%',
            display: 'flex',
            flexDirection: 'column',
            boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
            overflow: 'hidden'
          }}>
            {/* Header */}
            <div style={{
              padding: '12px 16px',
              borderBottom: '1px solid var(--border-color, #333)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>Insert Text into Page</span>
              <button 
                type="button" 
                className="btn btn-secondary" 
                style={{ padding: '3px 8px', fontSize: '10px', minHeight: 'auto', height: 'auto' }}
                onClick={() => {
                  setInsertModalOpen(false);
                  setPageSearchQuery('');
                }}
              >
                Cancel
              </button>
            </div>

            {/* Text preview */}
            <div style={{
              padding: '8px 16px',
              background: 'rgba(0, 0, 0, 0.15)',
              borderBottom: '1px solid var(--border-color, #333)',
              fontSize: '11px',
              color: 'var(--text-muted)',
              maxHeight: '55px',
              overflowY: 'auto',
              fontStyle: 'italic'
            }}>
              "{insertText.substring(0, 100)}{insertText.length > 100 ? '...' : ''}"
            </div>

            {/* Option: Navigate to page */}
            <div style={{
              padding: '8px 16px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              borderBottom: '1px solid var(--border-color, #333)',
              background: 'rgba(255, 255, 255, 0.01)'
            }}>
              <input 
                type="checkbox" 
                id="navigateAfterInsert"
                checked={navigateAfterInsert}
                onChange={(e) => setNavigateAfterInsert(e.target.checked)}
                style={{ cursor: 'pointer' }}
              />
              <label htmlFor="navigateAfterInsert" style={{ fontSize: '11px', color: 'var(--text-secondary)', cursor: 'pointer', margin: 0, userSelect: 'none' }}>
                Navigate to target page after inserting
              </label>
            </div>

            {/* Search */}
            <div style={{ padding: '10px 16px' }}>
              <input
                type="text"
                placeholder="Search pages/chapters..."
                value={pageSearchQuery}
                onChange={(e) => setPageSearchQuery(e.target.value)}
                style={{
                  width: '100%',
                  padding: '6px 10px',
                  fontSize: '12px',
                  background: 'rgba(0, 0, 0, 0.2)',
                  border: '1px solid var(--border-color, #333)',
                  borderRadius: '4px',
                  color: 'var(--text-primary)',
                  outline: 'none'
                }}
                autoFocus
              />
            </div>

            {/* Page List */}
            <div style={{
              flexGrow: 1,
              overflowY: 'auto',
              padding: '0 16px 16px 16px',
              display: 'flex',
              flexDirection: 'column',
              gap: '10px'
            }}>
              {activeBookDetails ? (
                (() => {
                  const listItems: { id: string; label: string; chapterTitle?: string; category: string }[] = [];

                  // Front Matter
                  activeBookDetails.pages
                    .filter(p => p.category === 'front_matter')
                    .forEach((p) => {
                      const label = getPageLabelString(p);
                      listItems.push({ id: p.id, label, chapterTitle: 'Front Matter', category: 'front_matter' });
                    });

                  // Body chapters & pages
                  activeBookDetails.chapters.forEach((ch) => {
                    const chPages = activeBookDetails.pages.filter(
                      p => p.chapter_id === ch.id && (p.category === 'body' || !p.category)
                    );
                    chPages.forEach((p) => {
                      const label = getPageLabelString(p);
                      listItems.push({ id: p.id, label, chapterTitle: ch.title, category: 'body' });
                    });
                  });

                  // Back Matter
                  activeBookDetails.pages
                    .filter(p => p.category === 'back_matter')
                    .forEach((p) => {
                      const label = getPageLabelString(p);
                      listItems.push({ id: p.id, label, chapterTitle: 'Back Matter', category: 'back_matter' });
                    });

                  // Screenplay pages
                  activeBookDetails.pages
                    .filter(p => p.category === 'screenplay')
                    .forEach((p) => {
                      const label = getPageLabelString(p);
                      listItems.push({ id: p.id, label, chapterTitle: 'Screenplay Script', category: 'screenplay' });
                    });

                  const filtered = listItems.filter(item => 
                    item.label.toLowerCase().includes(pageSearchQuery.toLowerCase()) || 
                    (item.chapterTitle && item.chapterTitle.toLowerCase().includes(pageSearchQuery.toLowerCase()))
                  );

                  if (filtered.length === 0) {
                    return (
                      <div style={{ fontSize: '11.5px', color: 'var(--text-muted)', textAlign: 'center', padding: '20px 0' }}>
                        No matching pages found
                      </div>
                    );
                  }

                  const grouped: Record<string, typeof filtered> = {};
                  filtered.forEach(item => {
                    const groupKey = item.chapterTitle || 'General';
                    if (!grouped[groupKey]) grouped[groupKey] = [];
                    grouped[groupKey].push(item);
                  });

                  return Object.entries(grouped).map(([chapterName, pages]) => (
                    <div key={chapterName} style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <div style={{
                        fontSize: '9.5px',
                        fontWeight: 600,
                        color: 'var(--accent-primary)',
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px',
                        padding: '2px 4px',
                        borderBottom: '1px solid rgba(255,255,255,0.03)'
                      }}>
                        {chapterName}
                      </div>
                      {pages.map((pg) => {
                        const isActive = pg.id === activePageId;
                        return (
                          <button
                            key={pg.id}
                            type="button"
                            onClick={() => {
                              handleInsertIntoPage(pg.id, insertText);
                              setInsertModalOpen(false);
                              setPageSearchQuery('');
                            }}
                            style={{
                              textAlign: 'left',
                              background: isActive ? 'rgba(168, 85, 247, 0.1)' : 'rgba(255,255,255,0.01)',
                              border: isActive ? '1px solid var(--accent-primary)' : '1px solid var(--border-color)',
                              borderRadius: '4px',
                              padding: '6px 10px',
                              fontSize: '11.5px',
                              color: isActive ? 'var(--accent-secondary)' : 'var(--text-primary)',
                              cursor: 'pointer',
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              transition: 'all 0.15s ease',
                              width: '100%',
                              outline: 'none'
                            }}
                          >
                            <span>{pg.label}</span>
                            {isActive && <span style={{ fontSize: '9px', opacity: 0.8, color: 'var(--accent-primary)', fontWeight: 600 }}>Active</span>}
                          </button>
                        );
                      })}
                    </div>
                  ));
                })()
              ) : (
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', textAlign: 'center', padding: '20px' }}>
                  Loading book outline...
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Success feedback toast */}
      {insertSuccessMsg && (
        <div style={{
          position: 'absolute',
          bottom: '80px',
          left: '20px',
          right: '20px',
          padding: '10px 14px',
          background: 'rgba(16, 185, 129, 0.95)',
          backdropFilter: 'blur(4px)',
          border: '1px solid rgba(16, 185, 129, 0.3)',
          borderRadius: '6px',
          color: '#ffffff',
          fontSize: '12px',
          lineHeight: 1.4,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
          zIndex: 1001,
          animation: 'fadeInUp 0.2s ease-out'
        }}>
          <span style={{ fontWeight: 500 }}>{insertSuccessMsg}</span>
          <button 
            type="button"
            onClick={() => setInsertSuccessMsg('')}
            style={{ background: 'none', border: 'none', color: '#ffffff', cursor: 'pointer', fontSize: '14px', padding: '0 4px' }}
          >
            ✕
          </button>
        </div>
      )}
    </div>
  );
};
