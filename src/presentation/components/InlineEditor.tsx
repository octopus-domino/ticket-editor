import React, { useEffect, useRef, useState, useCallback } from 'react';

interface InlineEditorProps {
  x: number; y: number; width: number; height: number;
  value: string; html?: string;
  fontSize: number; fontFamily: string; fontStyle: string; textDecoration: string;
  fill: string; align: 'left' | 'center' | 'right' | 'justify';
  verticalAlign: 'top' | 'middle' | 'bottom';
  lineHeight: number; padding: { top: number; right: number; bottom: number; left: number };
  background: string; isOpen: boolean;
  onChange: (value: { value?: string; html?: string }) => void;
  onCommit: () => void; onCancel: () => void;
}

export const InlineEditor: React.FC<InlineEditorProps> = ({
  x, y, width, height, value, html,
  fontSize, fontFamily, fontStyle, textDecoration,
  fill, align, verticalAlign, lineHeight, padding, background,
  isOpen, onChange, onCommit, onCancel,
}) => {
  const editorRef = useRef<HTMLDivElement>(null);
  const [isComposing, setIsComposing] = useState(false);
  const committedRef = useRef(false);

  useEffect(() => {
    if (!isOpen || !editorRef.current) return;
    committedRef.current = false;
    const editor = editorRef.current;
    editor.innerHTML = html || value || '<p><br></p>';
    editor.focus();

    const range = document.createRange();
    range.selectNodeContents(editor);
    const selection = window.getSelection();
    if (selection) {
      selection.removeAllRanges();
      selection.addRange(range);
    }
    // html и value — initial values; эффект должен сработать ТОЛЬКО
    // при открытии, а не на каждый ввод (иначе каретка будет сбрасываться).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  const handleInput = useCallback(() => {
    if (!editorRef.current) return;
    onChange({ value: editorRef.current.innerText, html: editorRef.current.innerHTML });
  }, [onChange]);

  const handleCommit = useCallback(() => {
    if (committedRef.current) return;
    committedRef.current = true;
    onCommit();
  }, [onCommit]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (isComposing) return;
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleCommit(); }
    else if (e.key === 'Escape') { e.preventDefault(); onCancel(); }
  }, [isComposing, handleCommit, onCancel]);

  const handleBlur = useCallback(() => setTimeout(() => handleCommit(), 100), [handleCommit]);

  if (!isOpen) return null;

  return (
    <div className="inline-editor-overlay" style={{ position: 'fixed', left: x, top: y, width, height, zIndex: 1000 }}>
      <div
        ref={editorRef}
        className="inline-editor"
        contentEditable
        suppressContentEditableWarning
        onInput={handleInput}
        onKeyDown={handleKeyDown}
        onBlur={handleBlur}
        onCompositionStart={() => setIsComposing(true)}
        onCompositionEnd={() => setIsComposing(false)}
        style={{
          width: '100%', height: '100%', padding: `${padding.top}px ${padding.right}px ${padding.bottom}px ${padding.left}px`,
          fontSize: `${fontSize}px`, fontFamily, fontStyle, textDecoration, color: fill,
          backgroundColor: background === 'transparent' ? 'rgba(255,255,255,0.9)' : background,
          textAlign: align, display: 'flex', flexDirection: 'column',
          justifyContent: verticalAlign === 'middle' ? 'center' : verticalAlign === 'bottom' ? 'flex-end' : 'flex-start',
          lineHeight, outline: 'none', border: '2px solid #3b82f6', borderRadius: '4px',
          boxShadow: '0 4px 20px rgba(0,0,0,0.15)', overflow: 'auto', wordWrap: 'break-word', whiteSpace: 'pre-wrap',
        }}
      />
    </div>
  );
};