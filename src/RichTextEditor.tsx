import React, { useEffect, useRef } from 'react';

export interface RichTextEditorProps {
  initialValue: string;
  onChange: (val: string) => void;
  onBlur: (val: string) => void;
  placeholder: string;
  style?: React.CSSProperties;
  onMergeBackward?: () => void;
}

const RichTextEditor: React.FC<RichTextEditorProps> = ({
  initialValue,
  onChange,
  onBlur,
  placeholder,
  style,
  onMergeBackward,
}) => {
  const editorRef = useRef<HTMLDivElement>(null);
  const lastContentRef = useRef(initialValue);
  
  // Undo/Redo History Stack
  const historyRef = useRef<string[]>([initialValue || '']);
  const pointerRef = useRef(0);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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
    if (editorRef.current && initialValue !== lastContentRef.current) {
      editorRef.current.innerHTML = initialValue || '';
      lastContentRef.current = initialValue;
      
      // Reset history on page switch
      historyRef.current = [initialValue || ''];
      pointerRef.current = 0;
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
      
      placeCaretAtEnd(editorRef.current);
    }
  }, [initialValue]);

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
