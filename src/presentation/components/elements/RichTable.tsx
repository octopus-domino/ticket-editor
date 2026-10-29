import React, { useMemo } from 'react';
import { Group, Rect, Line, Text as KonvaText } from 'react-konva';
import type {
  RichTableData, RichTableCell, PositionedRun, BorderSide,
} from '@/lib/richText/types';
import {
  computeTableLayout, cellPad, measureTableHeight, lineWidth,
  CELL_BLOCK_MARGIN, MAX_NEST_DEPTH, type CellBlockItem,
} from './tableLayout';

export { measureTableHeight };

interface Props {
  data: RichTableData;
  x: number;
  y: number;
  width: number;
  fontFamily: string;
  fallbackFontSize: number;
  fallbackFill: string;
  lineHeightCoef?: number;
  depth?: number;
}

export const RichTable: React.FC<Props> = ({
  data, x, y, width, fontFamily, fallbackFontSize, fallbackFill,
  lineHeightCoef = 1.5, depth = 0,
}) => {
  const layout = useMemo(
    () => computeTableLayout(data, width, fallbackFontSize, lineHeightCoef),
    [data, width, fallbackFontSize, lineHeightCoef],
  );

  if (!data.cells.length) return null;
  const { colOffsets, rowOffsets, cellItems } = layout;

  return (
    <Group x={x} y={y} listening={false}>
      {data.cells.map((cell, i) => (
        <CellBackground
          key={`bg-${i}`}
          cell={cell}
          colOffsets={colOffsets}
          rowOffsets={rowOffsets}
        />
      ))}
      {data.cells.map((cell, i) => (
        <CellContent
          key={`ct-${i}`}
          cell={cell}
          items={cellItems.get(cell)}
          colOffsets={colOffsets}
          rowOffsets={rowOffsets}
          fontFamily={fontFamily}
          fallbackFontSize={fallbackFontSize}
          fallbackFill={fallbackFill}
          lineHeightCoef={lineHeightCoef}
          depth={depth}
        />
      ))}
    </Group>
  );
};

/* ============================================================
   Фон + границы ячейки
   ============================================================ */

const CellBackground: React.FC<{
  cell: RichTableCell;
  colOffsets: number[];
  rowOffsets: number[];
}> = ({ cell, colOffsets, rowOffsets }) => {
  const cx = colOffsets[cell.colIndex];
  const cy = rowOffsets[cell.rowIndex];
  const cw = colOffsets[Math.min(cell.colIndex + cell.colspan, colOffsets.length - 1)] - cx;
  const ch = rowOffsets[Math.min(cell.rowIndex + cell.rowspan, rowOffsets.length - 1)] - cy;

  const fill = resolveFill(cell);
  const sides = resolveSides(cell);

  return (
    <>
      {fill !== 'none' && (
        <Rect x={cx} y={cy} width={cw} height={ch} fill={fill} listening={false} />
      )}
      {sides.top    && <BorderLine side={sides.top}    x1={cx}     y1={cy}     x2={cx + cw} y2={cy} />}
      {sides.right  && <BorderLine side={sides.right}  x1={cx + cw} y1={cy}    x2={cx + cw} y2={cy + ch} />}
      {sides.bottom && <BorderLine side={sides.bottom} x1={cx}     y1={cy + ch} x2={cx + cw} y2={cy + ch} />}
      {sides.left   && <BorderLine side={sides.left}   x1={cx}     y1={cy}     x2={cx}     y2={cy + ch} />}
    </>
  );
};

const BorderLine: React.FC<{
  side: BorderSide;
  x1: number; y1: number; x2: number; y2: number;
}> = ({ side, x1, y1, x2, y2 }) => {
  const dash =
    side.style === 'dashed' ? [4, 4] :
    side.style === 'dotted' ? [2, 3] :
    undefined;

  return (
    <Line
      points={[x1, y1, x2, y2]}
      stroke={side.color || '#cbd5e1'}
      strokeWidth={side.width ?? 1}
      dash={dash}
      listening={false}
      strokeScaleEnabled={false}
      perfectDrawEnabled={false}
    />
  );
};

function isSideVisible(s: BorderSide | undefined): s is BorderSide {
  if (!s) return false;
  if (s.style === 'none') return false;
  return (s.width ?? 1) > 0;
}

function resolveFill(cell: RichTableCell): string {
  if (cell.bgColor === 'transparent') return 'none';
  if (cell.bgColor) return cell.bgColor;
  return cell.isHeader ? '#f1f5f9' : '#ffffff';
}

function resolveSides(cell: RichTableCell): {
  top?: BorderSide;
  right?: BorderSide;
  bottom?: BorderSide;
  left?: BorderSide;
} {
  if (
    isSideVisible(cell.borderTop) ||
    isSideVisible(cell.borderRight) ||
    isSideVisible(cell.borderBottom) ||
    isSideVisible(cell.borderLeft)
  ) {
    return {
      top: isSideVisible(cell.borderTop) ? cell.borderTop : undefined,
      right: isSideVisible(cell.borderRight) ? cell.borderRight : undefined,
      bottom: isSideVisible(cell.borderBottom) ? cell.borderBottom : undefined,
      left: isSideVisible(cell.borderLeft) ? cell.borderLeft : undefined,
    };
  }

  if (
    cell.borderTop !== undefined ||
    cell.borderRight !== undefined ||
    cell.borderBottom !== undefined ||
    cell.borderLeft !== undefined
  ) {
    return {};
  }

  const legacy: BorderSide = {
    color: cell.borderColor || '#cbd5e1',
    width: cell.borderWidth ?? 1,
    style: cell.borderStyle || 'solid',
  };
  if (legacy.width === 0 || legacy.style === 'none') return {};
  return { top: legacy, right: legacy, bottom: legacy, left: legacy };
}

/* ============================================================
   Содержимое ячейки
   ============================================================ */

interface CellContentProps {
  cell: RichTableCell;
  items: CellBlockItem[] | undefined;
  colOffsets: number[];
  rowOffsets: number[];
  fontFamily: string;
  fallbackFontSize: number;
  fallbackFill: string;
  lineHeightCoef: number;
  depth: number;
}

const CellContent: React.FC<CellContentProps> = ({
  cell, items, colOffsets, rowOffsets,
  fontFamily, fallbackFontSize, fallbackFill, lineHeightCoef, depth,
}) => {
  if (!items || !items.length) return null;

  const p = cellPad(cell);
  const cellLeft = colOffsets[cell.colIndex];
  const cellTop = rowOffsets[cell.rowIndex];
  const cellRight = colOffsets[Math.min(cell.colIndex + cell.colspan, colOffsets.length - 1)];
  const cellBottom = rowOffsets[Math.min(cell.rowIndex + cell.rowspan, rowOffsets.length - 1)];

  const innerLeft = cellLeft + p.left;
  const innerRight = cellRight - p.right;
  const innerTop = cellTop + p.top;
  const innerBottom = cellBottom - p.bottom;
  const innerWidth = Math.max(10, innerRight - innerLeft);
  const innerHeight = Math.max(10, innerBottom - innerTop);

  const totalContentHeight =
    items.reduce((sum, it) => sum + it.height, 0) +
    Math.max(0, items.length - 1) * CELL_BLOCK_MARGIN;

  const va = cell.verticalAlign ?? 'top';
  let topY: number;
  if (va === 'middle') {
    topY = innerTop + Math.max(0, (innerHeight - totalContentHeight) / 2);
  } else if (va === 'bottom') {
    topY = innerTop + Math.max(0, innerHeight - totalContentHeight);
  } else {
    topY = innerTop;
  }

  const align = cell.align ?? 'left';
  let cursorY = topY;

  return (
    <>
      {items.map((item, bi) => {
        const blockTop = cursorY;
        cursorY += item.height + CELL_BLOCK_MARGIN;

        if (item.kind === 'text') {
          return (
            <TextLayoutRuns
              key={`t-${bi}`}
              lines={item.layout.lines}
              innerLeft={innerLeft}
              innerWidth={innerWidth}
              y={blockTop}
              align={align}
              bold={cell.isHeader}
              fontFamily={fontFamily}
              fallbackFontSize={fallbackFontSize}
              fallbackFill={fallbackFill}
            />
          );
        }

        if (depth + 1 > MAX_NEST_DEPTH) return null;

        return (
          <RichTable
            key={`nt-${bi}`}
            data={item.data}
            x={innerLeft}
            y={blockTop}
            width={innerWidth}
            fontFamily={fontFamily}
            fallbackFontSize={fallbackFontSize}
            fallbackFill={fallbackFill}
            lineHeightCoef={lineHeightCoef}
            depth={depth + 1}
          />
        );
      })}
    </>
  );
};

interface TextRunsProps {
  lines: PositionedRun[][];
  innerLeft: number;
  innerWidth: number;
  y: number;
  align: 'left' | 'center' | 'right' | 'justify';
  bold: boolean;
  fontFamily: string;
  fallbackFontSize: number;
  fallbackFill: string;
}

const TextLayoutRuns: React.FC<TextRunsProps> = ({
  lines, innerLeft, innerWidth, y, align,
  bold, fontFamily, fallbackFontSize, fallbackFill,
}) => (
  <>
    {lines.map((line, ri) => {
      const lw = lineWidth(line);
      let lineOffsetX = 0;
      if (align === 'center') lineOffsetX = Math.max(0, (innerWidth - lw) / 2);
      else if (align === 'right') lineOffsetX = Math.max(0, innerWidth - lw);

      return line.map((run, rj) => {
        const fs = run.actualFontSize || fallbackFontSize;
        const isBold = bold || run.bold;
        const fontStyle =
          isBold && run.italic ? 'italic bold'
          : isBold ? 'bold'
          : run.italic ? 'italic'
          : 'normal';
        const textDecoration =
          run.underline && run.strike ? 'underline line-through'
          : run.underline ? 'underline'
          : run.strike ? 'line-through'
          : '';

        return (
          <KonvaText
            key={`${ri}-${rj}`}
            x={innerLeft + lineOffsetX + run.x}
            y={y + run.y}
            text={run.text}
            fontSize={fs}
            fontFamily={run.fontFamily || fontFamily}
            fontStyle={fontStyle}
            textDecoration={textDecoration}
            fill={run.color || fallbackFill}
            listening={false}
          />
        );
      });
    })}
  </>
);