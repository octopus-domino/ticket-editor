import { t as __tr } from '@/shared/i18n';
import React from 'react';
import type { PathElement } from '@/shared/types';
import { Group, L, inputStyle, normalizeColor } from './ui';

export const PathProps: React.FC<{
  el: PathElement;
  update: (p: Partial<PathElement>) => void;
}> = ({ el, update }) => (
  <>
    <Group title="SVG path">
      <L label="d (path data)">
        <textarea
          style={{ ...inputStyle, minHeight: 90, fontFamily: 'monospace', fontSize: 11 }}
          value={el.d}
          onChange={(e) => update({ d: e.target.value })}
          spellCheck={false}
        />
      </L>
      <p style={{ fontSize: 11, color: '#94a3b8', margin: '4px 0 0', lineHeight: 1.4 }}>
        {__tr("Координаты — относительно левого верхнего угла элемента. Например:")}{' '}
        <code>M 0 0 L 100 0 L 50 80 Z</code>
      </p>
    </Group>

    <Group title={__tr("Стиль")}>
      <L label={__tr("Заливка")}>
        <input
          type="color" style={inputStyle}
          value={normalizeColor(el.fill)}
          onChange={(e) => update({ fill: e.target.value })}
        />
      </L>
      <L label={__tr("Обводка")}>
        <input
          type="color" style={inputStyle}
          value={normalizeColor(el.stroke)}
          onChange={(e) => update({ stroke: e.target.value })}
        />
      </L>
      <L label={__tr("Толщина")}>
        <input
          type="number" min={0} style={inputStyle}
          value={el.strokeWidth}
          onChange={(e) => update({ strokeWidth: +e.target.value })}
        />
      </L>
    </Group>
  </>
);