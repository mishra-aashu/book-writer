import React, { useState, useEffect, useRef } from 'react';
import { Plus, Trash2, Info } from 'lucide-react';

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
}) => {
  const [blocks, setBlocks] = useState<ScreenplayBlock[]>([]);
  const [focusedIndex, setFocusedIndex] = useState<number | null>(null);
  const blockRefs = useRef<(HTMLTextAreaElement | null)[]>([]);

  const lastBlockIdsRef = useRef<string[]>([]);

  // Parse HTML string to screenplay blocks on mount / load
  useEffect(() => {
    const parsed = parseHtmlToBlocks(initialValue);
    setBlocks(parsed);

    const newIds = parsed.map(b => b.id);
    const isDifferentPage = newIds.length !== lastBlockIdsRef.current.length || 
      newIds.some((id, idx) => id !== lastBlockIdsRef.current[idx]);
      
    lastBlockIdsRef.current = newIds;

    if (isDifferentPage && parsed.length > 0) {
      const lastIdx = parsed.length - 1;
      setTimeout(() => {
        blockRefs.current[lastIdx]?.focus();
        setFocusedIndex(lastIdx);
      }, 100);
    }
  }, [initialValue]);

  // Synchronize changes back to parent HTML structure
  const updateParent = (newBlocks: ScreenplayBlock[]) => {
    const html = compileBlocksToHtml(newBlocks);
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
    updateParent(newBlocks);
  };

  // Keyboard navigation & smart typing flow
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>, index: number) => {
    const textarea = e.currentTarget;
    const value = textarea.value;
    const selectionStart = textarea.selectionStart;
    const currentBlock = blocks[index];

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
      
      // If we hit enter at the middle of the text, split it!
      const textBefore = value.substring(0, selectionStart);
      const textAfter = value.substring(selectionStart);

      const newBlocks = [...blocks];
      newBlocks[index] = { ...currentBlock, text: textBefore };
      const newId = Math.random().toString(36).substring(2, 9);
      newBlocks.splice(index + 1, 0, { id: newId, type: nextType, text: textAfter });

      setBlocks(newBlocks);
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
        'slugline',
        'character',
        'parenthetical',
        'dialogue',
        'transition',
        'shot'
      ];
      const currentIdx = typeCycles.indexOf(currentBlock.type);
      const nextIdx = (currentIdx + 1) % typeCycles.length;
      handleChangeBlockType(index, typeCycles[nextIdx]);
      return;
    }

    // BACKSPACE: Delete empty block or merge with previous block
    if (e.key === 'Backspace' && selectionStart === 0) {
      if (index === 0) {
        if (onMergeBackward) {
          e.preventDefault();
          onMergeBackward();
        }
        return;
      }
      if (blocks.length <= 1) return; // Keep at least one block
      e.preventDefault();
      
      const newBlocks = [...blocks];
      const prevBlock = newBlocks[index - 1];
      
      if (prevBlock) {
        const prevLength = prevBlock.text.length;
        // Merge texts
        newBlocks[index - 1] = {
          ...prevBlock,
          text: prevBlock.text + value,
        };
        newBlocks.splice(index, 1);
        setBlocks(newBlocks);
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
        // Just delete if first block and empty
        if (value === '') {
          newBlocks.splice(index, 1);
          setBlocks(newBlocks);
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

  // Handle typing adjustments (auto-uppercase and slugline auto-format INT/EXT)
  const handleTextChange = (index: number, val: string) => {
    const newBlocks = [...blocks];
    let type = newBlocks[index].type;
    let text = val;

    // Check slugline detection
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

    // Auto brackets for parenthetical
    if (type === 'parenthetical' && text.length > 0) {
      if (!text.startsWith('(')) text = '(' + text;
      if (text.length > 1 && !text.endsWith(')') && !text.includes('\n')) {
        // If typing, we can let them close it, or auto-append
      }
    }

    newBlocks[index] = { ...newBlocks[index], type, text };
    setBlocks(newBlocks);
    updateParent(newBlocks);
  };

  const deleteBlock = (index: number) => {
    if (blocks.length <= 1) {
      const newBlocks = [{ id: 'init-reset', type: 'action' as const, text: '' }];
      setBlocks(newBlocks);
      updateParent(newBlocks);
      return;
    }
    const newBlocks = [...blocks];
    newBlocks.splice(index, 1);
    setBlocks(newBlocks);
    updateParent(newBlocks);
    const nextFocus = Math.max(0, index - 1);
    setTimeout(() => {
      blockRefs.current[nextFocus]?.focus();
      setFocusedIndex(nextFocus);
    }, 50);
  };

  return (
    <div className="screenplay-editor-wrapper">
      {/* Screenplay Formatting Quick Bar */}
      <div className="screenplay-toolbar no-print">
        <div className="toolbar-section">
          <span style={{ fontSize: '10.5px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 600 }}>
            Element Type:
          </span>
          <div style={{ display: 'flex', gap: '2px', overflowX: 'auto', paddingBottom: '2px' }}>
            {[
              { type: 'slugline', label: 'Slugline', shortcut: 'INT/EXT' },
              { type: 'action', label: 'Action', shortcut: 'Desc' },
              { type: 'character', label: 'Character', shortcut: 'Cue' },
              { type: 'dialogue', label: 'Dialogue', shortcut: 'Text' },
              { type: 'parenthetical', label: 'Parenthetical', shortcut: 'Dir' },
              { type: 'transition', label: 'Transition', shortcut: 'Cut To' },
              { type: 'shot', label: 'Shot', shortcut: 'Montage' },
              { type: 'fade_in', label: 'Fade In', shortcut: 'Start' },
              { type: 'fade_out', label: 'Fade Out', shortcut: 'End' }
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
              >
                {/* Element Badge Info */}
                <span className="screenplay-row-badge no-print">{block.type}</span>
                
                {/* Action button menu */}
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
                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => handleTextChange(idx, e.target.value)}
                  onKeyDown={(e: React.KeyboardEvent<HTMLTextAreaElement>) => handleKeyDown(e, idx)}
                  onFocus={() => setFocusedIndex(idx)}
                  onBlur={() => {
                    const html = compileBlocksToHtml(blocks);
                    onBlur(html);
                  }}
                  className={`screenplay-input font-courier sc-${block.type}`}
                  placeholder={placeholder}
                  style={{}}
                />
              </div>
            );
          })}
        </div>
      </div>
      
      {/* Help Tips */}
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
          <strong>Screenplay Shortcuts:</strong> Press <strong>Tab</strong> on any line to cycle element types (Slugline ➜ Action ➜ Character ➜ Parenthetical ➜ Dialogue ➜ Transition). Press <strong>Enter</strong> to create new smart-completions (e.g. hitting Enter on a Character Cue creates a Dialogue block). Type <code>INT.</code> or <code>EXT.</code> to auto-convert to a Scene Slugline.
        </span>
      </div>
    </div>
  );
};
