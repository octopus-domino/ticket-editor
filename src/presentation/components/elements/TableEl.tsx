import React from 'react';
import { Group, Rect, Text } from 'react-konva';
import type { TableElement } from '@/shared/types';
import type { CommonProps } from './types';
import { useActiveModelValues } from '@/features/data-models/state/useActiveModelValues';
import { resolveWithValues } from '@/lib/modelBinding';

interface Props extends CommonProps<TableElement> {
  el: TableElement;
  onUpdate: (p: Partial<TableElement>) => void;
}

export const TableEl: React.FC<Props> = ({
  el, onSelect, onDragStart, onDragMove, onDragEnd,
  onContextMenu, onDblClick,
}) => {
  const modelValues = useActiveModelValues();
  const cellW = el.width / el.cols;
  const cellH = el.height / el.rows;
  const cells: React.ReactNode[] = [];
  const texts: React.ReactNode[] = [];

  for (let r = 0; r < el.rows; r++) {
    for (let c = 0; c < el.cols; c++) {
      const bg = r === 0 ? el.headerBg : '#fff';
      cells.push(
        <Rect
          key={`r-${r}-${c}`}
          x={c * cellW}
          y={r * cellH}
          width={cellW}
          height={cellH}
          fill={bg}
          stroke={el.borderColor}
          strokeWidth={1}
          strokeScaleEnabled={false}
        />
      );
      const raw = el.data[r]?.[c] ?? '';
      const isPh = /\{\{[^}]+\}\}/.test(raw);
      const display = resolveWithValues(raw, modelValues);
      // Ячейка ещё не подставлена, если после resolve остались {{...}}
      const stillUnresolved = /\{\{[^}]+\}\}/.test(display);

      texts.push(
        <Text
          key={`t-${r}-${c}`}
          x={c * cellW + 6}
          y={r * cellH + 6}
          width={Math.max(1, cellW - 12)}
          height={Math.max(1, cellH - 12)}
          text={display}
          fontSize={el.fontSize}
          fill={stillUnresolved && isPh ? '#2563eb' : '#111'}
          fontStyle={stillUnresolved && isPh ? 'italic' : 'normal'}
          wrap="word"
          ellipsis
          listening={false}
        />
      );
    }
  }

  return (
    <Group
      id={el.id} name="element" x={el.x} y={el.y} rotation={el.rotation}
      draggable
      onMouseDown={(e) => { e.cancelBubble = true; onSelect(e); }}
      onDblClick={(e) => { e.cancelBubble = true; onDblClick?.(e); }}
      onDblTap={(e) => { e.cancelBubble = true; onDblClick?.(e); }}
      onDragStart={onDragStart} onDragMove={onDragMove}
      onDragEnd={(e) => { onDragEnd?.(e); }}
      onContextMenu={onContextMenu}
    >
      <Rect width={el.width} height={el.height} fill="rgba(0,0,0,0.001)" />
      {cells}
      {texts}
    </Group>
  );
};