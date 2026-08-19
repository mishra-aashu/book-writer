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

  useEffect(() => {
    if (editorRef.current && initialValue !== lastContentRef.current) {
      editorRef.current.innerHTML = initialValue || '';
      lastContentRef.current = initialValue;
      
      // Auto-focus and place caret at the end of the text on page switch
      const el = editorRef.current;
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
    }
  }, [initialValue]);

  const handleInput = () => {
    if (editorRef.current) {
      const html = editorRef.current.innerHTML;
      lastContentRef.current = html;
      onChange(html);
    }
  };

  const handleBlur = () => {
    if (editorRef.current) {
      const html = editorRef.current.innerHTML;
      lastContentRef.current = html;
      onBlur(html);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
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
