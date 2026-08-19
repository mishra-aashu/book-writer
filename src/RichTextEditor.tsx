import React, { useEffect, useRef } from 'react';

export interface RichTextEditorProps {
  initialValue: string;
  pageId: string;
  focusHint: { target: 'start' | 'end' | 'none'; timestamp: number };
  onChange: (val: string) => void;
  onBlur: (val: string) => void;
  placeholder: string;
  style?: React.CSSProperties;
  onMergeBackward?: () => void;
}

const saveSelection = (containerEl: HTMLElement) => {
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0) return null;
  const range = sel.getRangeAt(0);
  const preSelectionRange = range.cloneRange();
  preSelectionRange.selectNodeContents(containerEl);
  preSelectionRange.setEnd(range.startContainer, range.startOffset);
  const start = preSelectionRange.toString().length;

  return {
    start: start,
    end: start + range.toString().length
  };
};

const restoreSelection = (containerEl: HTMLElement, savedSel: { start: number; end: number } | null) => {
  if (!savedSel) return;
  const sel = window.getSelection();
  if (!sel) return;

  let charIndex = 0;
  const range = document.createRange();
  range.setStart(containerEl, 0);
  range.collapse(true);

  const nodeQueue: Node[] = [containerEl];
  let foundStart = false;
  let foundEnd = false;

  while (nodeQueue.length > 0) {
    const node = nodeQueue.shift()!;
    if (node.nodeType === Node.TEXT_NODE) {
      const nextCharIndex = charIndex + node.textContent!.length;
      if (!foundStart && savedSel.start >= charIndex && savedSel.start <= nextCharIndex) {
        range.setStart(node, savedSel.start - charIndex);
        foundStart = true;
      }
      if (!foundEnd && savedSel.end >= charIndex && savedSel.end <= nextCharIndex) {
        range.setEnd(node, savedSel.end - charIndex);
        foundEnd = true;
      }
      charIndex = nextCharIndex;
    } else {
      let i = node.childNodes.length;
      while (i--) {
        nodeQueue.unshift(node.childNodes[i]);
      }
    }
  }

  if (foundStart) {
    sel.removeAllRanges();
    sel.addRange(range);
  }
};

const isHtmlEquivalent = (html1: string, html2: string): boolean => {
  if (html1 === html2) return true;
  const temp1 = document.createElement('div');
  const temp2 = document.createElement('div');
  temp1.innerHTML = html1 || '';
  temp2.innerHTML = html2 || '';
  return temp1.innerHTML === temp2.innerHTML;
};

const RichTextEditor: React.FC<RichTextEditorProps> = ({
  initialValue,
  pageId,
  focusHint,
  onChange,
  onBlur,
  placeholder,
  style,
  onMergeBackward,
}) => {
  const editorRef = useRef<HTMLDivElement>(null);
  const lastContentRef = useRef(initialValue);
  const lastPageIdRef = useRef(pageId);
  
  // Undo/Redo History Stack
  const historyRef = useRef<string[]>([initialValue || '']);
  const pointerRef = useRef(0);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const placeCaretAtStart = (el: HTMLDivElement) => {
    el.focus();
    if (typeof window.getSelection !== "undefined" && typeof document.createRange !== "undefined") {
      const range = document.createRange();
      range.selectNodeContents(el);
      range.collapse(true);
      const sel = window.getSelection();
      if (sel) {
        sel.removeAllRanges();
        sel.addRange(range);
      }
    }
  };

  const placeCaretAtEnd = (el: HTMLDivElement) => {
    el.focus();
    if (typeof window.getSelection !== "undefined" && typeof document.createRange !== "undefined") {
      const range = document.createRange();
      range.selectNodeContents(el);
      range.collapse(false);
      const sel = window.getSelection();
      if (sel) {
        sel.removeAllRanges();
        sel.addRange(range);
      }
    }
  };

  const pushHistory = (val: string, forceCheckpoint = false) => {
    const history = historyRef.current;
    const pointer = pointerRef.current;

    if (history[pointer] === val) return;

    const newHistory = history.slice(0, pointer + 1);
    
    if (forceCheckpoint) {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
      newHistory.push(val);
      if (newHistory.length > 100) newHistory.shift();
      historyRef.current = newHistory;
      pointerRef.current = newHistory.length - 1;
    } else {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = setTimeout(() => {
        const currentHist = historyRef.current;
        const currentPointer = pointerRef.current;
        const sliced = currentHist.slice(0, currentPointer + 1);
        if (sliced[sliced.length - 1] !== val) {
          sliced.push(val);
          if (sliced.length > 100) sliced.shift();
          historyRef.current = sliced;
          pointerRef.current = sliced.length - 1;
        }
      }, 500);
    }
  };

  useEffect(() => {
    const isDifferentPage = pageId !== lastPageIdRef.current;
    if (editorRef.current) {
      const isFocused = document.activeElement === editorRef.current;
      
      // Determine if we actually need to update the DOM content
      let shouldUpdate = false;
      if (isDifferentPage) {
        shouldUpdate = true;
      } else {
        // If not focused, update if parent state differs from our last tracked content
        if (!isFocused) {
          shouldUpdate = initialValue !== lastContentRef.current;
        } else {
          // If focused, only update if structurally/content-wise different from current DOM state
          shouldUpdate = !isHtmlEquivalent(editorRef.current.innerHTML, initialValue);
        }
      }

      if (shouldUpdate) {
        const savedSel = isFocused ? saveSelection(editorRef.current) : null;

        editorRef.current.innerHTML = initialValue || '';
        lastContentRef.current = initialValue;
        
        if (isDifferentPage) {
          lastPageIdRef.current = pageId;
          // Reset history on page switch
          historyRef.current = [initialValue || ''];
          pointerRef.current = 0;
          if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
        } else if (isFocused && savedSel) {
          restoreSelection(editorRef.current, savedSel);
        }
      }
    }
  }, [initialValue, pageId]);

  useEffect(() => {
    if (!editorRef.current || !focusHint || focusHint.target === 'none') return;

    if (focusHint.target === 'start') {
      placeCaretAtStart(editorRef.current);
    } else if (focusHint.target === 'end') {
      placeCaretAtEnd(editorRef.current);
    }
  }, [focusHint]);

  useEffect(() => {
    const el = editorRef.current;
    if (!el) return;

    const handleFormatted = (e: Event) => {
      const customEvent = e as CustomEvent;
      const html = customEvent.detail.html;
      lastContentRef.current = html;
      pushHistory(html, true);
      onChange(html);
    };

    el.addEventListener('editor-content-formatted', handleFormatted);
    return () => {
      el.removeEventListener('editor-content-formatted', handleFormatted);
    };
  }, [onChange]);

  const performUndo = () => {
    if (pointerRef.current > 0) {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
      pointerRef.current -= 1;
      const val = historyRef.current[pointerRef.current];
      lastContentRef.current = val;
      if (editorRef.current) {
        editorRef.current.innerHTML = val || '';
        placeCaretAtEnd(editorRef.current);
      }
      onChange(val);
    }
  };

  const performRedo = () => {
    if (pointerRef.current < historyRef.current.length - 1) {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
      pointerRef.current += 1;
      const val = historyRef.current[pointerRef.current];
      lastContentRef.current = val;
      if (editorRef.current) {
        editorRef.current.innerHTML = val || '';
        placeCaretAtEnd(editorRef.current);
      }
      onChange(val);
    }
  };

  useEffect(() => {
    const handleGlobalCommand = (e: Event) => {
      if (editorRef.current && (document.activeElement === editorRef.current || editorRef.current.contains(document.activeElement))) {
        if (e.type === 'editor-undo') {
          performUndo();
        } else if (e.type === 'editor-redo') {
          performRedo();
        }
      }
    };

    window.addEventListener('editor-undo', handleGlobalCommand);
    window.addEventListener('editor-redo', handleGlobalCommand);
    return () => {
      window.removeEventListener('editor-undo', handleGlobalCommand);
      window.removeEventListener('editor-redo', handleGlobalCommand);
    };
  }, [onChange]);

  const handleInput = () => {
    if (editorRef.current) {
      const html = editorRef.current.innerHTML;
      lastContentRef.current = html;
      pushHistory(html);
      onChange(html);
    }
  };

  const handleBlur = () => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    if (editorRef.current) {
      const html = editorRef.current.innerHTML;
      lastContentRef.current = html;
      pushHistory(html, true); // save final checkpoint on blur
      onBlur(html);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    // Undo shortcut (Ctrl/Cmd + Z)
    if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
      e.preventDefault();
      performUndo();
      return;
    }

    // Redo shortcut (Ctrl/Cmd + Y or Ctrl/Cmd + Shift + Z)
    if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
      e.preventDefault();
      performRedo();
      return;
    }

    // Checkpoint triggers (Space, Enter, Tab)
    if (e.key === ' ' || e.key === 'Enter' || e.key === 'Tab') {
      if (editorRef.current) {
        pushHistory(editorRef.current.innerHTML, true);
      }
    }

    // Backspace handling for merging regions backward
    if (e.key === 'Backspace') {
      const selection = window.getSelection();
      if (selection && selection.rangeCount > 0) {
        if (!selection.isCollapsed) {
          return;
        }
        const range = selection.getRangeAt(0);
        const preRange = range.cloneRange();
        if (editorRef.current) {
          preRange.selectNodeContents(editorRef.current);
          preRange.setEnd(range.startContainer, range.startOffset);
          const textBeforeCaret = preRange.toString();
          if (textBeforeCaret.length === 0) {
            if (onMergeBackward) {
              e.preventDefault();
              onMergeBackward();
            }
          }
        }
      }
    }
  };

  return (
    <div
      ref={editorRef}
      contentEditable
      className="editor-textarea"
      onInput={handleInput}
      onBlur={handleBlur}
      onKeyDown={handleKeyDown}
      style={{
        outline: 'none',
        minHeight: '60px',
        width: '100%',
        whiteSpace: 'pre-wrap',
        wordBreak: 'break-word',
        ...style,
      }}
      {...({ placeholder } as any)}
    />
  );
};

export default RichTextEditor;
