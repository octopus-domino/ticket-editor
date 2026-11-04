import { describe, expect, it } from 'vitest';
import { createWorkbook, readWorkbook } from '@/features/data-models/api/ExcelModelIO';
import { zipSync, unzipSync, strToU8, strFromU8 } from 'fflate';
import type { DataSchema } from '@/features/schemas/domain/DataSchema';

const schema: DataSchema = { id: 'S', name: 'People', createdAt: '', updatedAt: '', fields: [
  { path: 'name', type: 'string', required: true, label: 'Name' },
  { path: 'person.code', type: 'string', required: true },
  { path: 'amount', type: 'number', required: true },
  { path: 'active', type: 'boolean', required: true },
  { path: 'date', type: 'date', required: false },
  { path: 'items', type: 'array', required: false },
] };
const model = { id: 'M', schemaId: 'S', name: 'Person 1', createdAt: '', updatedAt: '', values: { name: '=NOT_A_FORMULA', person: { code: '00001234567890123456' }, amount: 123.45, active: false, date: '2026-11-04', items: [{ name: 'A', quantity: 2 }] } };
function editWorkbook(change: (xml: string) => string) {
  const files = unzipSync(createWorkbook(schema, [model]));
  files['xl/worksheets/sheet1.xml'] = new Uint8Array(strToU8(change(strFromU8(files['xl/worksheets/sheet1.xml']))));
  return zipSync(files);
}
describe('Excel interchange', () => {
  it('writes an actual OpenXML workbook and preserves identifiers, booleans, numbers, arrays and nested fields', () => {
    const bytes = createWorkbook(schema, [model]);
    expect(Array.from(bytes.slice(0, 2))).toEqual([80, 75]);
    const files = unzipSync(bytes);
    expect(Object.keys(files)).toContain('[Content_Types].xml');
    expect(Object.keys(files)).toContain('xl/worksheets/sheet3.xml');
    const result = readWorkbook(bytes, schema);
    expect(result.ok).toBe(true);
    expect(result.issues).toEqual([]);
    expect(result.models?.[0]).toMatchObject({ name: 'Person 1', values: model.values });
    expect(strFromU8(files['xl/worksheets/sheet1.xml'])).not.toContain('<f>');
  });
  it('provides stable schema-path headers, separate field instructions and no dummy import row', () => {
    const result = readWorkbook(createWorkbook(schema), schema);
    expect(result.models).toEqual([]);
    expect(result.ok).toBe(false);
    expect(result.issues).toEqual([]);
  });
  it('rejects workbook formulas and reports the source row before saving any records', () => {
    const result = readWorkbook(editWorkbook((xml) => xml.replace('<c r="C2" t="inlineStr">', '<c r="C2" t="inlineStr"><f>HYPERLINK("https://example.invalid")</f>')), schema);
    expect(result.ok).toBe(false);
    expect(result.issues?.[0].index).toBe(2);
  });
  it('rejects an unknown column rather than silently ignoring user data', () => {
    const result = readWorkbook(editWorkbook((xml) => xml.replace('person.code', 'other.code')), schema);
    expect(result.ok).toBe(false);
    expect(result.issues).not.toHaveLength(0);
  });
  it('validates required values and types atomically', () => {
    const result = readWorkbook(editWorkbook((xml) => xml.replace('<v>123.45</v>', '<v>not-a-number</v>')), schema);
    expect(result.ok).toBe(false);
    expect(result.issues?.[0].index).toBe(2);
  });
  it('rejects unsafe schema paths', () => {
    expect(() => createWorkbook({ ...schema, fields: [{ path: '__proto__.polluted', type: 'string', required: false }] })).toThrow();
  });
});
