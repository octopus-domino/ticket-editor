import { describe, expect, it } from 'vitest';
import { tableAxis } from '@/lib/tableGeometry';
import { recognizedSlide } from '@/features/image-template/domain/recognizedLayout';
import { toSvgTable } from '@/lib/svg/exporters';

describe('recognized table geometry', () => {
  it('keeps unequal columns proportional during resize and preserves legacy tables', () => {
    expect(tableAxis(600, 2, [100, 200])).toEqual([0, 200, 600]);
    expect(tableAxis(600, 2)).toEqual([0, 300, 600]);
    expect(tableAxis(600, 2, [-1, 10])).toEqual([0, 300, 600]);
  });

  it('retains OCR row/column sizes and clips text to its own cell in exported SVG', () => {
    const { slide } = recognizedSlide({ width: 600, height: 800, engine: 'ocr', warnings: [], elements: [
      { type: 'table', x: 20, y: 20, width: 500, height: 150, properties: {
        data: [['Long heading in a narrow cell', 'Amount'], ['Value', '100']],
        columnWidths: [100, 400], rowHeights: [90, 60], cellPadding: 2, fontSize: 12,
      } },
    ] }, 'Table');
    const table = slide.elements[0];
    expect(table.type).toBe('table');
    if (table.type !== 'table') throw new Error('Expected a table');
    expect(table.columnWidths).toEqual([100, 400]);
    expect(table.rowHeights).toEqual([90, 60]);
    const svg = toSvgTable(table);
    expect(svg).toContain('width="100" height="90"');
    expect(svg).toContain('clipPath');
    expect(svg).toContain('Amount');
  });
});
