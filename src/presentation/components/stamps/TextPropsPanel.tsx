/* ============================================================
   stamps/TextPropsPanel.tsx
   F-STMP-E-13, F-STMP-N-05, F-STMP-N-08..09, F-SGEO-01.
   ============================================================ */

import React from 'react';
import type { StampTextItem, TextAlign } from '@/shared/types';
import {
  MIN_ARC_SPAN_DEG, MAX_ARC_SPAN_DEG, type ArcDirection,
} from './stampSnap';

interface Props {
  text: StampTextItem;
  onChange: (p: Partial<StampTextItem>) => void;
}

export const TextPropsPanel: React.FC<Props> = ({ text, onChange }) => {
  const hasBold = (text.fontStyle || '').includes('bold');
  const hasItalic = (text.fontStyle || '').includes('italic');
  const hasUnderline = (text.textDecoration || '').includes('underline');
  const direction: ArcDirection = text.arcDirection ?? 'cw';

  const toggle = (flag: 'bold' | 'italic') => {
    const parts = (text.fontStyle || '').split(' ').filter(Boolean);
    const next = parts.includes(flag)
      ? parts.filter((p) => p !== flag)
      : [...parts, flag];
    onChange({ fontStyle: next.join(' ') || 'normal' });
  };

  const rx = text.arcRx ?? text.arcRadius;
  const ry = text.arcRy ?? text.arcRadius;

  return (
    <>
      <h4>Текст</h4>
      <label>
        Имя
        <input
          value={text.name || ''}
          placeholder="Текст"
          onChange={(e) => onChange({ name: e.target.value })}
        />
      </label>
      <label>
        Содержимое
        <textarea
          value={text.text}
          onChange={(e) => onChange({ text: e.target.value })}
        />
      </label>
      <label>
        Режим
        <select
          value={text.mode}
          onChange={(e) => onChange({ mode: e.target.value as 'straight' | 'arc' })}
        >
          <option value="straight">Прямой</option>
          <option value="arc">По дуге</option>
        </select>
      </label>

      {text.mode === 'straight' ? (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
            <label>X <input type="number" value={Math.round(text.x)} onChange={(e) => onChange({ x: +e.target.value })} /></label>
            <label>Y <input type="number" value={Math.round(text.y)} onChange={(e) => onChange({ y: +e.target.value })} /></label>
          </div>
          <label>Ширина <input type="number" min="10" value={Math.round(text.width)} onChange={(e) => onChange({ width: +e.target.value })} /></label>
          <label>
            Выравнивание
            <select value={text.align} onChange={(e) => onChange({ align: e.target.value as TextAlign })}>
              <option value="left">Влево</option>
              <option value="center">По центру</option>
              <option value="right">Вправо</option>
            </select>
          </label>
        </>
      ) : (
        <>
          <h4>Дуга</h4>
          <label>
            Направление
            <select
              value={direction}
              onChange={(e) => onChange({ arcDirection: e.target.value as ArcDirection })}
            >
              <option value="cw">По часовой</option>
              <option value="ccw">Против часовой</option>
            </select>
          </label>
          <label>
            Угол: {Math.round(text.arcSpanDeg ?? 320)}°
            <input
              type="range"
              min={MIN_ARC_SPAN_DEG}
              max={MAX_ARC_SPAN_DEG}
              value={text.arcSpanDeg ?? 320}
              onChange={(e) => onChange({ arcSpanDeg: +e.target.value })}
            />
          </label>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
            <label>
              Градус
              <input
                type="number"
                min={MIN_ARC_SPAN_DEG}
                max={MAX_ARC_SPAN_DEG}
                value={Math.round(text.arcSpanDeg ?? 320)}
                onChange={(e) => onChange({
                  arcSpanDeg: Math.max(
                    MIN_ARC_SPAN_DEG,
                    Math.min(MAX_ARC_SPAN_DEG, +e.target.value),
                  ),
                })}
              />
            </label>
            <label>
              Отступ px
              <input
                type="number"
                min="0"
                max="100"
                value={Math.round(text.arcOffset ?? 6)}
                onChange={(e) => onChange({ arcOffset: Math.max(0, +e.target.value) })}
              />
            </label>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
            <label>
              Радиус X
              <input
                type="number"
                value={Math.round(rx)}
                onChange={(e) => onChange({
                  arcRx: +e.target.value,
                  arcRy: text.arcRy ?? text.arcRadius,
                })}
              />
            </label>
            <label>
              Радиус Y
              <input
                type="number"
                value={Math.round(ry)}
                onChange={(e) => onChange({
                  arcRy: +e.target.value,
                  arcRx: text.arcRx ?? text.arcRadius,
                })}
              />
            </label>
          </div>
          <label className="check" style={{ marginTop: 6 }}>
            <input
              type="checkbox"
              checked={!!text.arcOutside}
              onChange={(e) => onChange({ arcOutside: e.target.checked })}
            />{' '}
            Снаружи
          </label>
          <h4>Центр дуги</h4>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
            <label>X <input type="number" value={Math.round(text.arcCx)} onChange={(e) => onChange({ arcCx: +e.target.value })} /></label>
            <label>Y <input type="number" value={Math.round(text.arcCy)} onChange={(e) => onChange({ arcCy: +e.target.value })} /></label>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
            <label>Начало° <input type="number" value={Math.round(text.arcStartDeg)} onChange={(e) => onChange({ arcStartDeg: +e.target.value })} /></label>
            <label>Конец° <input type="number" value={Math.round(text.arcEndDeg)} onChange={(e) => onChange({ arcEndDeg: +e.target.value })} /></label>
          </div>
        </>
      )}

      <h4>Стиль</h4>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
        <label>Размер <input type="number" min="6" value={text.fontSize} onChange={(e) => onChange({ fontSize: +e.target.value })} /></label>
        <label>
          Шрифт
          <select value={text.fontFamily} onChange={(e) => onChange({ fontFamily: e.target.value })}>
            <option value="Arial">Arial</option>
            <option value="Times New Roman">Times New Roman</option>
            <option value="Courier New">Courier New</option>
            <option value="Georgia">Georgia</option>
            <option value="Verdana">Verdana</option>
          </select>
        </label>
      </div>
      <div style={{ display: 'flex', gap: 4, marginTop: 6 }}>
        <button className={hasBold ? 'active' : ''} style={{ flex: 1 }} onClick={() => toggle('bold')}><b>B</b></button>
        <button className={hasItalic ? 'active' : ''} style={{ flex: 1 }} onClick={() => toggle('italic')}><i>I</i></button>
        <button
          className={hasUnderline ? 'active' : ''}
          style={{ flex: 1 }}
          onClick={() => onChange({ textDecoration: hasUnderline ? '' : 'underline' })}
        >
          <u>U</u>
        </button>
      </div>
      <label>
        Цвет
        <input type="color" value={text.fill} onChange={(e) => onChange({ fill: e.target.value })} />
      </label>
    </>
  );
};