import React from 'react';
import { Group, Rect, Text } from 'react-konva';
import type { TableElement } from '../../types';
import type { CommonProps } from './types';

interface Props extends CommonProps {
  el: TableElement;
  onUpdate: (p: Partial<TableElement>) => void;
  onCellDblClick?: (r: number, c: number) => void;
}

export const TableEl: React.FC<Props> = ({
  el, onSelect, onUpdate, onCellDblClick,
  onDragStart, onDragMove, onDragEnd, onContextMenu,
}) => {
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
          x={c * cellW} y={r * cellH}
          width={cellW} height={cellH}
          fill={bg}
          stroke={el.borderColor}
          strokeWidth={1}
          onDblClick={(e) => { e.cancelBubble = true; onCellDblClick?.(r, c); }}
          onDblTap={(e) => { e.cancelBubble = true; onCellDblClick?.(r, c); }}
        />
      );
      const cellText = el.data[r]?.[c] ?? '';
      const isPh = /\{\{[^}]+\}\}/.test(cellText);
      texts.push(
        <Text
          key={`t-${r}-${c}`}
          x={c * cellW + 6} y={r * cellH + 6}
          width={cellW - 12}
          text={cellText}
          fontSize={el.fontSize}
          fill={isPh ? '#2563eb' : '#111'}
          fontStyle={isPh ? 'italic' : 'normal'}
          listening={false}
        />
      );
    }
  }

  return (
    <Group
      id={el.id}
      name="element"
      x={el.x} y={el.y} rotation={el.rotation}
      draggable
      onMouseDown={(e) => { e.cancelBubble = true; onSelect(e); }}
      onTap={(e) => { e.cancelBubble = true; onSelect(e); }}
      onDragStart={onDragStart}
      onDragMove={onDragMove}
      onDragEnd={(e) => { onUpdate({ x: e.target.x(), y: e.target.y() }); onDragEnd?.(e); }}
      onContextMenu={onContextMenu}
      onTransformEnd={(e) => {
        const n = e.target;
        const sx = n.scaleX(); const sy = n.scaleY();
        n.scaleX(1); n.scaleY(1);
        onUpdate({
          x: n.x(), y: n.y(), rotation: n.rotation(),
          width: Math.max(100, el.width * sx),
          height: Math.max(60, el.height * sy),
        });
      }}
    >
      {cells}
      {texts}
    </Group>
  );
};