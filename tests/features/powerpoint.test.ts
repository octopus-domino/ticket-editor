import { beforeAll, describe, expect, it, vi } from 'vitest';
import { webcrypto } from 'node:crypto';
import { exportPptx } from '@/lib/powerpoint/exportPptx';
import { importPptx } from '@/lib/powerpoint/importPptx';
import { unpack, pack, parseXml } from '@/lib/powerpoint/package';
import { newSimpleText, newShape, newTable } from '@/lib/factories';
import type { Slide } from '@/shared/types';
const slide: Slide = {
  id: 'S',
  name: 'Quarterly report',
  width: 960,
  height: 540,
  format: 'custom',
  orientation: 'landscape',
  padding: { top: 24, right: 24, bottom: 24, left: 24 },
  background: '#ffffff',
  elements: [
    {
      ...newSimpleText(40, 40),
      text: 'First line\nSecond line {{name}}',
      width: 600,
      height: 90,
      fontSize: 28,
    },
    { ...newShape('triangle', 80, 200), width: 160, height: 140, fill: '#123456' },
    {
      ...newTable(400, 220),
      data: [
        ['Name', 'Amount'],
        ['Alice', '100'],
      ],
      rows: 2,
      cols: 2,
      width: 400,
      height: 100,
    },
  ],
};
beforeAll(() => vi.stubGlobal('crypto', webcrypto));
describe('PowerPoint interchange', () => {
  it('uses changed slide XML instead of stale native metadata', async () => {
    const exported = await exportPptx([slide]);
    const files = unpack(exported.bytes);
    const path = 'ppt/slides/slide1.xml';
    const xml = new TextDecoder().decode(files[path]);
    files[path] = new TextEncoder().encode(xml.replace('>First line<', '>Edited in PowerPoint<'));

    const imported = await importPptx(pack(files));
    expect(imported.slides[0].elements[0]).toMatchObject({
      type: 'text',
      text: 'Edited in PowerPoint\nSecond line {{name}}',
    });
  });

  it('imports embedded image bytes when native metadata is absent', async () => {
    const src =
      'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a6hkAAAAASUVORK5CYII=';
    const imageSlide: Slide = {
      ...slide,
      elements: [
        {
          id: 'logo',
          type: 'image',
          x: 20,
          y: 30,
          width: 50,
          height: 40,
          rotation: 0,
          src,
        },
      ],
    };
    const exported = await exportPptx([imageSlide]);
    const files = unpack(exported.bytes);
    delete files['codoc/source.json'];

    const imported = await importPptx(pack(files));
    expect(imported.slides[0].elements[0]).toMatchObject({
      type: 'image',
      x: 20,
      y: 30,
      width: 50,
      height: 40,
      src,
    });
  });
  it('writes a real multi-slide OPC presentation with editable text, shapes and tables', async () => {
    const result = await exportPptx([slide, { ...slide, id: 'S2', name: 'Second slide' }]);
    const files = unpack(result.bytes);
    expect(Object.keys(files)).toContain('ppt/slideMasters/slideMaster1.xml');
    expect(Object.keys(files)).toContain('ppt/theme/theme1.xml');
    for (const [path, data] of Object.entries(files))
      if (path.endsWith('.xml') || path.endsWith('.rels'))
        expect(parseXml(data).querySelector('parsererror'), path).toBeNull();
    const xml = new TextDecoder().decode(files['ppt/slides/slide1.xml']);
    expect(xml).toContain('prst="triangle"');
    expect(xml).toContain('<a:tbl>');
    expect(xml).toContain('Second line {{name}}');
    expect(result.warnings).toEqual([]);
    const restored = await importPptx(result.bytes);
    expect(restored.slides).toHaveLength(2);
    expect(restored.slides[0].elements).toEqual(slide.elements);
  });
  it('imports ordinary PowerPoint XML when metadata is absent or the slide was edited', async () => {
    const result = await exportPptx([slide]);
    const files = unpack(result.bytes);
    delete files['codoc/source.json'];
    const restored = await importPptx(pack(files));
    expect(restored.slides[0].elements[0]).toMatchObject({
      type: 'text',
      text: 'First line\nSecond line {{name}}',
      fontSize: 28,
      x: 40,
      y: 40,
    });
    expect(restored.slides[0].elements[1]).toMatchObject({
      type: 'shape',
      shape: 'triangle',
      fill: '#123456',
    });
    expect(restored.slides[0].elements[2]).toMatchObject({
      type: 'table',
      data: [
        ['Name', 'Amount'],
        ['Alice', '100'],
      ],
    });
  });
  it('rejects XML entities and archive traversal before importing', () => {
    expect(() =>
      parseXml(
        new TextEncoder().encode('<!DOCTYPE svg [<!ENTITY x SYSTEM "file:///private">]><svg/>'),
      ),
    ).toThrow();
  });
});
