import React, { useEffect, useRef } from 'react';

interface Props {
  x: number;
  y: number;
  width: number;
  height: number;
  value: string;
  fontSize: number;
  fontFamily: string;
  fontStyle: string;
  textDecoration: string;
  align: string;
  fill: string;
  onChange: (v: string) => void;
  onCommit: () => void;
  onCancel: () => void;
}

export const InlineTextEditor: React.FC<Props> = ({
  x, y, width, height, value, fontSize, fontFamily,
  fontStyle, textDecoration, align, fill,
  onChange, onCommit, onCancel,
}) => {
  const ref = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    ref.current?.focus();
    // Устанавливаем курсор в конец
    const len = value.length;
    ref.current?.setSelectionRange(len, len);
  }, []);

  return (
    <textarea
      ref={ref}
      className="inline-text-editor"
      style={{
        left: x,
        top: y,
        width,
        minHeight: height,
        fontSize,
        fontFamily,
        fontWeight: fontStyle.includes('bold') ? 'bold' : 'normal',
        fontStyle: fontStyle.includes('italic') ? 'italic' : 'normal',
        textDecoration,
        textAlign: align as any,
        color: fill,
        lineHeight: 1.2,
      }}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      onKeyDown={(e) => {
        if (e.key === 'Escape') {
          e.preventDefault();
          onCancel();
        }
        if (e.key === 'Enter' && !e.shiftKey) {
          // Enter без Shift — вставить новую строку (как в draw.io)
          // Для завершения — Shift+Enter
          return; // textarea сам обработает
        }
        if (e.key === 'Enter' && e.shiftKey) {
          e.preventDefault();
          onCommit();
        }
      }}
      onBlur={onCommit}
      autoFocus
      spellCheck={false}
    />
  );
};