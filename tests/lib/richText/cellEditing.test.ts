import { describe, it, expect } from 'vitest';
import { patchRichCell, richCellDocument } from '@/lib/richText/cellEditing';

describe('editing one rich table cell', () => {
  const source = '<p>Before</p><table style="width:410px"><tbody><tr><th colspan="2">Merged</th></tr>'
    + '<tr><td style="background:#eee"><p><strong>First</strong></p></td><td>Second</td></tr></tbody></table>'
    + '<p>Between</p><table><tbody><tr><td>Other table</td></tr></tbody></table>';

  it('preserves merged cells, column geometry and all neighbouring content', () => {
    const result = patchRichCell(source, 0, 1, '<p><strong>Updated</strong><br>Second line</p>');
    const parsed = richCellDocument(result, 0, 1);
    expect(parsed.cell.innerHTML).toBe('<p><strong>Updated</strong><br>Second line</p>');
    expect(parsed.cell.getAttribute('style')).toBe('background:#eee');
    expect(parsed.document.querySelector('th')?.getAttribute('colspan')).toBe('2');
    expect(parsed.document.querySelector('table')?.getAttribute('style')).toBe('width:410px');
    expect(richCellDocument(result, 1, 0).cell.textContent).toBe('Other table');
    expect(parsed.document.body.firstElementChild?.textContent).toBe('Before');
  });

  it('ignores a cell that no longer exists', () => {
    expect(patchRichCell(source, 0, 50, '<p>Text</p>')).toBe(source);
  });
});
