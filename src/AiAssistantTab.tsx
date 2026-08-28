import React, { useState } from 'react';
import { Plus, Settings, Copy, Check } from 'lucide-react';

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
  activeRegionKey: string | null;
  selectedText: string;
  selectedTextExists: boolean;
  pageContent: Record<string, string>;
  onReplaceSelection: (newText: string) => void;
  onAppendToActivePage: (newText: string) => void;
}

export const AiAssistantTab: React.FC<AiAssistantTabProps> = ({
  activeRegionKey,
  selectedText,
  selectedTextExists,
  pageContent,
  onReplaceSelection,
  onAppendToActivePage,
}) => {
  const [customPrompt, setCustomPrompt] = useState('');
  const [submittedPrompt, setSubmittedPrompt] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiResult, setAiResult] = useState('');
  const [aiError, setAiError] = useState('');
  const [apiKeyExpanded, setApiKeyExpanded] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
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

  const callGroq = async (systemInstruction: string, userContent: string) => {
    setAiLoading(true);
    setAiResult('');
    setAiError('');
    try {
      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${groqKey}`
        },
        body: JSON.stringify({
          model: groqModel,
          messages: [
            {
              role: 'system',
              content: systemInstruction
            },
            {
              role: 'user',
              content: userContent
            }
          ],
          temperature: 0.7,
          max_tokens: 1500
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error?.message || `HTTP error! Status: ${response.status}`);
      }

      const data = await response.json();
      const output = data.choices?.[0]?.message?.content || '';
      setAiResult(output.trim());
    } catch (err: any) {
      console.error(err);
      setAiError(err.message || 'Failed to generate response. Please check your API key and connection.');
    } finally {
      setAiLoading(false);
    }
  };

  const renderAiAssistantUpper = () => {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '12px'
      }}>

        {selectedTextExists ? (
          /* Selection Mode AI Features */
          !aiResult ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {/* Selected Text Preview Box (Truncated) */}
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

              {/* Quick Actions Grid */}
              <div>
                <label style={{ display: 'block', fontSize: '9px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600, marginBottom: '6px' }}>Quick Actions</label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    style={{ padding: '6px', fontSize: '11px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px', borderRadius: '4px' }}
                    onClick={() => {
                      setSubmittedPrompt("Improve Writing");
                      callGroq(
                        "You are a professional book editor and ghostwriter. Your task is to rewrite the provided text to improve its flow, vocabulary, and readability. Maintain the core meaning and tone. ONLY return the rewritten text, with no explanations, intro, outro, or conversational notes.",
                        `Improve the following text:\n\n${selectedText}`
                      );
                    }}
                    disabled={aiLoading}
                  >
                    Better
                  </button>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    style={{ padding: '6px', fontSize: '11px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px', borderRadius: '4px' }}
                    onClick={() => {
                      setSubmittedPrompt("Fix Grammar");
                      callGroq(
                        "You are a meticulous copyeditor. Correct all spelling, grammar, punctuation, and typographical errors in the provided text. ONLY return the corrected text without any feedback or track-changes markings.",
                        `Fix grammar in this text:\n\n${selectedText}`
                      );
                    }}
                    disabled={aiLoading}
                  >
                    Fix Grammar
                  </button>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    style={{ padding: '6px', fontSize: '11px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px', borderRadius: '4px' }}
                    onClick={() => {
                      setSubmittedPrompt("Expand Text");
                      callGroq(
                        "You are a creative novelist. Your task is to expand the provided text by adding vivid sensory details, emotional depth, or descriptive pacing. Keep the original character voice and scene context. ONLY return the expanded text without any preamble or summary.",
                        `Elaborate on this text:\n\n${selectedText}`
                      );
                    }}
                    disabled={aiLoading}
                  >
                    Expand
                  </button>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    style={{ padding: '6px', fontSize: '11px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px', borderRadius: '4px' }}
                    onClick={() => {
                      setSubmittedPrompt("Shorten Text");
                      callGroq(
                        "You are a professional editor. Your task is to shorten and condense the provided text, removing filler words and repetitive structures while preserving the core narrative details and meaning. ONLY return the condensed text.",
                        `Shorten this text:\n\n${selectedText}`
                      );
                    }}
                    disabled={aiLoading}
                  >
                    Shorten
                  </button>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    style={{ padding: '6px', fontSize: '11px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px', borderRadius: '4px' }}
                    onClick={() => {
                      setSubmittedPrompt("Creative Rewrite");
                      callGroq(
                        "You are a prize-winning novelist. Rewrite the provided text to make it highly atmospheric, literary, and engaging. ONLY return the rewritten text.",
                        `Rewrite this text creatively:\n\n${selectedText}`
                      );
                    }}
                    disabled={aiLoading}
                  >
                    Creative
                  </button>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    style={{ padding: '6px', fontSize: '11px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px', borderRadius: '4px' }}
                    onClick={() => {
                      setSubmittedPrompt("Translate to Hindi");
                      callGroq(
                        "Translate the provided English text into natural, expressive Hindi prose. Use Devanagari script. Maintain the emotional tone and meaning. ONLY return the translated text.",
                        `Translate this text to Hindi:\n\n${selectedText}`
                      );
                    }}
                    disabled={aiLoading}
                  >
                    Hindi
                  </button>
                </div>
              </div>
            </div>
          ) : null
        ) : (
          /* General Mode AI Features */
          !aiResult ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '9px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600, marginBottom: '4px' }}>Creative Assist</label>
                <p style={{ fontSize: '11.5px', color: 'var(--text-secondary)', margin: '0 0 10px 0', lineHeight: 1.4 }}>
                  Generate or expand your story based on the current page context.
                </p>
              </div>

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
                    setSubmittedPrompt("Continue Story");
                    callGroq(
                      "You are a professional novelist. Read the context of the book page provided and continue writing the next paragraph. Match the tone, style, tense, and character voice of the text exactly. ONLY return the new continuation text (about 1-2 paragraphs), do not repeat the input or provide commentaries.",
                      `Continue writing from the end of this text:\n\n${context}`
                    );
                  }}
                  title="Matches style and writes the next paragraph"
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
                    setSubmittedPrompt("Plot Twist");
                    callGroq(
                      "You are a creative developmental editor and novelist. Read the scene context and suggest 3 exciting, unexpected plot twists or narrative directions. Keep them concise and tailored to the scene.",
                      `Brainstorm 3 plot twists for this scene:\n\n${context}`
                    );
                  }}
                  title="Get ideas for unexpected events"
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
                    setSubmittedPrompt("Sensory Details");
                    callGroq(
                      "You are an atmospheric writer. Read the scene context and generate a descriptive paragraph focusing on sensory details (sight, sound, smell, texture, temperature) to immerse the reader in the environment.",
                      `Generate sensory descriptions for this scene environment:\n\n${context}`
                    );
                  }}
                  title="Add rich descriptions to the setting"
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
                    setSubmittedPrompt("Add Dialogue");
                    callGroq(
                      "You are a master of realistic, engaging dialogue. Read the scene context and write a short dialogue snippet between the characters that increases tension or reveals character motivation.",
                      `Write a dialogue interaction starting from this context:\n\n${context}`
                    );
                  }}
                  title="Draft dialogue between characters"
                >
                  <strong style={{ fontSize: '11px', color: 'var(--text-primary)' }}>Add Dialogue</strong>
                  <span style={{ fontSize: '9px', color: 'var(--text-muted)' }}>Char dialogue</span>
                </button>
              </div>
            </div>
          ) : null
        )}

        {/* User's Sent Message Bubble */}
        {submittedPrompt && (
          <div style={{
            alignSelf: 'flex-end',
            maxWidth: '90%',
            background: 'rgba(255, 255, 255, 0.04)',
            border: '1px solid rgba(255, 255, 255, 0.06)',
            borderRadius: '10px 10px 0 10px',
            padding: '8px 12px',
            fontSize: '12.5px',
            lineHeight: 1.4,
            color: 'var(--text-primary)',
            marginLeft: 'auto',
            marginBottom: '4px',
            wordBreak: 'break-word',
            animation: 'fadeInDown 0.15s ease-out'
          }}>
            <div style={{ fontSize: '9px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600, marginBottom: '4px', textAlign: 'right' }}>You</div>
            {submittedPrompt}
          </div>
        )}

        {/* Loading Indicator */}
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
            fontSize: '12px'
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

        {/* Error Output */}
        {aiError && (
          <div style={{
            padding: '10px',
            background: 'rgba(239, 68, 68, 0.05)',
            border: '1px solid rgba(239, 68, 68, 0.2)',
            borderRadius: '6px',
            color: '#f87171',
            fontSize: '11.5px',
            lineHeight: 1.4
          }}>
            {aiError}
          </div>
        )}

        {/* AI Output / Result Pane */}
        {aiResult && (() => {
          const contentType = detectContentType(aiResult);
          return (
            <div style={{
              background: 'rgba(255, 255, 255, 0.02)',
              border: '1px solid var(--border-color)',
              borderRadius: '6px',
              padding: '12px',
              display: 'flex',
              flexDirection: 'column',
              gap: '10px',
              animation: 'fadeInDown 0.25s ease-out'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <label style={{ fontSize: '9px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600, margin: 0 }}>
                  AI Suggestion Preview
                </label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <button
                    type="button"
                    onClick={() => handleCopy(aiResult)}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: copied ? '#34d399' : 'var(--text-muted)',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      padding: '2px',
                      borderRadius: '4px',
                      transition: 'color 0.2s',
                    }}
                    title="Copy to clipboard"
                  >
                    {copied ? <Check size={11} /> : <Copy size={11} />}
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
                padding: '6px 2px'
              }}>
                <MarkdownRenderer text={aiResult} />
              </div>

              {contentType === 'prose' ? (
                /* Primary action for Prose is Append/Replace, and Copy is secondary */
                <div style={{ display: 'flex', gap: '6px', marginTop: '4px' }}>
                  <button
                    type="button"
                    className="btn btn-primary"
                    style={{ flexGrow: 1, padding: '5px', fontSize: '11px', borderRadius: '4px' }}
                    onClick={() => {
                      if (selectedTextExists) {
                        onReplaceSelection(aiResult);
                      } else {
                        onAppendToActivePage(aiResult);
                      }
                      setAiResult('');
                      setCustomPrompt('');
                      setSubmittedPrompt('');
                    }}
                  >
                    {selectedTextExists ? 'Replace Selection' : 'Append to Page'}
                  </button>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    style={{
                      padding: '5px 10px',
                      fontSize: '11px',
                      borderRadius: '4px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      minWidth: '70px',
                      justifyContent: 'center'
                    }}
                    onClick={() => handleCopy(aiResult)}
                  >
                    {copied ? <Check size={11} style={{ color: '#34d399' }} /> : <Copy size={11} />}
                    {copied ? 'Copied' : 'Copy'}
                  </button>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    style={{ padding: '5px 10px', fontSize: '11px', borderRadius: '4px' }}
                    onClick={() => {
                      setAiResult('');
                      setSubmittedPrompt('');
                    }}
                  >
                    Discard
                  </button>
                </div>
              ) : (
                /* Primary action for Chat is Copy, and Append is secondary/outline style with warning context */
                <div style={{ display: 'flex', gap: '6px', marginTop: '4px' }}>
                  <button
                    type="button"
                    className="btn btn-primary"
                    style={{
                      flexGrow: 1,
                      padding: '5px',
                      fontSize: '11px',
                      borderRadius: '4px',
                      background: 'var(--accent-primary)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      justifyContent: 'center'
                    }}
                    onClick={() => handleCopy(aiResult)}
                  >
                    {copied ? <Check size={12} style={{ color: '#ffffff' }} /> : <Copy size={12} />}
                    {copied ? 'Copied!' : 'Copy to Clipboard'}
                  </button>
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
                      if (selectedTextExists) {
                        onReplaceSelection(aiResult);
                      } else {
                        onAppendToActivePage(aiResult);
                      }
                      setAiResult('');
                      setCustomPrompt('');
                      setSubmittedPrompt('');
                    }}
                  >
                    Append anyway
                  </button>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    style={{ padding: '5px 10px', fontSize: '11px', borderRadius: '4px' }}
                    onClick={() => {
                      setAiResult('');
                      setSubmittedPrompt('');
                    }}
                  >
                    Discard
                  </button>
                </div>
              )}
            </div>
          );
        })()}
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
          background: 'rgba(255,255,255,0.02)',
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
                setSubmittedPrompt(promptVal);
                setCustomPrompt('');
                if (selectedTextExists) {
                  callGroq(
                    "You are a helpful novelist and writing partner. Modify the provided text strictly according to the author's instructions. ONLY return the modified text.",
                    `Modify the text according to this command: ${promptVal}\n\nText:\n${selectedText}`
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
                    
                  callGroq(systemInstruction, userContent);
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
                setSubmittedPrompt(promptVal);
                setCustomPrompt('');
                if (selectedTextExists) {
                  callGroq(
                    "You are a helpful novelist and writing partner. Modify the provided text strictly according to the author's instructions. ONLY return the modified text.",
                    `Modify the text according to this command: ${promptVal}\n\nText:\n${selectedText}`
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
                    
                  callGroq(systemInstruction, userContent);
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
      animation: 'fadeInDown 0.25s ease-out' 
    }}>
      {/* Scrollable upper area */}
      <div style={{ 
        flexGrow: 1, 
        overflowY: 'auto', 
        padding: '20px 20px 10px 20px', 
        display: 'flex', 
        flexDirection: 'column', 
        gap: '12px' 
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
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
            onClick={() => {
              setAiResult('');
              setCustomPrompt('');
              setSubmittedPrompt('');
              setAiError('');
            }}
          >
            <Plus size={12} /> New Chat
          </button>
        </div>
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
    </div>
  );
};
