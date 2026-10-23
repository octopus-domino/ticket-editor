import React from 'react';
import type {
  ShapeElement, TextAlign, TextVerticalAlign, CanvasElement,
} from '@/shared/types';
import { Group, L, inputStyle, normalizeColor } from './ui';
import { AppearancePanel } from '../../panels/AppearancePanel';

export const ShapeProps: React.FC<{
  el: ShapeElement;
  update: (p: Partial<ShapeElement>) => void;
}> = ({ el, update }) => {
  const pad = el.textPadding || { top: 8, right: 8, bottom: 8, left: 8 };

  const updatePad = (key: keyof typeof pad, val: number) => {
    update({ textPadding: { ...pad, [key]: val } });
  };

  return (
    <>
      {/* v7: Appearance (fills + strokes + градиенты) */}
      <AppearancePanel
        element={el}
        update={update as unknown as (p: Partial<CanvasElement>) => void}
      />

      <Group title="Фигура">
        <L label="Заливка">
          <input
            style={inputStyle} type="color"
            value={normalizeColor(el.fill)}
            onChange={(e) => update({ fill: e.target.value })}
          />
        </L>
        <L label="Обводка">
          <input
            style={inputStyle} type="color"
            value={normalizeColor(el.stroke)}
            onChange={(e) => update({ stroke: e.target.value })}
          />
        </L>
        <L label="Толщина">
          <input
            style={inputStyle} type="number" min={0}
            value={el.strokeWidth}
            onChange={(e) => update({ strokeWidth: +e.target.value })}
          />
        </L>
      </Group>

      {/* v8: параметрическая дуга */}
      {el.shape === 'arc' && (
        <Group title="Дуга">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
            <L label="Начало°, 0..360">
              <input
                type="number" style={inputStyle}
                value={el.arcStartAngle ?? 0}
                onChange={(e) => update({ arcStartAngle: +e.target.value })}
              />
            </L>
            <L label="Конец°, 0..360">
              <input
                type="number" style={inputStyle}
                value={el.arcEndAngle ?? 90}
                onChange={(e) => update({ arcEndAngle: +e.target.value })}
              />
            </L>
          </div>
          <L label={`Внутренний радиус: ${Math.round((el.arcInnerRadius ?? 0.5) * 100)}%`}>
            <input
              type="range" min={0} max={0.99} step={0.01}
              value={el.arcInnerRadius ?? 0.5}
              onChange={(e) => update({ arcInnerRadius: +e.target.value })}
              style={{ width: '100%' }}
            />
          </L>
          <L label={`Внешний радиус: ${Math.round((el.arcOuterRadius ?? 1) * 100)}%`}>
            <input
              type="range" min={0.01} max={1} step={0.01}
              value={el.arcOuterRadius ?? 1}
              onChange={(e) => update({ arcOuterRadius: +e.target.value })}
              style={{ width: '100%' }}
            />
          </L>
          <p style={{ fontSize: 11, color: '#94a3b8', margin: '4px 0 0', lineHeight: 1.4 }}>
            Радиусы — доли от половины минимальной стороны элемента.
            <br />
            Inner = 0 — сектор; Inner &gt; 0 — сегмент кольца.
          </p>
        </Group>
      )}

      <Group title="Текст внутри">
        <L label="Содержимое">
          <textarea
            style={{ ...inputStyle, minHeight: 60 }}
            value={el.text || ''}
            onChange={(e) => update({ text: e.target.value })}
          />
        </L>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, marginBottom: 6 }}>
          <L label="Размер">
            <input
              style={inputStyle} type="number"
              value={el.fontSize}
              onChange={(e) => update({ fontSize: +e.target.value })}
            />
          </L>
          <L label="Цвет">
            <input
              style={inputStyle} type="color"
              value={normalizeColor(el.textFill)}
              onChange={(e) => update({ textFill: e.target.value })}
            />
          </L>
        </div>

        <L label="Горизонтальное выравнивание">
          <select
            style={inputStyle}
            value={el.textAlign || 'center'}
            onChange={(e) => update({ textAlign: e.target.value as TextAlign })}
          >
            <option value="left">По левому краю</option>
            <option value="center">По центру</option>
            <option value="right">По правому краю</option>
            <option value="justify">По ширине</option>
          </select>
        </L>

        <L label="Вертикальное выравнивание">
          <select
            style={inputStyle}
            value={el.textVerticalAlign || 'middle'}
            onChange={(e) => update({ textVerticalAlign: e.target.value as TextVerticalAlign })}
          >
            <option value="top">Сверху</option>
            <option value="middle">По центру</option>
            <option value="bottom">Снизу</option>
          </select>
        </L>
      </Group>

      <Group title="Отступы текста (Padding)">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
          <L label="Сверху">
            <input
              style={inputStyle} type="number"
              value={pad.top}
              onChange={(e) => updatePad('top', +e.target.value)}
            />
          </L>
          <L label="Снизу">
            <input
              style={inputStyle} type="number"
              value={pad.bottom}
              onChange={(e) => updatePad('bottom', +e.target.value)}
            />
          </L>
          <L label="Слева">
            <input
              style={inputStyle} type="number"
              value={pad.left}
              onChange={(e) => updatePad('left', +e.target.value)}
            />
          </L>
          <L label="Справа">
            <input
              style={inputStyle} type="number"
              value={pad.right}
              onChange={(e) => updatePad('right', +e.target.value)}
            />
          </L>
        </div>
      </Group>
    </>
  );
};