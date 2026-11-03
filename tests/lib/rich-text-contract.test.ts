import { beforeAll, describe, expect, it, vi } from 'vitest';
import { parseHtmlToBlocks } from '@/lib/richText/parser';
import { layoutRuns } from '@/lib/richText/layout';
import {
  computeTableLayout,
  measureTableHeight,
  measureTableWidth,
} from '@/lib/richText/tableLayout';
import { normalizeTableWidthsInHtml, serializeRichHtml } from '@/lib/richText/tableSync';
import type { BaseStyle } from '@/lib/richText/types';

const base: BaseStyle = {
  fontSize: 16,
  fontFamily: 'Arial',
  fontStyle: 'normal',
  textDecoration: '',
  fill: '#111111',
};
describe('rich text print geometry', () => {
  beforeAll(() => {
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
  });
  it.each([
    '<p><strong>Alice</strong> <em>Bob</em> <u>City</u> <s>Old</s></p>',
    '<div><h2>Header</h2><p style="text-align:center"><span style="font-size:22px;color:#123456;background-color:#ffee00;font-family:Georgia">Name</span><br>Address</p></div>',
    '<ul><li>First</li><li><b>Second</b></li></ul><ol><li>Third</li></ol>',
    '<blockquote><p>Quote</p></blockquote><p><a href="https://example.com">Link</a><sup>2</sup><sub>x</sub></p>',
    'Plain text<br>Second line<p></p><p>Last</p>',
  ])('preserves visible text across parse and line wrapping: %s', (html) => {
    const blocks = parseHtmlToBlocks(html, base);
    expect(blocks.length).toBeGreaterThan(0);
    const runs = blocks.flatMap((block) => (block.kind === 'text' ? block.runs : []));
    const expected = runs
      .map((run) => run.text)
      .join('')
      .replace(/\s/g, '');
    const result = layoutRuns(runs, 90, 1.3);
    expect(result.totalHeight).toBeGreaterThan(0);
    const actual = result.lines
      .flat()
      .map((run) => run.text)
      .join('')
      .replace(/\s/g, '');
    expect(actual).toBe(expected);
    expect(
      result.lines.flat().every((run) => Number.isFinite(run.x) && Number.isFinite(run.y)),
    ).toBe(true);
  });
  it('keeps rich style attributes', () => {
    const [block] = parseHtmlToBlocks('<p><strong><em><u>Hello</u></em></strong></p>', base);
    expect(block).toMatchObject({
      kind: 'text',
      runs: [
        expect.objectContaining({
          text: 'Hello',
          bold: true,
          italic: true,
          underline: true,
        }),
      ],
    });
    expect(layoutRuns([], 100, 1.2)).toMatchObject({
      lines: [],
      totalHeight: 0,
    });
  });
  it.each([
    '<table><tr><th>A</th><th>B</th></tr><tr><td>One</td><td>Two</td></tr></table>',
    '<table data-editor-width="300"><colgroup><col width="100"><col width="200"></colgroup><tr><td colspan="2" style="padding:8px;border:2px dashed #123456;background:#eee">Heading</td></tr><tr><td rowspan="2">Left</td><td>Right</td></tr><tr><td>End</td></tr></table>',
    '<table><tr><td style="vertical-align:bottom;text-align:right"><p>Outer</p><table><tr><td>Nested</td></tr></table></td><td style="border-top:1px dotted red">Other</td></tr></table>',
  ])('keeps table layout finite and proportional on repeated saves', (html) => {
    const normalized = normalizeTableWidthsInHtml(html, 400);
    const again = normalizeTableWidthsInHtml(normalized, 400);
    expect(again).toBe(normalized);
    const table = parseHtmlToBlocks(normalized, base).find((block) => block.kind === 'table');
    expect(table?.kind).toBe('table');
    if (table?.kind !== 'table') throw new Error('Expected parsed table');
    const layout = computeTableLayout(table.data, 400, 16, 1.3);
    expect(layout.totalWidth).toBeCloseTo(400, 0);
    expect(layout.totalHeight).toBeGreaterThan(0);
    expect(layout.rowOffsets.every(Number.isFinite)).toBe(true);
    expect(measureTableWidth(table.data, 400, 16, 1.3)).toBe(layout.totalWidth);
    expect(measureTableHeight(table.data, 400, 16, 1.3)).toBe(layout.totalHeight);
    const root = document.createElement('div');
    root.innerHTML = normalized;
    expect(serializeRichHtml(root, normalized, 400)).toContain('<table');
  });
});
