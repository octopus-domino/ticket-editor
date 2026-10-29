/* ============================================================
   lib/richText/tableSync.ts
   ============================================================ */

const TABLE_SELECTOR = 'table';

/**
 * Пересчитать ширины всех таблиц по live DOM.
 *
 * maxWidth — максимальная ширина (innerWidth элемента). Если таблица
 * шире — ужимаем пропорционально. Это защищает от накопления «лишних»
 * пикселей при многократном сохранении, из-за которых на канве
 * таблица растягивалась до 100%, а при повторном входе в редактор
 * появлялся горизонтальный скролл.
 *
 * Ширины читаются из <colgroup> live DOM (TipTap генерирует его из
 * colwidth ячеек — это «правда», которую выставил пользователь),
 * а не из getBoundingClientRect(): у ячейки border-collapse + border-box
 * rect включает padding, а colwidth — только ширину колонки. Разница
 * × N при каждом сохранении давала накопление.
 */
export function serializeRichHtml(
  liveRoot: HTMLElement,
  html: string,
  maxWidth?: number,
): string {
  if (!html.includes('<table')) return html;

  const liveTables = liveRoot.querySelectorAll(TABLE_SELECTOR);
  if (liveTables.length === 0) return html;

  const doc = new DOMParser().parseFromString(html, 'text/html');
  const parsedTables = doc.querySelectorAll(TABLE_SELECTOR);
  if (liveTables.length !== parsedTables.length) return html;

  const hasLimit = typeof maxWidth === 'number' && Number.isFinite(maxWidth) && maxWidth > 0;

  for (let i = 0; i < liveTables.length; i++) {
    const live = liveTables[i];
    const parsed = parsedTables[i];

    let colWidths = measureLiveColumnWidths(live);
    if (!colWidths.length) continue;

    if (hasLimit) {
      const sum = colWidths.reduce((a, b) => a + b, 0);
      if (sum > maxWidth) {
        const k = maxWidth / sum;
        colWidths = colWidths.map((w) => w * k);
      }
    }

    const target = Math.round(colWidths.reduce((a, b) => a + b, 0));
    const rounded = roundWithCorrection(colWidths, target);
    applyColumnWidths(parsed, rounded, doc);
  }

  return doc.body.innerHTML;
}

/**
 * Нормализовать ширины всех таблиц в HTML под заданную ширину
 * контейнера. Используется при ЗАГРУЗКЕ в редактор.
 */
export function normalizeTableWidthsInHtml(html: string, targetWidth: number): string {
  if (!html.includes('<table')) return html;
  if (!Number.isFinite(targetWidth) || targetWidth <= 0) return html;

  const doc = new DOMParser().parseFromString(html, 'text/html');
  const tables = doc.querySelectorAll(TABLE_SELECTOR);

  for (const table of Array.from(tables)) {
    const widths = readTableColumnWidths(table);
    if (!widths.length) continue;

    const finalWidths = normalizeWidths(widths, targetWidth);
    const targetSum = Math.round(finalWidths.reduce((a, b) => a + b, 0));
    const rounded = roundWithCorrection(finalWidths, targetSum);
    applyColumnWidths(table, rounded, doc);
  }

  return doc.body.innerHTML;
}

/* ============================================================
   Внутренние хелперы
   ============================================================ */

function normalizeWidths(widths: number[], targetWidth: number): number[] {
  const clean = widths.map((w) => (w > 0 ? w : 0));
  const sum = clean.reduce((a, b) => a + b, 0);
  const zeroCount = clean.filter((w) => w === 0).length;

  if (sum <= 0 && zeroCount === widths.length) {
    return Array(widths.length).fill(targetWidth / widths.length);
  }

  if (zeroCount > 0) {
    if (sum >= targetWidth) {
      const autoReserve = Math.min(targetWidth * 0.3, 60 * zeroCount);
      const explicitBudget = Math.max(1, targetWidth - autoReserve);
      return clean.map((w) =>
        w > 0 ? (w / sum) * explicitBudget : autoReserve / zeroCount,
      );
    }
    const remaining = targetWidth - sum;
    const auto = remaining / zeroCount;
    return clean.map((w) => (w > 0 ? w : auto));
  }

  if (sum > targetWidth) {
    return clean.map((w) => (w / sum) * targetWidth);
  }
  return clean;
}

/**
 * Ширины колонок из live DOM.
 *
 * Приоритет 1: <colgroup> — TipTap рендерит его из colwidth ячеек,
 * это чистая ширина колонки без padding. Стабильна между
 * сохранениями.
 *
 * Приоритет 2: getBoundingClientRect() ячеек — только fallback для
 * случая, когда colgroup отсутствует (старая версия TipTap или
 * нестандартный HTML).
 */
function measureLiveColumnWidths(live: HTMLElement): number[] {
  const colgroup = live.querySelector(':scope > colgroup');
  if (colgroup) {
    const cols = Array.from(colgroup.querySelectorAll(':scope > col'));
    const widths = cols.map((col) => {
      const el = col as HTMLElement;
      const sw = parseFloat(el.style.width || '0');
      const w = parseFloat(el.getAttribute('width') || '0');
      return sw > 0 ? sw : w > 0 ? w : 0;
    });
    if (widths.length > 0 && widths.every((w) => w > 0)) return widths;
  }

  const firstRow = live.querySelector(
    ':scope > thead > tr, :scope > tbody > tr, :scope > tr',
  );
  if (!firstRow) return [];

  const cellEls = Array.from(firstRow.children).filter(
    (c): c is HTMLElement =>
      c.tagName.toLowerCase() === 'td' || c.tagName.toLowerCase() === 'th',
  );

  const out: number[] = [];
  for (const cell of cellEls) {
    const w = cell.getBoundingClientRect().width;
    if (!Number.isFinite(w) || w <= 0) continue;
    const colspan = Math.max(1, parseInt(cell.getAttribute('colspan') || '1', 10) || 1);
    const perCol = w / colspan;
    for (let c = 0; c < colspan; c++) out.push(perCol);
  }
  return out;
}

function readTableColumnWidths(table: HTMLElement): number[] {
  const colgroup = table.querySelector(':scope > colgroup');
  if (colgroup) {
    const cols = Array.from(colgroup.querySelectorAll('col')) as HTMLElement[];
    const widths = cols.map((c) => {
      const sw = parseFloat(c.style.width || '0');
      const w = parseFloat(c.getAttribute('width') || '0');
      return sw > 0 ? sw : w > 0 ? w : 0;
    });
    if (widths.length > 0 && widths.some((w) => w > 0)) return widths;
  }

  const firstRow = table.querySelector(
    ':scope > thead > tr, :scope > tbody > tr, :scope > tr',
  );
  if (!firstRow) return [];

  const out: number[] = [];
  for (const cell of Array.from(firstRow.children)) {
    const tag = cell.tagName.toLowerCase();
    if (tag !== 'td' && tag !== 'th') continue;
    const cellEl = cell as HTMLElement;
    const cw = parseFloat(cellEl.getAttribute('colwidth') || '0');
    const colspan = Math.max(1, parseInt(cellEl.getAttribute('colspan') || '1', 10) || 1);
    const w = cw > 0 ? cw / colspan : 0;
    for (let c = 0; c < colspan; c++) out.push(w);
  }
  return out;
}

function applyColumnWidths(table: HTMLElement, rounded: number[], doc: Document): void {
  table.querySelectorAll(':scope > colgroup').forEach((cg) => cg.remove());

  const colgroup = doc.createElement('colgroup');
  for (const w of rounded) {
    const col = doc.createElement('col');
    col.setAttribute('style', `width: ${w}px`);
    col.setAttribute('width', String(w));
    colgroup.appendChild(col);
  }
  table.insertBefore(colgroup, table.firstChild);

  const totalWidth = rounded.reduce((a, b) => a + b, 0);
  stripAndSetWidth(table, totalWidth);

  const ownRows = table.querySelectorAll(
    ':scope > thead > tr, :scope > tbody > tr, :scope > tfoot > tr, :scope > tr',
  );
  for (const tr of Array.from(ownRows)) {
    let colIdx = 0;
    for (const child of Array.from(tr.children)) {
      const tag = child.tagName.toLowerCase();
      if (tag !== 'td' && tag !== 'th') continue;
      const cellEl = child as HTMLElement;
      const colspan = Math.max(1, parseInt(cellEl.getAttribute('colspan') || '1', 10) || 1);

      let sumW = 0;
      for (let c = 0; c < colspan && colIdx + c < rounded.length; c++) {
        sumW += rounded[colIdx + c];
      }
      if (sumW > 0) {
        cellEl.setAttribute('colwidth', String(sumW));
        stripAndSetWidth(cellEl, sumW);
      }
      colIdx += colspan;
    }
  }
}

function roundWithCorrection(widths: number[], target: number): number[] {
  const rounded = widths.map((w) => Math.round(w));
  let diff = target - rounded.reduce((a, b) => a + b, 0);
  while (diff !== 0 && rounded.length > 0) {
    let maxIdx = 0;
    for (let i = 1; i < rounded.length; i++) if (rounded[i] > rounded[maxIdx]) maxIdx = i;
    const step = diff > 0 ? 1 : -1;
    if (rounded[maxIdx] + step < 1) break;
    rounded[maxIdx] += step;
    diff -= step;
  }
  return rounded;
}

function stripAndSetWidth(el: HTMLElement, px: number): void {
  const existing = el.getAttribute('style') || '';
  const stripped = existing
    .split(';')
    .map((s) => s.trim())
    .filter((s) => s && !/^width\s*:/i.test(s))
    .join('; ');
  el.setAttribute('style', `${stripped ? stripped + '; ' : ''}width: ${px}px;`);
}