import React from 'react';
import type { TextElement } from '@/shared/types';
import { Group, L, inputStyle, normalizeColor } from './ui';

export const TextProps: React.FC<{ el: TextElement; update: (p: Partial<TextElement>) => void }> = ({ el, update }) => {
  const isArc = el.textMode === 'arc';

  return (
    <>
      <Group title="Текст">
        <L label="Содержимое">
          <textarea style={{ ...inputStyle, minHeight: 60 }} value={el.text} onChange={(e) => update({ text: e.target.value })} />
        </L>
        <L label="Размер"><input style={inputStyle} type="number" value={el.fontSize} onChange={(e) => update({ fontSize: +e.target.value })} /></L>
        <L label="Цвет"><input style={inputStyle} type="color" value={normalizeColor(el.fill)} onChange={(e) => update({ fill: e.target.value })} /></L>
      </Group>

      <Group title="Расположение">
        <L label="Режим">
          <select style={inputStyle} value={el.textMode || 'straight'} onChange={(e) => update({ textMode: e.target.value as 'straight' | 'arc' })}>
            <option value="straight">Обычный</option>
            <option value="arc">По дуге</option>
          </select>
        </L>
      </Group>

      {isArc ? (
        <Group title="Параметры дуги">
          <L label={`Радиус: ${el.arcRadius ?? 150}px`}>
            <input type="range" min={50} max={500} value={el.arcRadius ?? 150} onChange={(e) => update({ arcRadius: +e.target.value })} style={{ width: '100%' }} />
          </L>
          <L label={`Начало: ${el.arcStartAngle ?? -90}°`}>
            <input type="range" min={-180} max={180} value={el.arcStartAngle ?? -90} onChange={(e) => update({ arcStartAngle: +e.target.value })} style={{ width: '100%' }} />
          </L>
          <L label={`Конец: ${el.arcEndAngle ?? 90}°`}>
            <input type="range" min={-180} max={180} value={el.arcEndAngle ?? 90} onChange={(e) => update({ arcEndAngle: +e.target.value })} style={{ width: '100%' }} />
          </L>
          <label style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 8, fontSize: 12, cursor: 'pointer' }}>
            <input type="checkbox" checked={!!el.arcFlip} onChange={(e) => update({ arcFlip: e.target.checked })} />
            Перевернуть текст (снизу)
          </label>
        </Group>
      ) : (
        <Group title="Выравнивание">
          <L label="По горизонтали">
            <select style={inputStyle} value={el.align} onChange={(e) => update({ align: e.target.value as any })}>
              <option value="left">Влево</option>
              <option value="center">Центр</option>
              <option value="right">Вправо</option>
              <option value="justify">По ширине</option>
            </select>
          </L>
        </Group>
      )}
    </>
  );
};