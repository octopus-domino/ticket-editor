import type { TableElement } from '@/shared/types';
import { getByPath } from './path';
import { tableAxis } from './tableGeometry';

const indexedCell = /^\{\{\s*([\w.]+)\[(\d+)\]([\w.[\]]*)\s*\}\}$/;
const placeholder = /\{\{\s*([\w.[\]]+)\s*\}\}/g;

/** Older tables dropped from a data array stored a header and consecutive indexed copies. */
export function arrayTablePath(table: TableElement): string | undefined {
  if (table.repeatPath) return table.repeatPath;
  const [header, first] = table.data;
  if (!first?.length || first.length !== table.cols || header?.length !== table.cols ||
      header.some(cell => cell.includes('{{')) || table.data.length !== table.rows) return;
  const path = indexedCell.exec(first[0])?.[1];
  if (!path) return;
  const fields = first.map(cell => indexedCell.exec(cell)?.[3]);
  if (table.data.slice(1).every((row, index) => row.length === table.cols && row.every((cell, column) => {
    const match = indexedCell.exec(cell);
    return match?.[1] === path && match[2] === String(index) && match[3] === fields[column];
  }))) return path;
}

type ReadValue = (path: string) => unknown;
type RenderCell = (cell: string, read: ReadValue) => string;

/** Return only item fields that occur in the table, relative to its array binding. */
export function tableArrayFields(table: TableElement, path: string): Set<string> {
  const fields = new Set<string>();
  for (const row of table.data) for (const cell of row) {
    for (const match of cell.matchAll(placeholder)) {
      if (!match[1].startsWith(path + '[')) continue;
      const relative = match[1].slice(path.length).replace(/\[\d+\]/g, '');
      if (relative.startsWith('.')) fields.add(relative.slice(1));
    }
  }
  return fields;
}

/** Resolve into a rendering copy, keeping the editable table template intact. */
export function fillArrayTable(table: TableElement, read: ReadValue, render: RenderCell): boolean {
  const path = arrayTablePath(table);
  if (!path) return false;
  const rows = read(path);
  if (!Array.isArray(rows)) return false;

  const { data, cellStyles } = table;
  const offsets = tableAxis(table.height, table.rows, table.rowHeights);
  const sourceRows = Array.from(rows, (_, index) => index + 1 < table.rows && data[index + 1] ? index + 1 : 1);
  table.data = [
    (data[0] ?? []).map(cell => render(cell, read)),
    ...sourceRows.map((source, index) => {
      const prefix = `${path}[${source - 1}]`;
      return (data[source] ?? []).map(cell => render(cell, field => {
        if (field === prefix) return rows[index];
        if (field.startsWith(prefix + '.') || field.startsWith(prefix + '[')) {
          return getByPath({ row: rows[index] }, 'row' + field.slice(prefix.length));
        }
        return read(field);
      }));
    }),
  ];
  table.rowHeights = [0, ...sourceRows].map(source =>
    offsets[source + 1] === undefined ? offsets[1] : offsets[source + 1] - offsets[source],
  );
  if (cellStyles) table.cellStyles = [0, ...sourceRows].map(source => cellStyles[source] ?? []);
  table.height = table.rowHeights.reduce((sum, height) => sum + height, 0);
  table.rows = table.data.length;
  delete table.repeatPath;
  return true;
}
