import React, { useEffect, useRef } from 'react';
import { audioSynth } from './utils/audioSynth';

export interface RichTextEditorProps {
  initialValue: string;
  pageId: string;
  focusHint: { target: 'start' | 'end' | 'none'; timestamp: number };
  onChange: (val: string) => void;
  onBlur: (val: string) => void;
  placeholder: string;
  style?: React.CSSProperties;
  onMergeBackward?: () => void;
  typewriterSoundEnabled?: boolean;
  paragraphHighlightEnabled?: boolean;
  onCreateComment?: (commentId: string, selectedText: string, textOffset: number, textLength: number) => void;
  smartCap?: boolean;
  smartI?: boolean;
  smartSpace?: boolean;
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

const normalizeEditorContent = (el: HTMLDivElement): boolean => {
  let changed = false;
  const childNodes = Array.from(el.childNodes);
  childNodes.forEach(node => {
    if (node.nodeType === Node.TEXT_NODE) {
      const text = node.textContent || '';
      if (text.trim() === '' && text.includes('\n')) {
        node.remove();
        changed = true;
        return;
      }
      if (text.length > 0) {
        const div = document.createElement('div');
        div.textContent = text;
        el.insertBefore(div, node);
        node.remove();
        changed = true;
      }
    }
  });
  return changed;
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
  typewriterSoundEnabled = false,
  paragraphHighlightEnabled = false,
  onCreateComment,
  smartCap = true,
  smartI = true,
  smartSpace = true,
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
      // Determine if we actually need to update the DOM content
      let shouldUpdate = false;
      if (isDifferentPage) {
        shouldUpdate = true;
      } else {
        shouldUpdate = !isHtmlEquivalent(initialValue, lastContentRef.current);
      }

      if (shouldUpdate) {
        const isFocused = document.activeElement === editorRef.current;
        const savedSel = isFocused ? saveSelection(editorRef.current) : null;

        editorRef.current.innerHTML = initialValue || '';
        normalizeEditorContent(editorRef.current);
        lastContentRef.current = editorRef.current.innerHTML;
        
        if (isDifferentPage) {
          lastPageIdRef.current = pageId;
          // Reset history on page switch
          historyRef.current = [editorRef.current.innerHTML];
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

  const updateActiveBlock = () => {
    if (!editorRef.current) return;
    
    // Normalize content (wrap raw text nodes in divs)
    const isFocused = document.activeElement === editorRef.current;
    const savedSel = isFocused ? saveSelection(editorRef.current) : null;
    const changed = normalizeEditorContent(editorRef.current);
    if (changed) {
      if (isFocused && savedSel) {
        restoreSelection(editorRef.current, savedSel);
      }
      const html = editorRef.current.innerHTML;
      lastContentRef.current = html;
      onChange(html);
    }
    
    // Clear active class from all children
    Array.from(editorRef.current.children).forEach(child => {
      child.classList.remove('active-block');
    });

    if (!paragraphHighlightEnabled) return;

    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return;
    
    let node: Node | null = sel.anchorNode;
    
    // If anchorNode is the editor itself, the offset points to the active child node
    if (node === editorRef.current) {
      const offset = sel.anchorOffset;
      if (editorRef.current.childNodes.length > 0) {
        const index = Math.min(offset, editorRef.current.childNodes.length - 1);
        node = editorRef.current.childNodes[index];
      }
    }

    // Traverse upwards until we find a direct child of the editor
    while (node && node.parentNode !== editorRef.current) {
      node = node.parentNode;
    }

    if (node) {
      if (node instanceof HTMLElement) {
        node.classList.add('active-block');
      } else {
        // Fallback for text nodes or comments to mark closest sibling element
        const sibling = (node as any).nextElementSibling || (node as any).previousElementSibling;
        if (sibling && sibling instanceof HTMLElement) {
          sibling.classList.add('active-block');
        } else {
          const firstChild = editorRef.current.firstElementChild;
          if (firstChild && firstChild instanceof HTMLElement) {
            firstChild.classList.add('active-block');
          }
        }
      }
    }
  };

  useEffect(() => {
    if (editorRef.current) {
      if (!paragraphHighlightEnabled) {
        Array.from(editorRef.current.children).forEach(child => {
          child.classList.remove('active-block');
        });
      } else {
        updateActiveBlock();
      }
    }
  }, [paragraphHighlightEnabled]);

  const selectCharactersBeforeCursor = (length: number): boolean => {
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return false;
    const range = sel.getRangeAt(0);
    if (range.startContainer.nodeType === Node.TEXT_NODE) {
      const offset = range.startOffset;
      if (offset >= length) {
        range.setStart(range.startContainer, offset - length);
        sel.removeAllRanges();
        sel.addRange(range);
        return true;
      }
    }
    return false;
  };

  const getTextBeforeCursor = (containerEl: HTMLElement): string => {
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return '';
    const range = sel.getRangeAt(0);
    const preSelectionRange = range.cloneRange();
    preSelectionRange.selectNodeContents(containerEl);
    preSelectionRange.setEnd(range.startContainer, range.startOffset);
    return preSelectionRange.toString();
  };

  const handleBeforeInput = (e: React.FormEvent<HTMLDivElement>) => {
    const inputEvent = e.nativeEvent as InputEvent;
    const typedChar = inputEvent.data;
    if (!typedChar || !editorRef.current) return;

    const textBefore = getTextBeforeCursor(editorRef.current);

    // 1. Double Space to Period
    if (smartSpace && typedChar === ' ' && /[a-zA-Z0-9]\s$/.test(textBefore)) {
      e.preventDefault();
      if (selectCharactersBeforeCursor(1)) {
        document.execCommand('insertText', false, '. ');
        handleInput();
      }
      return;
    }

    // 2. Standalone 'i' auto-capitalization
    if (smartI && (typedChar === ' ' || /^[.!?]$/.test(typedChar)) && /(?:^|\s)i$/.test(textBefore)) {
      e.preventDefault();
      if (selectCharactersBeforeCursor(1)) {
        document.execCommand('insertText', false, 'I' + typedChar);
        handleInput();
      }
      return;
    }

    // 3. Sentence auto-capitalization
    if (smartCap && /^[a-z]$/.test(typedChar)) {
      if (/(?:^|[.!?])\s*$/.test(textBefore)) {
        e.preventDefault();
        document.execCommand('insertText', false, typedChar.toUpperCase());
        handleInput();
        return;
      }
    }

    // 4. Markdown shortcuts on Space key
    if (typedChar === ' ') {
      const selection = window.getSelection();
      if (selection && selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        if (range.startContainer.nodeType === Node.TEXT_NODE) {
          const text = range.startContainer.textContent || '';
          const offset = range.startOffset;
          // Check if cursor is right after the character(s) at start of node
          if (offset === 1 && text.startsWith('>')) {
            e.preventDefault();
            if (selectCharactersBeforeCursor(1)) {
              document.execCommand('delete', false);
              document.execCommand('formatBlock', false, 'blockquote');
              handleInput();
            }
            return;
          }
          if (offset === 1 && (text.startsWith('-') || text.startsWith('*'))) {
            e.preventDefault();
            if (selectCharactersBeforeCursor(1)) {
              document.execCommand('delete', false);
              document.execCommand('insertUnorderedList', false);
              handleInput();
            }
            return;
          }
          if (offset === 2 && text.startsWith('1.')) {
            e.preventDefault();
            if (selectCharactersBeforeCursor(2)) {
              document.execCommand('delete', false);
              document.execCommand('insertOrderedList', false);
              handleInput();
            }
            return;
          }
        }
      }
    }
  };

  const handleInput = () => {
    if (editorRef.current) {
      const html = editorRef.current.innerHTML;
      lastContentRef.current = html;
      pushHistory(html);
      onChange(html);
      if (paragraphHighlightEnabled) {
        setTimeout(updateActiveBlock, 0);
      }
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

    // Inline comment shortcut (Ctrl + Alt + M)
    if (e.ctrlKey && e.altKey && e.key.toLowerCase() === 'm') {
      e.preventDefault();
      const selection = window.getSelection();
      if (selection && selection.rangeCount > 0 && !selection.isCollapsed) {
        const selectedText = selection.toString();
        const savedSel = saveSelection(editorRef.current!);
        if (savedSel && onCreateComment) {
          const commentId = 'note-' + Math.random().toString(36).substring(2, 9);
          // Insert the highlight tag
          document.execCommand('insertHTML', false, `<mark class="review-highlight" data-comment-id="${commentId}">${selectedText}</mark>`);
          // Trigger input update
          handleInput();
          // Call callback
          onCreateComment(commentId, selectedText, savedSel.start, savedSel.end - savedSel.start);
        }
      }
      return;
    }

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
      className={`editor-textarea ${paragraphHighlightEnabled ? 'focus-highlight-active' : ''}`}
      onBeforeInput={handleBeforeInput}
      onInput={handleInput}
      onBlur={handleBlur}
      onKeyDown={handleKeyDown}
      onKeyUp={updateActiveBlock}
      onMouseUp={updateActiveBlock}
      onFocus={updateActiveBlock}
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
