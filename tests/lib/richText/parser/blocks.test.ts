// tests/lib/richText/parser/blocks.test.ts
import { describe, it, expect } from 'vitest';
import { parseHtmlToBlocks } from '@/lib/richText/parser/blocks';
import type { BaseStyle } from '@/lib/richText/types';

const baseStyle: BaseStyle = {
  fontSize: 16,
  fontFamily: 'Arial',
  fontStyle: 'normal',
  textDecoration: '',
  fill: '#000',
};

describe('parseHtmlToBlocks', () => {
  it('never prints CSS or script contents from imported HTML', () => {
    const blocks = parseHtmlToBlocks('<p>Hello<style>.x { color: red; }</style><script>alert(1)</script> world</p>', baseStyle);
    expect(blocks.flatMap(block => block.kind === 'text' ? block.runs.map(run => run.text) : []).join('')).toBe('Hello world');
  });
  it('parses paragraphs into a single text block', () => {
    const html = '<p>Hello</p><p>World</p>';
    const blocks = parseHtmlToBlocks(html, baseStyle);
    
    // Парсер склеивает идущие подряд текстовые теги в один RichBlock (kind: 'text')
    expect(blocks.length).toBe(1);
    expect(blocks[0].kind).toBe('text');
    
    if (blocks[0].kind === 'text') {
      // Проверяем, что оба абзаца попали в runs
      const text = blocks[0].runs.map((r) => r.text).join('');
      expect(text).toContain('Hello');
      expect(text).toContain('World');
    }
  });

  it('parses table inside TipTap wrapper', () => {
    const html = `
      <div class="tableWrapper">
        <table>
          <tr><td>Cell</td></tr>
        </table>
      </div>
    `;
    const blocks = parseHtmlToBlocks(html, baseStyle);
    expect(blocks.length).toBe(1);
    expect(blocks[0].kind).toBe('table');
    if (blocks[0].kind === 'table') {
      expect(blocks[0].data.cells.length).toBe(1);
    }
  });

  it('handles plain table without wrapper', () => {
    const html = '<table><tr><td>Cell</td></tr></table>';
    const blocks = parseHtmlToBlocks(html, baseStyle);
    expect(blocks[0].kind).toBe('table');
  });

  it('splits text and table into separate blocks', () => {
    // При наличии таблицы текст разбивается на отдельные блоки (до и после таблицы)
    const html = '<p>Before</p><table><tr><td>Cell</td></tr></table><p>After</p>';
    const blocks = parseHtmlToBlocks(html, baseStyle);
    
    expect(blocks.length).toBe(3);
    expect(blocks[0].kind).toBe('text');
    expect(blocks[1].kind).toBe('table');
    expect(blocks[2].kind).toBe('text');
  });
});
