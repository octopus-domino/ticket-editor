import { t as __tr } from '@/shared/i18n';
import React, { useMemo } from 'react';
import { Layer, Rect, Label, Tag, Text as KonvaText, Circle } from 'react-konva';
import type { Slide } from '@/shared/types';
import { resolveBindings } from '@/features/bindings/domain/BindingResolver';
import { useActiveModelValues } from '@/features/data-models/state/useActiveModelValues';
import { getByPath } from '@/lib/modelBinding';

interface Props {
  slide: Slide;
  zoom: number;
  active: boolean;
}

const COLOR_LINKED = '#6366f1';
const COLOR_MISSING = '#ef4444';
const COLOR_EMPTY = '#94a3b8';

/**
 * Инлайн-подсветка привязок данных.
 * - Элементы с {{path}} / fieldPath — рамка + бейдж с путём.
 * - Placeholder без fieldPath — серая точка.
 * - Placeholder с fieldPath, но без значения в модели — красный.
 */
export const DataHighlightLayer: React.FC<Props> = ({ slide, zoom, active }) => {
  const modelValues = useActiveModelValues();

  const bindings = useMemo(() => resolveBindings([slide]), [slide]);
  const bindingsByElement = useMemo(() => {
    const map = new Map<string, typeof bindings>();
    for (const b of bindings) {
      const arr = map.get(b.elementId) ?? [];
      arr.push(b);
      map.set(b.elementId, arr);
    }
    return map;
  }, [bindings]);

  if (!active) return null;

  const bw = Math.max(1, 1.2 / zoom);
  const fs = Math.max(9, 10 / zoom);
  const pad = Math.max(2, 3 / zoom);

  return (
    <Layer listening={false}>
      {slide.elements.map((el) => {
        if (el.type === 'group' || el.type === 'connector' || el.type === 'line') return null;

        const items = bindingsByElement.get(el.id) ?? [];
        const hasBinding = items.length > 0;

        // Placeholder без fieldPath — «нет данных»
        if (el.type === 'placeholder' && !hasBinding) {
          return (
            <React.Fragment key={el.id}>
              <Rect
                x={el.x}
                y={el.y}
                width={el.width}
                height={el.height}
                stroke={COLOR_EMPTY}
                strokeWidth={bw}
                dash={[4 / zoom, 4 / zoom]}
                cornerRadius={2 / zoom}
              />
              <Label x={el.x} y={el.y - fs - pad * 2}>
                <Tag fill={COLOR_EMPTY} cornerRadius={3 / zoom} />
                <KonvaText text={__tr("нет поля")} fontSize={fs} fill="#ffffff" padding={pad} />
              </Label>
            </React.Fragment>
          );
        }

        if (!hasBinding) return null;

        const paths = items.map((b) => b.schemaPath);
        const hasValue = paths.some((p) => {
          const v = getByPath(modelValues, p);
          return v !== undefined && v !== null && String(v).trim() !== '';
        });
        const color = hasValue ? COLOR_LINKED : COLOR_MISSING;
        const label = paths.join(' · ');

        return (
          <React.Fragment key={el.id}>
            <Rect
              x={el.x}
              y={el.y}
              width={el.width}
              height={el.height}
              stroke={color}
              strokeWidth={bw}
              cornerRadius={2 / zoom}
              fill={`${color}11`}
            />
            <Label x={el.x} y={el.y - fs - pad * 2}>
              <Tag fill={color} cornerRadius={3 / zoom} />
              <KonvaText text={label} fontSize={fs} fill="#ffffff" padding={pad} />
            </Label>
            {items.map((b, i) => (
              <Circle
                key={b.placeholder + i}
                x={el.x + el.width - (4 + i * 6) / zoom}
                y={el.y + 4 / zoom}
                radius={3 / zoom}
                fill={color}
              />
            ))}
          </React.Fragment>
        );
      })}
    </Layer>
  );
};
