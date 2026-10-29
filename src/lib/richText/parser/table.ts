import type {
  BaseStyle, CellAlign, CellVerticalAlign, BorderSide,
  RichTableCell, RichTableCellPadding, RichTableData, RichBlock,
} from '../types';

export type ParseCellBlocksFn = (cellEl: HTMLElement, base: BaseStyle) => RichBlock[];

export function parseTableEl(
  table: HTMLElement,
  base: BaseStyle,
  parseCellBlocks: ParseCellBlocksFn,
): RichTableData | null {
  if (!table) return null;

  const trList = Array.from(
    table.querySelectorAll(
      ':scope > thead > tr, :scope > tbody > tr, :scope > tfoot > tr, :scope > tr',
    ),
  );

  const cells: RichTableCell[] = [];
  const grid: (RichTableCell | null)[][] = [];

  const ensureRow = (r: number) => { while (grid.length <= r) grid.push([]); };
  const isOccupied = (r: number, c: number): boolean => {
    const row = grid[r];
    if (!row) return false;
    return row[c] !== undefined && row[c] !== null;
  };

  trList.forEach((tr, r) => {
    ensureRow(r);
    let c = 0;
    while (isOccupied(r, c)) c++;

    const cellEls = Array.from(tr.childNodes).filter(
      (ch): ch is HTMLElement =>
        ch.nodeType === Node.ELEMENT_NODE &&
        ((ch as HTMLElement).tagName.toLowerCase() === 'td' ||
          (ch as HTMLElement).tagName.toLowerCase() === 'th'),
    );

    for (const cellEl of cellEls) {
      while (isOccupied(r, c)) c++;

      const colspan = Math.max(1, parseInt(cellEl.getAttribute('colspan') || '1', 10) || 1);
      const rowspan = Math.max(1, parseInt(cellEl.getAttribute('rowspan') || '1', 10) || 1);
      const isHeader = cellEl.tagName.toLowerCase() === 'th';

      const cell: RichTableCell = {
        blocks: parseCellBlocks(cellEl, base),
        isHeader,
        colspan,
        rowspan,
        rowIndex: r,
        colIndex: c,
        rawWidths: parseRawWidths(cellEl),
        bgColor: cellEl.style.backgroundColor || undefined,

        borderTop:    parseBorderSide(cellEl, 'top'),
        borderRight:  parseBorderSide(cellEl, 'right'),
        borderBottom: parseBorderSide(cellEl, 'bottom'),
        borderLeft:   parseBorderSide(cellEl, 'left'),

        borderColor: cellEl.style.borderColor || undefined,
        borderWidth: parseFloatOrUndef(cellEl.style.borderWidth),
        borderStyle: cellEl.style.borderStyle || undefined,

        padding: parsePadding(cellEl),
        align: readCellAlign(cellEl, isHeader),
        verticalAlign: readCellVerticalAlign(cellEl),
      };
      cells.push(cell);

      for (let rr = 0; rr < rowspan; rr++) {
        ensureRow(r + rr);
        for (let cc = 0; cc < colspan; cc++) {
          grid[r + rr][c + cc] = cell;
        }
      }
      c += colspan;
    }
  });

  let colCount = 0;
  for (const row of grid) {
    if (!row) continue;
    for (let i = row.length - 1; i >= 0; i--) {
      if (row[i] !== undefined && row[i] !== null) {
        if (i + 1 > colCount) colCount = i + 1;
        break;
      }
    }
  }
  if (colCount === 0) colCount = 1;

  const colWidths = resolveColWidths(table, cells, colCount);

  /* Читаем editorWidth из data-editor-width, если он есть. */
  const editorWidthAttr = table.getAttribute('data-editor-width');
  let editorWidth: number | undefined;
  if (editorWidthAttr) {
    const n = parseFloat(editorWidthAttr);
    if (Number.isFinite(n) && n > 0) editorWidth = n;
  }

  return { cells, rowCount: grid.length, colCount, colWidths, editorWidth };
}

/* ---------- helpers (без изменений) ---------- */

function parseBorderSide(el: HTMLElement, side: 'top' | 'right' | 'bottom' | 'left'): BorderSide | undefined {
  const s = el.style;
  const color = s.getPropertyValue(`border-${side}-color`) || undefined;
  const widthStr = s.getPropertyValue(`border-${side}-width`) || undefined;
  const style = s.getPropertyValue(`border-${side}-style`) || undefined;

  if (!color && !widthStr && !style) {
    const commonColor = s.borderColor || undefined;
    const commonWidth = s.borderWidth || undefined;
    const commonStyle = s.borderStyle || undefined;
    if (!commonColor && !commonWidth && !commonStyle) return undefined;

    return {
      color: commonColor,
      width: parseFloatOrUndef(commonWidth),
      style: commonStyle,
    };
  }

  return {
    color,
    width: parseFloatOrUndef(widthStr),
    style,
  };
}

const ALIGN_VALUES: CellAlign[] = ['left', 'center', 'right', 'justify'];

function normalizeAlign(v: string | undefined): CellAlign | null {
  const s = (v || '').toLowerCase().trim();
  if (s === 'start') return 'left';
  if (s === 'end') return 'right';
  if (ALIGN_VALUES.includes(s as CellAlign)) return s as CellAlign;
  return null;
}

function readCellAlign(cellEl: HTMLElement, _isHeader: boolean): CellAlign {
  const onCell = normalizeAlign(cellEl.style.textAlign);
  if (onCell) return onCell;
  const firstBlock = cellEl.querySelector(':scope > p, :scope > h1, :scope > h2, :scope > h3, :scope > div, :scope > blockquote, :scope > li') as HTMLElement | null;
  if (firstBlock) {
    const fromBlock = normalizeAlign(firstBlock.style.textAlign);
    if (fromBlock) return fromBlock;
  }
  const anyAligned = cellEl.querySelector('[style*="text-align"]') as HTMLElement | null;
  if (anyAligned) {
    const fromAny = normalizeAlign(anyAligned.style.textAlign);
    if (fromAny) return fromAny;
  }
  return 'left';
}

function readCellVerticalAlign(cellEl: HTMLElement): CellVerticalAlign {
  const onCell = (cellEl.style.verticalAlign || '').toLowerCase().trim();
  if (onCell === 'middle' || onCell === 'center') return 'middle';
  if (onCell === 'bottom') return 'bottom';
  if (onCell === 'top' || onCell === 'baseline') return 'top';
  const firstBlock = cellEl.firstElementChild as HTMLElement | null;
  if (firstBlock) {
    const v = (firstBlock.style.verticalAlign || '').toLowerCase().trim();
    if (v === 'middle' || v === 'center') return 'middle';
    if (v === 'bottom') return 'bottom';
  }
  return 'top';
}

function resolveColWidths(table: HTMLElement, cells: RichTableCell[], colCount: number): number[] | null {
  const fromCells = readCellWidths(cells, colCount);
  if (fromCells) return fromCells;
  const fromColgroup = readColgroup(table, colCount);
  if (fromColgroup && fromColgroup.hasRealWidth) return fromColgroup.widths;
  if (fromColgroup) return fromColgroup.widths;
  return null;
}

function findColgroup(table: HTMLElement): Element | null {
  for (const child of Array.from(table.children)) {
    if (child.tagName.toLowerCase() === 'colgroup') return child;
  }
  return null;
}

function readColgroup(table: HTMLElement, colCount: number): { widths: number[]; hasRealWidth: boolean } | null {
  const colgroup = findColgroup(table);
  if (!colgroup) return null;
  const colEls = Array.from(colgroup.children).filter(c => c.tagName.toLowerCase() === 'col') as HTMLElement[];
  if (colEls.length !== colCount) return null;
  const widths: number[] = new Array(colCount).fill(0);
  let hasRealWidth = false;
  colEls.forEach((colEl, i) => {
    const w = parseFloat(colEl.style.width);
    const aw = parseFloat(colEl.getAttribute('width') || '');
    if (!Number.isNaN(w) && w > 0) { widths[i] = w; hasRealWidth = true; }
    else if (!Number.isNaN(aw) && aw > 0) { widths[i] = aw; hasRealWidth = true; }
  });
  return { widths, hasRealWidth };
}

function readCellWidths(cells: RichTableCell[], colCount: number): number[] | null {
  const widths: number[] = new Array(colCount).fill(0);
  let any = false;
  for (const cell of cells) {
    if (!cell.rawWidths || !cell.rawWidths.length) continue;
    if (cell.rawWidths.length === cell.colspan) {
      for (let i = 0; i < cell.colspan; i++) {
        const col = cell.colIndex + i;
        if (col < colCount && widths[col] === 0) { widths[col] = cell.rawWidths[i]; any = true; }
      }
    } else if (cell.rawWidths.length === 1) {
      if (widths[cell.colIndex] === 0) { widths[cell.colIndex] = cell.rawWidths[0]; any = true; }
    }
  }
  return any ? widths : null;
}

function parseFloatOrUndef(v: string | null | undefined): number | undefined {
  if (!v) return undefined;
  const n = parseFloat(v);
  return Number.isNaN(n) ? undefined : n;
}

export function parsePadding(el: HTMLElement): RichTableCellPadding | undefined {
  const s = el.style;
  if (!s) return undefined;
  const top = parseFloat(s.paddingTop), right = parseFloat(s.paddingRight), bottom = parseFloat(s.paddingBottom), left = parseFloat(s.paddingLeft);
  const anySide = [top, right, bottom, left].some((n) => !Number.isNaN(n));
  let p: RichTableCellPadding | null = null;
  if (anySide) {
    p = { top: Number.isNaN(top) ? 0 : top, right: Number.isNaN(right) ? 0 : right, bottom: Number.isNaN(bottom) ? 0 : bottom, left: Number.isNaN(left) ? 0 : left };
  }
  const shorthand = s.padding;
  if (shorthand) {
    const parts = shorthand.trim().split(/\s+/).map((x) => parseFloat(x) || 0);
    if (parts.length === 1) p = { top: parts[0], right: parts[0], bottom: parts[0], left: parts[0] };
    else if (parts.length === 2) p = { top: parts[0], right: parts[1], bottom: parts[0], left: parts[1] };
    else if (parts.length === 3) p = { top: parts[0], right: parts[1], bottom: parts[2], left: parts[1] };
    else if (parts.length >= 4) p = { top: parts[0], right: parts[1], bottom: parts[2], left: parts[3] };
  }
  return p ?? undefined;
}

function parseRawWidths(cellEl: HTMLElement): number[] | null {
  const fromAttr = cellEl.getAttribute('colwidth');
  if (fromAttr && fromAttr !== 'null') {
    const arr = fromAttr.split(',').map((x) => parseFloat(x.trim())).filter((n) => !Number.isNaN(n) && n > 0);
    if (arr.length) return arr;
  }
  const sw = cellEl.style?.width;
  if (sw) {
    const n = parseFloat(sw);
    if (!Number.isNaN(n) && n > 0) return [n];
  }
  return null;
}