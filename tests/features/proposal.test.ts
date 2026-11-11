import { describe, it, expect } from 'vitest';
import { zipSync, strToU8 } from 'fflate';
import { readProposalWorkbook } from '@/features/journeys/api/readProposalWorkbook';
import { proposalNumber, proposalTotal } from '@/features/journeys/domain/proposal';

function workbook(cell: string) {
  const files: Record<string, Uint8Array> = {
    'xl/workbook.xml': strToU8(
      '<workbook xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="Export" r:id="r1"/></sheets></workbook>',
    ),
    'xl/_rels/workbook.xml.rels': strToU8(
      '<Relationships><Relationship Id="r1" Target="worksheets/sheet1.xml"/></Relationships>',
    ),
    'xl/worksheets/sheet1.xml': strToU8(
      `<worksheet><sheetData><row r="1">${cell}</row></sheetData></worksheet>`,
    ),
    'xl/sharedStrings.xml': strToU8('<sst><si><t>Product</t></si></sst>'),
  };
  const bytes = zipSync(
    Object.fromEntries(Object.entries(files).map(([k, v]) => [k, new Uint8Array(v)])),
  );
  return { size: bytes.length, arrayBuffer: async () => bytes.buffer } as File;
}
describe('proposal imports and money', () => {
  it('normalizes spreadsheet decimals and matches server line rounding without floating-point drift', () => {
    expect(proposalNumber('1 250,50')).toBe('1250.50');
    expect(
      proposalTotal([
        { name: 'A', quantity: '1.5', price: '10.01' },
        { name: 'B', quantity: '1', price: '0.10' },
      ]),
    ).toBe('15.12');
    expect(() => proposalNumber('=SUM(A1)')).toThrow();
    expect(() => proposalNumber('-1')).toThrow();
  });
  it('reads actual XLSX shared strings and preserves sparse columns', async () => {
    const rows = await readProposalWorkbook(
      workbook('<c r="A1" t="s"><v>0</v></c><c r="C1"><v>1.5</v></c>'),
    );
    expect(rows[0][0]).toBe('Product');
    expect(rows[0][1]).toBeUndefined();
    expect(rows[0][2]).toBe('1.5');
  });
  it('does not evaluate or trust cached formulas', async () => {
    const rows = await readProposalWorkbook(
      workbook('<c r="A1"><f>HYPERLINK("https://example.invalid")</f><v>123</v></c>'),
    );
    expect(rows[0][0]).not.toBe('123');
    expect(() => proposalNumber(rows[0][0])).toThrow();
  });
});
