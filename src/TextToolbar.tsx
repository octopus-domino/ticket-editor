import React from 'react';

interface Props {
  x: number;
  y: number;
  fontSize: number;
  fontFamily: string;
  fontStyle: string;
  textDecoration: string;
  fill: string;
  align: string;
  onChange: (patch: any) => void;
  onCommit: () => void;
}

const FONTS = ['Arial', 'Times New Roman', 'Courier New', 'Georgia', 'Verdana', 'Comic Sans MS'];
const SIZES = [8, 10, 12, 14, 16, 18, 20, 24, 28, 32, 36, 48, 64, 72];

export const TextToolbar: React.FC<Props> = ({
  x, y, fontSize, fontFamily, fontStyle, textDecoration, fill, align,
  onChange, onCommit,
}) => {
  const isBold = fontStyle.includes('bold');
  const isItalic = fontStyle.includes('italic');
  const isUnderline = textDecoration === 'underline';

  const toggleBold = () => {
    const parts = fontStyle.split(' ').filter(Boolean);
    const idx = parts.indexOf('bold');
    if (idx >= 0) parts.splice(idx, 1); else parts.push('bold');
    onChange({ fontStyle: parts.join(' ') || 'normal' });
  };
  const toggleItalic = () => {
    const parts = fontStyle.split(' ').filter(Boolean);
    const idx = parts.indexOf('italic');
    if (idx >= 0) parts.splice(idx, 1); else parts.push('italic');
    onChange({ fontStyle: parts.join(' ') || 'normal' });
  };
  const toggleUnderline = () => {
    onChange({ textDecoration: isUnderline ? '' : 'underline' });
  };

  // Только для кнопок: сохраняет фокус textarea.
  // На select и color НЕ вешаем, иначе браузер не откроет их.
  const keepFocus = (e: React.MouseEvent) => e.preventDefault();

  // Общий контейнер ловит mousedown, чтобы клик по тулбару не коммитил редактор.
  const stopBubble = (e: React.MouseEvent) => e.stopPropagation();

  return (
    <div
      className="text-toolbar"
      style={{ left: x, top: y }}
      onMouseDown={stopBubble}
    >
      <select
        value={fontFamily}
        onChange={(e) => onChange({ fontFamily: e.target.value })}
        className="tt-select"
        title="Шрифт"
      >
        {FONTS.map((f) => <option key={f} value={f}>{f}</option>)}
      </select>

      <select
        value={Math.round(fontSize)}
        onChange={(e) => onChange({ fontSize: +e.target.value })}
        className="tt-select tt-size"
        title="Размер"
      >
        {SIZES.map((s) => <option key={s} value={s}>{s}</option>)}
      </select>

      <div className="tt-group">
        <button type="button" onMouseDown={keepFocus}
          className={isBold ? 'active' : ''} onClick={toggleBold} title="Жирный">
          <b>B</b>
        </button>
        <button type="button" onMouseDown={keepFocus}
          className={isItalic ? 'active' : ''} onClick={toggleItalic} title="Курсив">
          <i>I</i>
        </button>
        <button type="button" onMouseDown={keepFocus}
          className={isUnderline ? 'active' : ''} onClick={toggleUnderline} title="Подчёркнутый">
          <u>U</u>
        </button>
      </div>

      <input
        type="color"
        value={fill}
        onChange={(e) => onChange({ fill: e.target.value })}
        className="tt-color"
        title="Цвет"
      />

      <div className="tt-group">
        <button type="button" onMouseDown={keepFocus}
          className={align === 'left' ? 'active' : ''}
          onClick={() => onChange({ align: 'left' })} title="Влево">⬅</button>
        <button type="button" onMouseDown={keepFocus}
          className={align === 'center' ? 'active' : ''}
          onClick={() => onChange({ align: 'center' })} title="По центру">↔</button>
        <button type="button" onMouseDown={keepFocus}
          className={align === 'right' ? 'active' : ''}
          onClick={() => onChange({ align: 'right' })} title="Вправо">➡</button>
      </div>

      <div className="tt-group">
        <button
          type="button"
          onMouseDown={keepFocus}
          onClick={onCommit}
          title="Готово (Shift+Enter)"
          className="tt-done"
        >✓</button>
      </div>
    </div>
  );
};