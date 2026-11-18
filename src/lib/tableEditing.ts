import type { TableElement } from '@/shared/types';
import { tableAxis } from './tableGeometry';
import { layoutRuns } from './richText/layout';

/** Grows only the edited row; following rows retain their sizes and move down. */
export function editTableCell(table: TableElement, row: number, col: number, value: string): Partial<TableElement> {
  const data = table.data.map((cells, index) => index === row
    ? cells.map((text, column) => column === col ? value : text) : [...cells]);
  const xs = tableAxis(table.width, table.cols, table.columnWidths);
  const ys = tableAxis(table.height, table.rows, table.rowHeights);
  const rowHeights = ys.slice(1).map((bottom, index) => bottom - ys[index]);
  const padding = table.cellPadding ?? 6;
  const style = table.cellStyles?.[row]?.[col];
  const fontSize = style?.fontSize ?? table.fontSize;
  const layout = layoutRuns([{ text: value + '\u200b', fontSize,
    fontFamily: style?.fontFamily ?? 'Arial', bold: style?.fontStyle.includes('bold') ?? false,
    italic: style?.fontStyle.includes('italic') ?? false, underline: false, strike: false }],
  Math.max(1, xs[col + 1] - xs[col] - padding * 2), 1);
  rowHeights[row] = Math.max(rowHeights[row], Math.ceil(layout.totalHeight + padding * 2));
  return { data, rowHeights, height: rowHeights.reduce((sum, size) => sum + size, 0) };
}
