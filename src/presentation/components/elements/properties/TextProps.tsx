import { t as __tr } from '@/shared/i18n';
import React from 'react';
import type { TextElement } from '@/shared/types';
import { Group, L, inputStyle, normalizeColor } from './ui';

export const TextProps: React.FC<{ el: TextElement; update: (p: Partial<TextElement>) => void }> = ({ el, update }) => {
  const isArc = el.textMode === 'arc';

  return (
    <>
      <Group title={__tr("Текст")}>
        <L label={__tr("Содержимое")}>
          <textarea style={{ ...inputStyle, minHeight: 60 }} value={el.text} onChange={(e) => update({ text: e.target.value })} />
        </L>
        <L label={__tr("Размер")}><input style={inputStyle} type="number" value={el.fontSize} onChange={(e) => update({ fontSize: +e.target.value })} /></L>
        <L label={__tr("Цвет")}><input style={inputStyle} type="color" value={normalizeColor(el.fill)} onChange={(e) => update({ fill: e.target.value })} /></L>
      </Group>

      <Group title={__tr("Расположение")}>
        <L label={__tr("Режим")}>
          <select style={inputStyle} value={el.textMode || 'straight'} onChange={(e) => update({ textMode: e.target.value as 'straight' | 'arc' })}>
            <option value="straight">{__tr("Обычный")}</option>
            <option value="arc">{__tr("По дуге")}</option>
          </select>
        </L>
      </Group>

      {isArc ? (
        <Group title={__tr("Параметры дуги")}>
          <L label={__tr("Радиус: {0}px", el.arcRadius ?? 150)}>
            <input type="range" min={50} max={500} value={el.arcRadius ?? 150} onChange={(e) => update({ arcRadius: +e.target.value })} style={{ width: '100%' }} />
          </L>
          <L label={__tr("Начало: {0}°", el.arcStartAngle ?? -90)}>
            <input type="range" min={-180} max={180} value={el.arcStartAngle ?? -90} onChange={(e) => update({ arcStartAngle: +e.target.value })} style={{ width: '100%' }} />
          </L>
          <L label={__tr("Конец: {0}°", el.arcEndAngle ?? 90)}>
            <input type="range" min={-180} max={180} value={el.arcEndAngle ?? 90} onChange={(e) => update({ arcEndAngle: +e.target.value })} style={{ width: '100%' }} />
          </L>
          <label style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 8, fontSize: 12, cursor: 'pointer' }}>
            <input type="checkbox" checked={!!el.arcFlip} onChange={(e) => update({ arcFlip: e.target.checked })} />
            {__tr("Перевернуть текст (снизу)")}</label>
        </Group>
      ) : (
        <Group title={__tr("Выравнивание")}>
          <L label={__tr("По горизонтали")}>
            <select style={inputStyle} value={el.align} onChange={(e) => update({ align: e.target.value as any })}>
              <option value="left">{__tr("Влево")}</option>
              <option value="center">{__tr("Центр")}</option>
              <option value="right">{__tr("Вправо")}</option>
              <option value="justify">{__tr("По ширине")}</option>
            </select>
          </L>
        </Group>
      )}
    </>
  );
};