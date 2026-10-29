/* ============================================================
   lib/richText/tableLayout.ts
   ============================================================ */

import type {
  RichTableData, RichTableCell, RichTableCellPadding, RichBlock,
} from './types';
import { layoutRuns } from './layout';

export const CELL_PADDING_DEFAULT: RichTableCellPadding =
  { top: 8, right: 10, bottom: 8, left: 10 };

const MIN_ROW_HEIGHT = 12;
export const CELL_BLOCK_MARGIN = 8;
export const MAX_NEST_DEPTH = 4;

export type CellBlockItem =
  | { kind: 'text'; layout: ReturnType<typeof layoutRuns>; height: number }
  | { kind: 'table'; data: RichTableData; height: number; width: number };

export interface TableLayout {
  colOffsets: number[];
  rowOffsets: number[];
  cellItems: Map<RichTableCell, CellBlockItem[]>;
  totalHeight: number;
  totalWidth: number;
}

export function cellPad(cell: RichTableCell): RichTableCellPadding {
  return cell.padding ?? CELL_PADDING_DEFAULT;
}

export function lineWidth(line: { width: number }[]): number {
  let w = 0;
  for (const r of line) w += r.width;
  return w;
}

export function computeTableLayout(
  data: RichTableData,
  width: number,
  fallbackFontSize: number,
  lineHeightCoef: number,
): TableLayout {
  const { cells, rowCount, colCount } = data;
  const colPixelWidths = resolveColPixelWidths(data, width, colCount);
  const colOffsets = buildOffsets(colPixelWidths);

  const { cellItems, cellNaturalHeights } = measureCells(
    cells, colOffsets, colCount, fallbackFontSize, lineHeightCoef,
  );
  const rowHeights = resolveRowHeights(cells, rowCount, cellNaturalHeights);
  const rowOffsets = buildOffsets(rowHeights);

  return {
    colOffsets,
    rowOffsets,
    cellItems,
    totalHeight: rowOffsets[rowOffsets.length - 1] ?? 0,
    totalWidth: colOffsets[colOffsets.length - 1] ?? 0,
  };
}

export function measureTableHeight(
  data: RichTableData, width: number,
  fallbackFontSize: number, lineHeightCoef: number,
): number {
  if (!data.cells.length) return 0;
  return computeTableLayout(data, width, fallbackFontSize, lineHeightCoef).totalHeight;
}

export function measureTableWidth(
  data: RichTableData, width: number,
  fallbackFontSize: number, lineHeightCoef: number,
): number {
  if (!data.cells.length) return 0;
  return computeTableLayout(data, width, fallbackFontSize, lineHeightCoef).totalWidth;
}

/**
 * Ширины колонок в пикселях для рендера на canvas.
 *
 * Логика зеркалит `normalizeWidths` из tableSync.ts:
 *   • сумма пустая → равные доли;
 *   • есть auto-колонки и sumExplicit < innerWidth → auto берут остаток;
 *   • есть auto-колонки и sumExplicit ≥ innerWidth → ужать, auto — резерв;
 *   • все явные и sum ≤ innerWidth → оставить (таблица уже элемента);
 *   • все явные и sum > innerWidth → ужать пропорционально.
 */
function resolveColPixelWidths(
  data: RichTableData,
  totalWidth: number,
  colCount: number,
): number[] {
  const { colWidths } = data;
  if (!colWidths || colWidths.length !== colCount) {
    return Array(colCount).fill(totalWidth / colCount);
  }

  const clean = colWidths.map((w) => (typeof w === 'number' && w > 0 ? w : 0));
  const sum = clean.reduce((a, b) => a + b, 0);
  const zeroCount = clean.filter((w) => w === 0).length;

  if (sum <= 0 && zeroCount === clean.length) {
    return Array(colCount).fill(totalWidth / colCount);
  }

  if (zeroCount > 0) {
    if (sum >= totalWidth) {
      const autoReserve = Math.min(totalWidth * 0.3, 60 * zeroCount);
      const explicitBudget = Math.max(1, totalWidth - autoReserve);
      return clean.map((w) =>
        w > 0 ? (w / sum) * explicitBudget : autoReserve / zeroCount,
      );
    }
    const remaining = totalWidth - sum;
    const auto = remaining / zeroCount;
    return clean.map((w) => (w > 0 ? w : auto));
  }

  if (sum > totalWidth) {
    return clean.map((w) => (w / sum) * totalWidth);
  }
  return clean;
}

function buildOffsets(widths: number[]): number[] {
  const offsets = [0];
  for (let i = 0; i < widths.length; i++) offsets.push(offsets[i] + widths[i]);
  return offsets;
}

function measureCells(
  cells: RichTableCell[], colOffsets: number[], colCount: number,
  fallbackFontSize: number, lineHeightCoef: number,
): {
  cellItems: Map<RichTableCell, CellBlockItem[]>;
  cellNaturalHeights: Map<RichTableCell, number>;
} {
  const cellItems = new Map<RichTableCell, CellBlockItem[]>();
  const cellNaturalHeights = new Map<RichTableCell, number>();

  for (const cell of cells) {
    const p = cellPad(cell);
    const cw = colOffsets[Math.min(cell.colIndex + cell.colspan, colCount)]
             - colOffsets[cell.colIndex];
    const innerW = Math.max(10, cw - p.left - p.right);
    const items = measureCellContent(cell, innerW, fallbackFontSize, lineHeightCoef);
    const contentHeight = items.reduce((sum, it) => sum + it.height, 0)
      + Math.max(0, items.length - 1) * CELL_BLOCK_MARGIN;
    const minCellHeight = fallbackFontSize * lineHeightCoef + p.top + p.bottom;

    cellItems.set(cell, items);
    cellNaturalHeights.set(cell, Math.max(MIN_ROW_HEIGHT, minCellHeight, contentHeight + p.top + p.bottom));
  }
  return { cellItems, cellNaturalHeights };
}

function measureCellContent(
  cell: RichTableCell, innerWidth: number,
  fallbackFontSize: number, lineHeightCoef: number,
): CellBlockItem[] {
  const items: CellBlockItem[] = [];
  for (const block of cell.blocks as RichBlock[]) {
    if (block.kind === 'text') {
      const layout = layoutRuns(block.runs, innerWidth, lineHeightCoef);
      items.push({ kind: 'text', layout, height: layout.totalHeight });
    } else {
      const tl = computeTableLayout(block.data, innerWidth, fallbackFontSize, lineHeightCoef);
      items.push({ kind: 'table', data: block.data, height: tl.totalHeight, width: tl.totalWidth });
    }
  }
  return items;
}

function resolveRowHeights(
  cells: RichTableCell[], rowCount: number,
  cellNaturalHeights: Map<RichTableCell, number>,
): number[] {
  const rowHeights: number[] = new Array(rowCount).fill(MIN_ROW_HEIGHT);

  for (const cell of cells) {
    if (cell.rowspan !== 1) continue;
    const h = cellNaturalHeights.get(cell) ?? 0;
    if (h > rowHeights[cell.rowIndex]) rowHeights[cell.rowIndex] = h;
  }

  for (let iter = 0; iter < 10; iter++) {
    let changed = false;
    for (const cell of cells) {
      if (cell.rowspan <= 1) continue;
      const need = cellNaturalHeights.get(cell) ?? 0;
      let have = 0;
      for (let r = cell.rowIndex; r < cell.rowIndex + cell.rowspan; r++) {
        have += rowHeights[r] ?? 0;
      }
      if (have + 0.5 < need) {
        const delta = (need - have) / cell.rowspan;
        for (let r = cell.rowIndex; r < cell.rowIndex + cell.rowspan; r++) {
          rowHeights[r] = (rowHeights[r] ?? 0) + delta;
        }
        changed = true;
      }
    }
    if (!changed) break;
  }
  return rowHeights;
}