/* ============================================================
   lib/richText/types.ts
   ============================================================ */

export interface TextRun {
  text: string;
  bold: boolean;
  italic: boolean;
  underline: boolean;
  strike: boolean;
  color?: string;
  bgColor?: string;
  fontSize?: number;
  fontFamily?: string;
  href?: string;
}

export interface BaseStyle {
  fontSize: number;
  fontFamily: string;
  fontStyle: string;
  textDecoration: string;
  fill: string;
}

export interface PositionedRun extends TextRun {
  x: number;
  y: number;
  width: number;
  actualFontSize: number;
}

export interface LayoutResult {
  lines: PositionedRun[][];
  totalHeight: number;
  lineHeight: number;
}

export interface RichTableCellPadding {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

export type CellAlign = 'left' | 'center' | 'right' | 'justify';
export type CellVerticalAlign = 'top' | 'middle' | 'bottom';

export interface BorderSide {
  color?: string;
  width?: number;
  style?: string;
}

export interface RichTableCell {
  blocks: RichBlock[];
  isHeader: boolean;
  colspan: number;
  rowspan: number;
  rowIndex: number;
  colIndex: number;
  rawWidths: number[] | null;
  bgColor?: string;

  // Per-side borders.
  borderTop?: BorderSide;
  borderRight?: BorderSide;
  borderBottom?: BorderSide;
  borderLeft?: BorderSide;

  // Legacy-поля (для обратной совместимости).
  borderColor?: string;
  borderWidth?: number;
  borderStyle?: string;

  padding?: RichTableCellPadding;
  align?: CellAlign;
  verticalAlign?: CellVerticalAlign;
}

export interface RichTableData {
  cells: RichTableCell[];
  rowCount: number;
  colCount: number;
  colWidths: number[] | null;

  /**
   * Ширина таблицы в редакторе TipTap на момент сохранения HTML,
   * в CSS-пикселях. Записывается из live DOM (`table.getBoundingClientRect().width`)
   * и хранится в `data-editor-width` атрибуте `<table>`.
   *
   * Семантика: `colWidths` — абсолютные пиксели относительно `editorWidth`.
   * На canvas у нас другая `innerWidth` → масштабируем как
   * `colWidths[i] / editorWidth * innerWidth`. Это даёт 1:1 совпадение
   * с визуалом TipTap при любом значении `innerWidth`.
   *
   * Если `undefined` (документ из старых версий) — fallback на эвристику
   * в `resolveColPixelWidths`.
   */
  editorWidth?: number;
}

export type RichBlock =
  | { kind: 'text'; runs: TextRun[] }
  | { kind: 'table'; data: RichTableData };