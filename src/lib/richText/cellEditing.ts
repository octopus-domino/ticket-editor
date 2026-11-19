/** Keeps DOM order identical to the renderer, including cells spanning multiple rows or columns. */
export function richCellDocument(html: string, tableIndex: number, cellIndex: number) {
  const document = new DOMParser().parseFromString(html, 'text/html');
  const tables = Array.from(document.querySelectorAll('table')).filter(table => !table.parentElement?.closest('table'));
  const table = tables[tableIndex];
  const cells = table ? Array.from(table.rows).flatMap(row => Array.from(row.cells)) : [];
  return { document, cell: cells[cellIndex], count: cells.length };
}

/** Changes only cell content, retaining table sizes, spans and neighbouring formatting. */
export function patchRichCell(html: string, tableIndex: number, cellIndex: number, content: string): string {
  const source = richCellDocument(html, tableIndex, cellIndex);
  if (!source.cell) return html;
  source.cell.innerHTML = content;
  return source.document.body.innerHTML;
}
