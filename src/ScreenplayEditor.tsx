import React, { useState, useEffect, useRef } from 'react';
import { Plus, Trash2, Info } from 'lucide-react';
import type { Character } from './types';
import { audioSynth } from './utils/audioSynth';

export interface ScreenplayBlock {
  id: string;
  type: 'slugline' | 'action' | 'character' | 'dialogue' | 'parenthetical' | 'transition' | 'shot' | 'fade_in' | 'fade_out';
  text: string;
}

interface ScreenplayEditorProps {
  initialValue: string;
  onChange: (val: string) => void;
  onBlur: (val: string) => void;
  onMergeBackward?: () => void;
  pageId?: string;
  focusHint: { target: 'start' | 'end' | 'none'; timestamp: number };
  typewriterSoundEnabled?: boolean;
  paragraphHighlightEnabled?: boolean;
  characters?: Character[];
  smartCap?: boolean;
  smartI?: boolean;
  smartSpace?: boolean;
}

interface AutoResizeTextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  textareaRef: (el: HTMLTextAreaElement | null) => void;
}

const AutoResizeTextarea: React.FC<AutoResizeTextareaProps> = ({ textareaRef, value, onChange, ...props }) => {
  const ref = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    if (ref.current) {
      ref.current.style.height = 'auto';
      ref.current.style.height = `${ref.current.scrollHeight}px`;
    }
  }, [value]);

  return (
    <textarea
      ref={(el) => {
        ref.current = el;
        textareaRef(el);
      }}
      value={value}
      onChange={onChange}
      {...props}
      rows={1}
    />
  );
};

export const ScreenplayEditor: React.FC<ScreenplayEditorProps> = ({
  initialValue,
  onChange,
  onBlur,
  onMergeBackward,
  pageId,
  focusHint,
  typewriterSoundEnabled = false,
  paragraphHighlightEnabled = false,
  characters = [],
  smartCap = true,
  smartI = true,
  smartSpace = true,
}) => {
  const [blocks, setBlocks] = useState<ScreenplayBlock[]>([]);
  const [focusedIndex, setFocusedIndex] = useState<number | null>(null);
  const blockRefs = useRef<(HTMLTextAreaElement | null)[]>([]);

  const lastPageIdRef = useRef(pageId);
  const lastContentRef = useRef(initialValue);

  // Undo/Redo History Stack for Blocks
  const historyRef = useRef<ScreenplayBlock[][]>([]);
  const pointerRef = useRef(-1);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Suggestions Autocomplete State
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [activeSuggestionIndex, setActiveSuggestionIndex] = useState(0);
  const [showSuggestions, setShowSuggestions] = useState(false);

  const updateSuggestions = (type: ScreenplayBlock['type'], text: string) => {
    if (type === 'character') {
      if (!text.trim()) {
        const allNames = characters.map(c => c.name.toUpperCase());
        setSuggestions(allNames.slice(0, 5));
        setShowSuggestions(allNames.length > 0);
        setActiveSuggestionIndex(0);
      } else {
        const query = text.toUpperCase();
        const matches = characters
          .map(c => c.name.toUpperCase())
          .filter(name => name.includes(query) && name !== query);
        setSuggestions(matches.slice(0, 5));
        setShowSuggestions(matches.length > 0);
        setActiveSuggestionIndex(0);
      }
    } else if (type === 'slugline' || type === 'action') {
      const query = text.toUpperCase().trim();
      if (query === 'I' || query === 'IN' || query === 'INT') {
        setSuggestions(['INT.']);
        setShowSuggestions(true);
        setActiveSuggestionIndex(0);
      } else if (query === 'E' || query === 'EX' || query === 'EXT') {
        setSuggestions(['EXT.']);
        setShowSuggestions(true);
        setActiveSuggestionIndex(0);
      } else {
        setSuggestions([]);
        setShowSuggestions(false);
      }
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
    }
  };

  const handleFocusBlock = (index: number) => {
    setFocusedIndex(index);
    const block = blocks[index];
    if (block) {
      updateSuggestions(block.type, block.text);
    }
  };

  const selectSuggestion = (suggestion: string) => {
    if (focusedIndex === null) return;
    const newBlocks = [...blocks];
    const currentBlock = newBlocks[focusedIndex];
    
    let type = currentBlock.type;
    let text = suggestion.toUpperCase();

    if ((type === 'action' || type === 'slugline') && (text === 'INT.' || text === 'EXT.')) {
      type = 'slugline';
    }

    newBlocks[focusedIndex] = { ...currentBlock, type, text };
    setBlocks(newBlocks);
    pushHistory(newBlocks, true);
    updateParent(newBlocks);

    setShowSuggestions(false);
    setSuggestions([]);

    setTimeout(() => {
      blockRefs.current[focusedIndex]?.focus();
    }, 50);
  };

  const pushHistory = (newBlocks: ScreenplayBlock[], forceCheckpoint = false) => {
    const history = historyRef.current;
    const pointer = pointerRef.current;

    const current = history[pointer];
    const isSame = current && current.length === newBlocks.length &&
      current.every((b, i) => b.id === newBlocks[i].id && b.text === newBlocks[i].text && b.type === newBlocks[i].type);
    
    if (isSame) return;

    const sliced = history.slice(0, pointer + 1);

    if (forceCheckpoint) {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
      sliced.push(JSON.parse(JSON.stringify(newBlocks)));
      if (sliced.length > 100) sliced.shift();
      historyRef.current = sliced;
      pointerRef.current = sliced.length - 1;
    } else {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = setTimeout(() => {
        const h = historyRef.current;
        const p = pointerRef.current;
        const s = h.slice(0, p + 1);
        
        const last = s[s.length - 1];
        const same = last && last.length === newBlocks.length &&
          last.every((b, i) => b.id === newBlocks[i].id && b.text === newBlocks[i].text && b.type === newBlocks[i].type);
        
        if (!same) {
          s.push(JSON.parse(JSON.stringify(newBlocks)));
          if (s.length > 100) s.shift();
          historyRef.current = s;
          pointerRef.current = s.length - 1;
        }
      }, 500);
    }
  };

  const handleUndo = () => {
    if (pointerRef.current > 0) {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
      pointerRef.current -= 1;
      const prevBlocks = JSON.parse(JSON.stringify(historyRef.current[pointerRef.current])) as ScreenplayBlock[];
      setBlocks(prevBlocks);
      
      const html = compileBlocksToHtml(prevBlocks);
      lastContentRef.current = html;
      onChange(html);

      const focusIdx = focusedIndex !== null ? Math.min(focusedIndex, prevBlocks.length - 1) : prevBlocks.length - 1;
      setTimeout(() => {
        if (focusIdx >= 0) blockRefs.current[focusIdx]?.focus();
      }, 50);
    }
  };

  const handleRedo = () => {
    if (pointerRef.current < historyRef.current.length - 1) {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
      pointerRef.current += 1;
      const nextBlocks = JSON.parse(JSON.stringify(historyRef.current[pointerRef.current])) as ScreenplayBlock[];
      setBlocks(nextBlocks);
      
      const html = compileBlocksToHtml(nextBlocks);
      lastContentRef.current = html;
      onChange(html);

      const focusIdx = focusedIndex !== null ? Math.min(focusedIndex, nextBlocks.length - 1) : nextBlocks.length - 1;
      setTimeout(() => {
        if (focusIdx >= 0) blockRefs.current[focusIdx]?.focus();
      }, 50);
    }
  };

  const handleWrapperKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    // Undo (Ctrl/Cmd + Z)
    if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
      e.preventDefault();
      handleUndo();
      return;
    }
    // Redo (Ctrl/Cmd + Y or Ctrl/Cmd + Shift + Z)
    if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
      e.preventDefault();
      handleRedo();
      return;
    }
  };

  // Parse HTML string to screenplay blocks on mount / load
  useEffect(() => {
    const isDifferentPage = pageId !== lastPageIdRef.current;
    const isDifferentValue = initialValue !== lastContentRef.current;

    if (isDifferentPage || isDifferentValue || blocks.length === 0) {
      const parsed = parseHtmlToBlocks(initialValue);
      setBlocks(parsed);
      lastContentRef.current = initialValue;

      if (isDifferentPage) {
        lastPageIdRef.current = pageId;
        // Reset history when page changes
        historyRef.current = [JSON.parse(JSON.stringify(parsed))];
        pointerRef.current = 0;
        if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
      }
    }
  }, [initialValue, pageId]);

  useEffect(() => {
    if (!focusHint || focusHint.target === 'none' || blocks.length === 0) return;

    if (focusHint.target === 'start') {
      setTimeout(() => {
        blockRefs.current[0]?.focus();
        if (blockRefs.current[0]) {
          blockRefs.current[0]!.selectionStart = 0;
          blockRefs.current[0]!.selectionEnd = 0;
        }
        setFocusedIndex(0);
      }, 50);
    } else if (focusHint.target === 'end') {
      const lastIdx = blocks.length - 1;
      setTimeout(() => {
        blockRefs.current[lastIdx]?.focus();
        if (blockRefs.current[lastIdx]) {
          const len = blockRefs.current[lastIdx]!.value.length;
          blockRefs.current[lastIdx]!.selectionStart = len;
          blockRefs.current[lastIdx]!.selectionEnd = len;
        }
        setFocusedIndex(lastIdx);
      }, 50);
    }
  }, [focusHint, blocks.length]);

  useEffect(() => {
    const handleGlobalCommand = (e: Event) => {
      const hasFocus = blockRefs.current.some(ref => ref && (document.activeElement === ref || ref.contains(document.activeElement)));
      if (hasFocus) {
        if (e.type === 'editor-undo') {
          handleUndo();
        } else if (e.type === 'editor-redo') {
          handleRedo();
        }
      }
    };

    window.addEventListener('editor-undo', handleGlobalCommand);
    window.addEventListener('editor-redo', handleGlobalCommand);
    return () => {
      window.removeEventListener('editor-undo', handleGlobalCommand);
      window.removeEventListener('editor-redo', handleGlobalCommand);
    };
  }, [focusedIndex, blocks]);

  // Synchronize changes back to parent HTML structure
  const updateParent = (newBlocks: ScreenplayBlock[]) => {
    const html = compileBlocksToHtml(newBlocks);
    lastContentRef.current = html;
    onChange(html);
  };

  // Parsing helper: converts HTML markup back to blocks
  const parseHtmlToBlocks = (html: string): ScreenplayBlock[] => {
    if (!html || html.trim() === '') {
      return [{ id: 'init-1', type: 'action', text: '' }];
    }
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    const nodes = Array.from(doc.body.childNodes);
    const parsedBlocks: ScreenplayBlock[] = [];

    nodes.forEach((node) => {
      if (node.nodeType === Node.ELEMENT_NODE) {
        const el = node as HTMLElement;
        let type: ScreenplayBlock['type'] = 'action';
        
        if (el.classList.contains('sc-slugline')) type = 'slugline';
        else if (el.classList.contains('sc-action')) type = 'action';
        else if (el.classList.contains('sc-character')) type = 'character';
        else if (el.classList.contains('sc-dialogue')) type = 'dialogue';
        else if (el.classList.contains('sc-parenthetical')) type = 'parenthetical';
        else if (el.classList.contains('sc-transition')) type = 'transition';
        else if (el.classList.contains('sc-shot')) type = 'shot';
        else if (el.classList.contains('sc-fade_in') || el.classList.contains('sc-fade-in')) type = 'fade_in';
        else if (el.classList.contains('sc-fade_out') || el.classList.contains('sc-fade-out')) type = 'fade_out';
        
        parsedBlocks.push({
          id: Math.random().toString(36).substring(2, 9),
          type,
          text: el.innerText || el.textContent || '',
        });
      } else if (node.nodeType === Node.TEXT_NODE && node.textContent?.trim()) {
        parsedBlocks.push({
          id: Math.random().toString(36).substring(2, 9),
          type: 'action',
          text: node.textContent.trim(),
        });
      }
    });

    if (parsedBlocks.length === 0) {
      return [{ id: 'init-2', type: 'action', text: '' }];
    }
    return parsedBlocks;
  };

  // Compiler helper: compiles blocks to HTML string
  const compileBlocksToHtml = (blocksList: ScreenplayBlock[]): string => {
    return blocksList
      .map((b) => {
        const className = `sc-${b.type}`;
        const escapedText = b.text
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;');
        return `<p class="${className}">${escapedText || '&nbsp;'}</p>`;
      })
      .join('');
  };

  // Block creation
  const handleAddBlock = (index: number, type: ScreenplayBlock['type'] = 'action', text: string = '') => {
    const newBlocks = [...blocks];
    const newId = Math.random().toString(36).substring(2, 9);
    newBlocks.splice(index + 1, 0, { id: newId, type, text });
    setBlocks(newBlocks);
    pushHistory(newBlocks, true);
    updateParent(newBlocks);
    setTimeout(() => {
      blockRefs.current[index + 1]?.focus();
      setFocusedIndex(index + 1);
    }, 50);
  };

  // Block type changes
  const handleChangeBlockType = (index: number, type: ScreenplayBlock['type']) => {
    const newBlocks = [...blocks];
    let text = newBlocks[index].text;
    if (['slugline', 'character', 'transition', 'fade_in', 'fade_out'].includes(type)) {
      text = text.toUpperCase();
    }
    newBlocks[index] = { ...newBlocks[index], type, text };
    setBlocks(newBlocks);
    pushHistory(newBlocks, true);
    updateParent(newBlocks);
  };

  // Keyboard navigation & smart typing flow
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>, index: number) => {
    const textarea = e.currentTarget;
    const value = textarea.value;
    const selectionStart = textarea.selectionStart;
    const currentBlock = blocks[index];

    // Play typewriter clicks
    if (typewriterSoundEnabled) {
      if (e.key === 'Enter') {
        audioSynth.playKeyClick('enter');
      } else if (e.key === ' ') {
        audioSynth.playKeyClick('space');
      } else if (e.key === 'Backspace') {
        audioSynth.playKeyClick('backspace');
      } else if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
        audioSynth.playKeyClick('click');
      }
    }

    // Intercept keyboard controls if autocomplete menu is visible
    if (showSuggestions && suggestions.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setActiveSuggestionIndex(prev => (prev + 1) % suggestions.length);
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setActiveSuggestionIndex(prev => (prev - 1 + suggestions.length) % suggestions.length);
        return;
      }
      if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault();
        selectSuggestion(suggestions[activeSuggestionIndex]);
        return;
      }
      if (e.key === 'Escape') {
        e.preventDefault();
        setShowSuggestions(false);
        return;
      }
    }

    // ENTER: Intelligent flow insertion
    if (e.key === 'Enter') {
      e.preventDefault();
      let nextType: ScreenplayBlock['type'] = 'action';
      
      if (currentBlock.type === 'character') {
        nextType = 'dialogue';
      } else if (currentBlock.type === 'dialogue') {
        nextType = 'action';
      } else if (currentBlock.type === 'slugline') {
        nextType = 'action';
      } else if (currentBlock.type === 'parenthetical') {
        nextType = 'dialogue';
      } else if (currentBlock.type === 'transition') {
        nextType = 'action';
      } else {
        nextType = currentBlock.type;
      }
      
      const textBefore = value.substring(0, selectionStart);
      const textAfter = value.substring(selectionStart);

      const newBlocks = [...blocks];
      newBlocks[index] = { ...currentBlock, text: textBefore };
      const newId = Math.random().toString(36).substring(2, 9);
      newBlocks.splice(index + 1, 0, { id: newId, type: nextType, text: textAfter });

      setBlocks(newBlocks);
      pushHistory(newBlocks, true);
      updateParent(newBlocks);

      setTimeout(() => {
        blockRefs.current[index + 1]?.focus();
        if (blockRefs.current[index + 1]) {
          blockRefs.current[index + 1]!.selectionStart = 0;
          blockRefs.current[index + 1]!.selectionEnd = 0;
        }
        setFocusedIndex(index + 1);
      }, 50);
      return;
    }

    // TAB: Cycle through screenplay elements
    if (e.key === 'Tab') {
      e.preventDefault();
      const typeCycles: ScreenplayBlock['type'][] = [
        'action',
        'character',
        'parenthetical',
        'dialogue',
        'transition',
        'slugline',
        'shot'
      ];
      let currentIdx = typeCycles.indexOf(currentBlock.type);
      if (currentIdx === -1) currentIdx = 0;
      const nextIdx = (currentIdx + 1) % typeCycles.length;
      handleChangeBlockType(index, typeCycles[nextIdx]);
      return;
    }

    // BACKSPACE: Delete empty block or merge with previous block
    if (e.key === 'Backspace' && selectionStart === 0 && textarea.selectionEnd === 0) {
      if (index === 0) {
        if (onMergeBackward) {
          e.preventDefault();
          onMergeBackward();
        }
        return;
      }
      if (blocks.length <= 1) return;
      e.preventDefault();
      
      const newBlocks = [...blocks];
      const prevBlock = newBlocks[index - 1];
      
      if (prevBlock) {
        const prevLength = prevBlock.text.length;
        newBlocks[index - 1] = {
          ...prevBlock,
          text: prevBlock.text + value,
        };
        newBlocks.splice(index, 1);
        setBlocks(newBlocks);
        pushHistory(newBlocks, true);
        updateParent(newBlocks);

        setTimeout(() => {
          const prevEl = blockRefs.current[index - 1];
          if (prevEl) {
            prevEl.focus();
            prevEl.selectionStart = prevLength;
            prevEl.selectionEnd = prevLength;
          }
          setFocusedIndex(index - 1);
        }, 50);
      } else {
        if (value === '') {
          newBlocks.splice(index, 1);
          setBlocks(newBlocks);
          pushHistory(newBlocks, true);
          updateParent(newBlocks);
          setTimeout(() => {
            blockRefs.current[0]?.focus();
            setFocusedIndex(0);
          }, 50);
        }
      }
      return;
    }

    // ARROWS: Vertical navigation
    if (e.key === 'ArrowUp' && selectionStart === 0) {
      if (index > 0) {
        e.preventDefault();
        blockRefs.current[index - 1]?.focus();
        setFocusedIndex(index - 1);
      }
      return;
    }

    if (e.key === 'ArrowDown' && selectionStart === value.length) {
      if (index < blocks.length - 1) {
        e.preventDefault();
        blockRefs.current[index + 1]?.focus();
        setFocusedIndex(index + 1);
      }
      return;
    }
  };

  const selectTextareaCharactersBeforeCursor = (textarea: HTMLTextAreaElement, length: number): boolean => {
    const start = textarea.selectionStart;
    if (start >= length) {
      textarea.setSelectionRange(start - length, start);
      return true;
    }
    return false;
  };

  const handleBeforeInput = (e: React.FormEvent<HTMLTextAreaElement>, idx: number) => {
    const inputEvent = e.nativeEvent as InputEvent;
    const typedChar = inputEvent.data;
    const textarea = blockRefs.current[idx];
    if (!typedChar || !textarea) return;

    const selectionStart = textarea.selectionStart;
    const textBefore = textarea.value.substring(0, selectionStart);

    // 1. Double Space to Period
    if (smartSpace && typedChar === ' ' && /[a-zA-Z0-9]\s$/.test(textBefore)) {
      e.preventDefault();
      if (selectTextareaCharactersBeforeCursor(textarea, 1)) {
        document.execCommand('insertText', false, '. ');
        handleTextChange(idx, textarea.value);
      }
      return;
    }

    // 2. Standalone 'i' auto-capitalization
    if (smartI && (typedChar === ' ' || /^[.!?]$/.test(typedChar)) && /(?:^|\s)i$/.test(textBefore)) {
      e.preventDefault();
      if (selectTextareaCharactersBeforeCursor(textarea, 1)) {
        document.execCommand('insertText', false, 'I' + typedChar);
        handleTextChange(idx, textarea.value);
      }
      return;
    }

    // 3. Sentence auto-capitalization
    if (smartCap && /^[a-z]$/.test(typedChar)) {
      if (/(?:^|[.!?])\s*$/.test(textBefore)) {
        e.preventDefault();
        document.execCommand('insertText', false, typedChar.toUpperCase());
        handleTextChange(idx, textarea.value);
        return;
      }
    }
  };

  const handleTextChange = (index: number, val: string) => {
    const newBlocks = [...blocks];
    let type = newBlocks[index].type;
    let text = val;

    const upperText = val.toUpperCase();
    if (type === 'action' && (
      upperText.startsWith('INT.') || 
      upperText.startsWith('EXT.') || 
      upperText.startsWith('INT/EXT') ||
      upperText.startsWith('INT ') ||
      upperText.startsWith('EXT ')
    )) {
      type = 'slugline';
      text = upperText;
    } else if (['slugline', 'character', 'transition', 'fade_in', 'fade_out'].includes(type)) {
      text = upperText;
    }

    if (type === 'parenthetical' && text.length > 0) {
      if (!text.startsWith('(')) text = '(' + text;
    }

    newBlocks[index] = { ...newBlocks[index], type, text };
    setBlocks(newBlocks);
    pushHistory(newBlocks);
    updateParent(newBlocks);

    // Update autocomplete suggestions
    updateSuggestions(type, text);
  };

  const deleteBlock = (index: number) => {
    if (blocks.length <= 1) {
      const newBlocks = [{ id: 'init-reset', type: 'action' as const, text: '' }];
      setBlocks(newBlocks);
      pushHistory(newBlocks, true);
      updateParent(newBlocks);
      return;
    }
    const newBlocks = [...blocks];
    newBlocks.splice(index, 1);
    setBlocks(newBlocks);
    pushHistory(newBlocks, true);
    updateParent(newBlocks);
    const nextFocus = Math.max(0, index - 1);
    setTimeout(() => {
      blockRefs.current[nextFocus]?.focus();
      setFocusedIndex(nextFocus);
    }, 50);
  };

  return (
    <div className={`screenplay-editor-wrapper ${paragraphHighlightEnabled ? 'focus-highlight-active' : ''}`} onKeyDown={handleWrapperKeyDown}>
      {/* Screenplay Formatting Quick Bar */}
      <div className="screenplay-toolbar no-print">
        <div className="toolbar-section">
          <span style={{ fontSize: '10.5px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 600 }}>
            Element Type:
          </span>
          <div style={{ display: 'flex', gap: '2px', overflowX: 'auto', paddingBottom: '2px' }}>
            {[
              { type: 'slugline', label: 'Slugline' },
              { type: 'action', label: 'Action' },
              { type: 'character', label: 'Character' },
              { type: 'dialogue', label: 'Dialogue' },
              { type: 'parenthetical', label: 'Parenthetical' },
              { type: 'transition', label: 'Transition' },
              { type: 'shot', label: 'Shot' },
              { type: 'fade_in', label: 'Fade In' },
              { type: 'fade_out', label: 'Fade Out' }
            ].map((item) => (
              <button
                key={item.type}
                type="button"
                className={`btn btn-secondary ${focusedIndex !== null && blocks[focusedIndex]?.type === item.type ? 'btn-primary' : ''}`}
                style={{
                  padding: '4px 8px',
                  fontSize: '11px',
                  borderRadius: '4px',
                  whiteSpace: 'nowrap'
                }}
                disabled={focusedIndex === null}
                onClick={() => focusedIndex !== null && handleChangeBlockType(focusedIndex, item.type as any)}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Screenplay Page Outline Layout Sheet */}
      <div className="screenplay-page-canvas">
        <div className="screenplay-page-margin">
          {blocks.map((block, idx) => {
            let placeholder = 'Write script text...';
            if (block.type === 'slugline') placeholder = 'INT. LOCATION - DAY';
            else if (block.type === 'character') placeholder = 'CHARACTER NAME';
            else if (block.type === 'dialogue') placeholder = 'Dialogue text goes here...';
            else if (block.type === 'parenthetical') placeholder = '(whispering)';
            else if (block.type === 'transition') placeholder = 'CUT TO:';
            else if (block.type === 'fade_in') placeholder = 'FADE IN:';
            else if (block.type === 'fade_out') placeholder = 'FADE OUT.';

            return (
              <div
                key={block.id}
                className={`screenplay-row-container block-${block.type} ${focusedIndex === idx ? 'focused-row' : ''}`}
                style={{ position: 'relative' }}
              >
                <span className="screenplay-row-badge no-print">{block.type}</span>
                
                <div className="screenplay-row-actions no-print">
                  <button
                    className="btn-icon-only"
                    style={{ padding: '2px' }}
                    onClick={() => handleAddBlock(idx, block.type)}
                    title="Insert Block Below"
                  >
                    <Plus size={10} />
                  </button>
                  <button
                    className="btn-icon-only"
                    style={{ padding: '2px' }}
                    onClick={() => deleteBlock(idx)}
                    title="Delete Block"
                  >
                    <Trash2 size={10} />
                  </button>
                </div>

                <AutoResizeTextarea
                  textareaRef={(el: HTMLTextAreaElement | null) => { blockRefs.current[idx] = el; }}
                  value={block.text}
                  onBeforeInput={(e: React.FormEvent<HTMLTextAreaElement>) => handleBeforeInput(e, idx)}
                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => handleTextChange(idx, e.target.value)}
                  onKeyDown={(e: React.KeyboardEvent<HTMLTextAreaElement>) => handleKeyDown(e, idx)}
                  onFocus={() => handleFocusBlock(idx)}
                  onBlur={() => {
                    const html = compileBlocksToHtml(blocks);
                    onBlur(html);
                    // Hide suggestions after a short delay to allow click events to register
                    setTimeout(() => setShowSuggestions(false), 200);
                  }}
                  className={`screenplay-input font-courier sc-${block.type}`}
                  placeholder={placeholder}
                />

                {focusedIndex === idx && showSuggestions && suggestions.length > 0 && (
                  <div className="screenplay-autocomplete-menu no-print">
                    {suggestions.map((s, sIdx) => (
                      <div
                        key={s}
                        className={`screenplay-autocomplete-item ${sIdx === activeSuggestionIndex ? 'active' : ''}`}
                        onMouseDown={(e) => {
                          e.preventDefault(); // Prevents input blur from closing menu before click
                          selectSuggestion(s);
                        }}
                      >
                        <span>{s}</span>
                        <span className="autocomplete-shortcut-badge">Enter</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
      
      <div style={{
        marginTop: '20px',
        padding: '12px',
        borderRadius: '6px',
        background: 'rgba(255,255,255,0.02)',
        border: '1px solid var(--border-color)',
        fontSize: '11px',
        color: 'var(--text-secondary)',
        lineHeight: 1.4,
        display: 'flex',
        alignItems: 'flex-start',
        gap: '6px'
      }} className="no-print">
        <Info size={14} style={{ flexShrink: 0, marginTop: '2px', color: 'var(--accent-secondary)' }} />
        <span>
          <strong>Screenplay Shortcuts:</strong> Press <strong>Tab</strong> on any line to cycle element types. Press <strong>Enter</strong> for smart completions. Type <code>INT.</code> or <code>EXT.</code> to auto-convert to a Scene Slugline. <strong>Undo (Ctrl+Z) / Redo (Ctrl+Y)</strong> are fully supported.
        </span>
      </div>
    </div>
  );
};
