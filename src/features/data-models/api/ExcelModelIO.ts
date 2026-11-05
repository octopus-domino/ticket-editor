import { zipSync, unzipSync, strToU8, strFromU8 } from 'fflate';
import type { DataSchema, FieldDef } from '@/features/schemas/domain/DataSchema';
import { flattenFields } from '@/features/schemas/domain/SchemaInference';
import { validateModel, getPath } from '../domain/DataModelValidator';
import type { DataModel } from '../domain/DataModel';
import type { ImportResult, ImportedModel } from './FileModelIO';
import { downloadFile } from '@/shared/files/download';
import { t } from '@/shared/i18n';

const MAX_BYTES = 20 * 1024 * 1024;
const MAX_ROWS = 10_000;
const NAME = '__codoc_name';
const ID = '__codoc_id';
const NS = 'http://schemas.openxmlformats.org/spreadsheetml/2006/main';
const escape = (value: unknown) =>
  String(value ?? '').replace(
    /[&<>"']/g,
    (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' })[char]!,
  );
const safePath = (path: string) =>
  path
    .split('.')
    .every((part) => part && !['__proto__', 'prototype', 'constructor'].includes(part));
function fields(schema: DataSchema): FieldDef[] {
  const flat = flattenFields(schema.fields);
  const arrays = flat.filter((field) => field.type === 'array').map((field) => field.path + '.');
  const result = flat.filter(
    (field) => field.type !== 'object' && !arrays.some((path) => field.path.startsWith(path)),
  );
  if (
    result.length > 500 ||
    result.some((field) => !safePath(field.path) || field.path === NAME || field.path === ID)
  )
    throw new Error(t('Unsupported schema for Excel'));
  return result;
}
function column(index: number): string {
  let value = '';
  for (let number = index + 1; number; number = Math.floor((number - 1) / 26))
    value = String.fromCharCode(65 + ((number - 1) % 26)) + value;
  return value;
}
function worksheet(rows: unknown[][], header = true): string {
  const body = rows
    .map(
      (row, index) =>
        `<row r="${index + 1}">${row
          .map((value, col) => {
            const ref = `${column(col)}${index + 1}`;
            const style = header && index === 0 ? ' s="1"' : '';
            if (typeof value === 'number' && Number.isFinite(value))
              return `<c r="${ref}"${style}><v>${value}</v></c>`;
            if (typeof value === 'boolean')
              return `<c r="${ref}" t="b"${style}><v>${value ? 1 : 0}</v></c>`;
            return `<c r="${ref}" t="inlineStr"${style}><is><t xml:space="preserve">${escape(typeof value === 'object' && value !== null ? JSON.stringify(value) : value)}</t></is></c>`;
          })
          .join('')}</row>`,
    )
    .join('');
  return `<?xml version="1.0" encoding="UTF-8"?><worksheet xmlns="${NS}"><sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews><cols><col min="1" max="501" width="24" customWidth="1"/></cols><sheetData>${body}</sheetData>${rows[0]?.length ? `<autoFilter ref="A1:${column(rows[0].length - 1)}${Math.max(rows.length, 2)}"/>` : ''}</worksheet>`;
}
export function createWorkbook(schema: DataSchema, models: readonly DataModel[] = []): Uint8Array {
  if (models.length > MAX_ROWS || models.some((model) => model.schemaId !== schema.id))
    throw new Error(t('Select data sets from one schema'));
  const schemaFields = fields(schema);
  const sheets: unknown[][][] = [
    [
      [NAME, ID, ...schemaFields.map((field) => field.path)],
      ...models.map((model) => [
        model.name,
        model.id,
        ...schemaFields.map((field) => getPath(model.values, field.path)),
      ]),
    ],
    [
      [t('Field'), t('Label'), t('Type'), t('Required')],
      ...schemaFields.map((field) => [
        field.path,
        field.label || field.path,
        field.type,
        field.required,
      ]),
    ],
    [
      [t('Instructions')],
      [t('Keep column identifiers unchanged. One row creates one data set.')],
      [t('Dates: YYYY-MM-DD. Arrays: JSON. Formulas are not imported.')],
      [t('Empty rows are ignored. Import shows validation errors before saving.')],
      ['schemaId', schema.id],
      ['schemaName', schema.name],
      ['version', '1.0'],
    ],
  ];
  const files: Record<string, Uint8Array> = {
    '[Content_Types].xml': strToU8(
      `<?xml version="1.0"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>${sheets.map((_, index) => `<Override PartName="/xl/worksheets/sheet${index + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join('')}</Types>`,
    ),
    '_rels/.rels': strToU8(
      '<?xml version="1.0"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>',
    ),
    'xl/workbook.xml': strToU8(
      `<?xml version="1.0"?><workbook xmlns="${NS}" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>${['Data', 'Fields', 'Instructions'].map((name, index) => `<sheet name="${name}" sheetId="${index + 1}" r:id="rId${index + 1}"/>`).join('')}</sheets></workbook>`,
    ),
    'xl/_rels/workbook.xml.rels': strToU8(
      `<?xml version="1.0"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${sheets.map((_, index) => `<Relationship Id="rId${index + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${index + 1}.xml"/>`).join('')}<Relationship Id="styles" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`,
    ),
    'xl/styles.xml': strToU8(
      `<?xml version="1.0"?><styleSheet xmlns="${NS}"><fonts count="2"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><name val="Calibri"/></font></fonts><fills count="2"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill></fills><borders count="1"><border/></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="2"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0"/></cellXfs></styleSheet>`,
    ),
  };
  sheets.forEach((rows, index) => {
    files[`xl/worksheets/sheet${index + 1}.xml`] = strToU8(worksheet(rows));
  });
  // Normalize typed arrays across iframe/test realms before fflate classifies archive entries.
  const normalizedFiles = Object.fromEntries(
    Object.entries(files).map(([name, data]) => [name, new Uint8Array(data)]),
  );
  return zipSync(normalizedFiles, { level: 6 });
}
function xml(bytes: Uint8Array | undefined): XMLDocument {
  if (!bytes) throw new Error(t('Invalid Excel workbook'));
  const text = strFromU8(bytes);
  if (/<!DOCTYPE|<!ENTITY/i.test(text)) throw new Error(t('Invalid Excel workbook'));
  const doc = new DOMParser().parseFromString(text, 'application/xml');
  if (doc.querySelector('parsererror')) throw new Error(t('Invalid Excel workbook'));
  return doc;
}
function put(values: Record<string, unknown>, path: string, value: unknown) {
  const parts = path.split('.');
  let target = values;
  parts.slice(0, -1).forEach((part) => {
    if (!target[part] || typeof target[part] !== 'object') target[part] = {};
    target = target[part] as Record<string, unknown>;
  });
  target[parts.at(-1)!] = value;
}
export function readWorkbook(bytes: Uint8Array, schema: DataSchema): ImportResult {
  try {
    if (bytes.length > MAX_BYTES) throw new Error(t('Import exceeds 20 MB'));
    let expanded = 0;
    const files = unzipSync(bytes, {
      filter: (entry) => {
        expanded += entry.originalSize;
        if (expanded > MAX_BYTES || entry.name.includes('..'))
          throw new Error(t('Workbook is too large'));
        return /^(xl\/|\[Content_Types\])/.test(entry.name);
      },
    });
    if (Object.keys(files).some((name) => /vbaProject|externalLinks/i.test(name)))
      throw new Error(t('Macros and external links are not supported'));
    const book = xml(files['xl/workbook.xml']);
    const rels = xml(files['xl/_rels/workbook.xml.rels']);
    const sheet =
      Array.from(book.getElementsByTagName('sheet')).find(
        (item) => item.getAttribute('name') === 'Data',
      ) ?? book.getElementsByTagName('sheet')[0];
    const relationship = Array.from(rels.getElementsByTagName('Relationship')).find(
      (item) => item.getAttribute('Id') === sheet?.getAttribute('r:id'),
    );
    const target = relationship?.getAttribute('Target') ?? '';
    if (!target || target.includes('..') || relationship?.getAttribute('TargetMode') === 'External')
      throw new Error(t('Invalid Excel workbook'));
    const sheetPath = target.startsWith('/') ? target.slice(1) : `xl/${target}`;
    const rows = Array.from(xml(files[sheetPath]).getElementsByTagName('row'));
    if (rows.length > MAX_ROWS + 1) throw new Error(t('Maximum 10000 rows'));
    const shared = files['xl/sharedStrings.xml']
      ? Array.from(xml(files['xl/sharedStrings.xml']).getElementsByTagName('si')).map(
          (item) => item.textContent ?? '',
        )
      : [];
    const readRow = (row: Element) => {
      const values: unknown[] = [];
      for (const cell of Array.from(row.getElementsByTagName('c'))) {
        if (cell.getElementsByTagName('f').length) throw new Error(t('Formulas are not imported'));
        const letters = cell.getAttribute('r')?.match(/^[A-Z]+/)?.[0] ?? '';
        let index = 0;
        for (const letter of letters) index = index * 26 + letter.charCodeAt(0) - 64;
        if (!index || index > 502) throw new Error(t('Maximum 500 fields'));
        const type = cell.getAttribute('t');
        const raw = cell.getElementsByTagName('v')[0]?.textContent ?? '';
        values[index - 1] =
          type === 's'
            ? (shared[Number(raw)] ?? '')
            : type === 'inlineStr'
              ? (cell.getElementsByTagName('is')[0]?.textContent ?? '')
              : type === 'b'
                ? raw === '1'
                : raw;
      }
      return values;
    };
    if (!rows.length) throw new Error(t('Empty workbook'));
    const headers = readRow(rows[0]).map(String);
    const schemaFields = fields(schema);
    const byPath = new Map(schemaFields.map((field) => [field.path, field]));
    if (
      new Set(headers).size !== headers.length ||
      headers.some((header) => header !== NAME && header !== ID && !byPath.has(header))
    )
      throw new Error(t('Column identifiers do not match the schema'));
    for (const field of schemaFields)
      if (field.required && !headers.includes(field.path))
        throw new Error(`${t('Missing required column')}: ${field.path}`);
    const issues: { index: number; message: string }[] = [];
    const models: ImportedModel[] = [];
    let structuralErrors = false;
    const date1904 = book.getElementsByTagName('workbookPr')[0]?.getAttribute('date1904') === '1';
    rows.slice(1).forEach((row, rowIndex) => {
      try {
        const cells = readRow(row);
        if (cells.every((value) => value === '' || value === undefined)) return;
        const values: Record<string, unknown> = {};
        headers.forEach((path, col) => {
          if (path === NAME || path === ID) return;
          const field = byPath.get(path)!;
          const raw = cells[col];
          if (raw === '' || raw === undefined) return;
          let value: unknown = raw;
          if (field.type === 'number') {
            const numeric = Number(raw);
            value = Number.isFinite(numeric) ? numeric : raw;
          }
          if (field.type === 'boolean') {
            if (typeof raw === 'boolean') value = raw;
            else if (/^(true|1)$/i.test(String(raw))) value = true;
            else if (/^(false|0)$/i.test(String(raw))) value = false;
          }
          if (field.type === 'date' && /^\d+(\.\d+)?$/.test(String(raw)))
            value = new Date((Number(raw) - (date1904 ? 24107 : 25569)) * 86400000)
              .toISOString()
              .slice(0, 10);
          if (field.type === 'array') {
            try {
              value = JSON.parse(String(raw)) as unknown;
            } catch {
              value = raw;
            }
          }
          put(values, path, value);
        });
        const model = {
          id: String(cells[headers.indexOf(ID)] ?? '').trim(),
          schemaId: schema.id,
          name:
            String(cells[headers.indexOf(NAME)] ?? '').trim() || `${t('Data set')} ${rowIndex + 1}`,
          values,
          createdAt: '',
          updatedAt: '',
        };
        const errors = validateModel(model, schema);
        if (errors.length)
          issues.push({
            index: Number(row.getAttribute('r')) || rowIndex + 2,
            message: errors.map((error) => `${error.path}: ${error.message}`).join('; '),
          });
        models.push(model);
      } catch (error) {
        structuralErrors = true;
        issues.push({
          index: Number(row.getAttribute('r')) || rowIndex + 2,
          message: (error as Error).message,
        });
      }
    });
    return {
      ok: models.length > 0 && issues.length === 0,
      repairable: !structuralErrors && models.length > 0,
      schemaId: schema.id,
      models,
      issues,
    };
  } catch (error) {
    return { ok: false, issues: [{ index: 0, message: (error as Error).message }] };
  }
}
export function downloadWorkbook(schema: DataSchema, models: readonly DataModel[] = []) {
  const data = createWorkbook(schema, models);
  downloadFile(
    new Blob([data], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }),
    `${schema.name}${models.length ? '-data' : '-template'}.xlsx`,
  );
}
