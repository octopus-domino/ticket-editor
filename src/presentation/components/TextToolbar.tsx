// src/presentation/components/TextToolbar.tsx
import React, { useLayoutEffect, useRef, useState } from 'react';
import type { TextAlign } from '@/shared/types';

export interface TextStylePatch {
  fontSize?: number;
  fontFamily?: string;
  fontStyle?: string;
  textDecoration?: string;
  fill?: string;
  align?: TextAlign;
}

interface Props {
  x: number;
  y: number;
  elementHeight: number;
  fontSize: number;
  fontFamily: string;
  fontStyle: string;
  textDecoration: string;
  fill: string;
  align: TextAlign;
  onChange: (patch: TextStylePatch) => void;
  onCommit: () => void;
}

const FONTS = [
  'Arial', 'Times New Roman', 'Courier New',
  'Georgia', 'Verdana', 'Comic Sans MS',
];
const SIZES = [8, 10, 12, 14, 16, 18, 20, 24, 28, 32, 36, 48, 64, 72];
const MARGIN = 8;

export const TextToolbar: React.FC<Props> = ({
  x, y, elementHeight,
  fontSize, fontFamily, fontStyle, textDecoration, fill, align,
  onChange, onCommit,
}) => {
  const isBold = fontStyle.includes('bold');
  const isItalic = fontStyle.includes('italic');
  const isUnderline = textDecoration.includes('underline');

  const toolbarRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: 520, h: 44 });

  useLayoutEffect(() => {
    const el = toolbarRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    if (r.width && r.height) setSize({ w: r.width, h: r.height });
  }, [fontFamily, fontSize]);

  const vw = typeof window !== 'undefined' ? window.innerWidth : 1280;
  const vh = typeof window !== 'undefined' ? window.innerHeight : 800;

  const px = Math.max(MARGIN, Math.min(x, vw - size.w - MARGIN));

  const aboveY = y - size.h - MARGIN;
  const belowY = y + elementHeight + MARGIN;
  let py: number;
  if (aboveY >= MARGIN) py = aboveY;
  else if (belowY + size.h <= vh - MARGIN) py = belowY;
  else py = Math.max(MARGIN, vh - size.h - MARGIN);

  const toggleStyle = (flag: 'bold' | 'italic') => {
    const parts = fontStyle.split(' ').filter(Boolean);
    const idx = parts.indexOf(flag);
    if (idx >= 0) parts.splice(idx, 1);
    else parts.push(flag);
    onChange({ fontStyle: parts.join(' ') || 'normal' });
  };

  const toggleUnderline = () => {
    onChange({ textDecoration: isUnderline ? '' : 'underline' });
  };

  const keepFocus = (e: React.MouseEvent) => e.preventDefault();
  const stopBubble = (e: React.MouseEvent) => e.stopPropagation();

  return (
    <div
      ref={toolbarRef}
      className="text-toolbar"
      style={{ left: px, top: py }}
      onMouseDown={stopBubble}
    >
      <select
        value={fontFamily}
        onChange={(e) => onChange({ fontFamily: e.target.value })}
        className="tt-select"
        title="Шрифт"
      >
        {FONTS.map((f) => (
          <option key={f} value={f}>{f}</option>
        ))}
      </select>

      <select
        value={Math.round(fontSize)}
        onChange={(e) => onChange({ fontSize: +e.target.value })}
        className="tt-select tt-size"
        title="Размер"
      >
        {SIZES.map((s) => (
          <option key={s} value={s}>{s}</option>
        ))}
      </select>

      <div className="tt-group">
        <button
          type="button"
          onMouseDown={keepFocus}
          className={isBold ? 'active' : ''}
          onClick={() => toggleStyle('bold')}
          title="Жирный"
        ><b>B</b></button>
        <button
          type="button"
          onMouseDown={keepFocus}
          className={isItalic ? 'active' : ''}
          onClick={() => toggleStyle('italic')}
          title="Курсив"
        ><i>I</i></button>
        <button
          type="button"
          onMouseDown={keepFocus}
          className={isUnderline ? 'active' : ''}
          onClick={toggleUnderline}
          title="Подчёркнутый"
        ><u>U</u></button>
      </div>

      <input
        type="color"
        value={fill}
        onChange={(e) => onChange({ fill: e.target.value })}
        className="tt-color"
        title="Цвет"
      />

      <div className="tt-group">
        <button
          type="button"
          onMouseDown={keepFocus}
          className={align === 'left' ? 'active' : ''}
          onClick={() => onChange({ align: 'left' })}
          title="Влево"
        >◧</button>
        <button
          type="button"
          onMouseDown={keepFocus}
          className={align === 'center' ? 'active' : ''}
          onClick={() => onChange({ align: 'center' })}
          title="По центру"
        >◫</button>
        <button
          type="button"
          onMouseDown={keepFocus}
          className={align === 'right' ? 'active' : ''}
          onClick={() => onChange({ align: 'right' })}
          title="Вправо"
        >◨</button>
      </div>

      <div className="tt-group">
        <button
          type="button"
          onMouseDown={keepFocus}
          onClick={onCommit}
          title="Готово (Ctrl+Enter)"
          className="tt-done"
        >✓</button>
      </div>
    </div>
  );
};