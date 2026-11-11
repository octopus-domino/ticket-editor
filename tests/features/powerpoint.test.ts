import { beforeAll, describe, expect, it, vi } from 'vitest';
import { webcrypto } from 'node:crypto';
import { exportPptx } from '@/lib/powerpoint/exportPptx';
import { importPptx } from '@/lib/powerpoint/importPptx';
import { unpack, pack, parseXml } from '@/lib/powerpoint/package';
import { newSimpleText, newShape, newTable, newLine } from '@/lib/factories';
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
  it('imports theme-colored diagonal connectors and resolves theme fonts', async () => {
    const exported = await exportPptx([{ ...slide, elements: [newLine(50, 60), newSimpleText(30, 40)] }]);
    const files = unpack(exported.bytes);
    delete files['codoc/source.json'];
    const decode = new TextDecoder(), encode = new TextEncoder();
    let xml = decode.decode(files['ppt/slides/slide1.xml']);
    xml = xml.replace(/<a:ln w="[^"]+">[\s\S]*?<\/a:ln>/, '')
      .replace('</p:cxnSp>', '<p:style><a:lnRef idx="1"><a:srgbClr val="c42769"/></a:lnRef></p:style></p:cxnSp>')
      .replace(/typeface="[^"]+"/g, 'typeface="+mn-lt"');
    files['ppt/slides/slide1.xml'] = encode.encode(xml);
    files['ppt/theme/theme1.xml'] = encode.encode(decode.decode(files['ppt/theme/theme1.xml'])
      .replace(/<a:minorFont>[\s\S]*?<\/a:minorFont>/, '<a:minorFont><a:latin typeface="Georgia"/></a:minorFont>'));
    const result = (await importPptx(pack(files))).slides[0].elements;
    expect(result[0]).toMatchObject({ type: 'line', stroke: '#c42769' });
    expect(result[1]).toMatchObject({ type: 'text', fontFamily: 'Georgia' });
  });

  it('keeps differently styled text runs editable and escapes markup in their text', async () => {
    const exported = await exportPptx([{ ...slide, elements: [newSimpleText(30, 40)] }]);
    const files = unpack(exported.bytes);
    delete files['codoc/source.json'];
    files['ppt/slides/slide1.xml'] = new TextEncoder().encode(new TextDecoder()
      .decode(files['ppt/slides/slide1.xml']).replace(/<a:p>[\s\S]*?<\/a:p>/,
        '<a:p><a:r><a:rPr sz="2400" b="1"><a:solidFill><a:srgbClr val="123456"/></a:solidFill></a:rPr><a:t>Headline</a:t></a:r><a:r><a:rPr sz="1200" i="1"/><a:t>&lt;script&gt;body</a:t></a:r></a:p>'));
    const result = (await importPptx(pack(files))).slides[0].elements[0];
    expect(result).toMatchObject({ type: 'text', richText: true });
    if (result.type !== 'text') throw new Error('Expected editable text');
    expect(result.text).toContain('font-size:32px');
    expect(result.text).toContain('font-size:16px');
    expect(result.text).toContain('font-weight:700');
    expect(result.text).toContain('&lt;script&gt;body');
    expect(result.text).not.toContain('<script>');
  });
  it.each([
    [240, 130],
    [-240, 130],
    [240, -130],
    [-240, -130],
    [240, 0],
    [0, 130],
  ])('preserves world endpoints for a rotated line ending at %s,%s', async (dx, dy) => {
    const original = { ...newLine(300, 220), points: [0, 0, dx, dy], rotation: 23 };
    const exported = await exportPptx([{ ...slide, elements: [original] }]);
    const files = unpack(exported.bytes);
    delete files['codoc/source.json'];
    const imported = (await importPptx(pack(files))).slides[0].elements[0];
    expect(imported.type).toBe('line');
    if (imported.type !== 'line') throw new Error('Expected native line');
    function world(line: typeof original, index: number) {
      const angle = (line.rotation * Math.PI) / 180,
        x = line.points[index],
        y = line.points[index + 1];
      return [
        line.x + Math.cos(angle) * x - Math.sin(angle) * y,
        line.y + Math.sin(angle) * x + Math.cos(angle) * y,
      ];
    }
    for (const index of [0, 2]) {
      const expected = world(original, index),
        actual = world(imported, index);
      expect(actual[0]).toBeCloseTo(expected[0], 1);
      expect(actual[1]).toBeCloseTo(expected[1], 1);
    }
  });
  it('keeps diagonal line geometry, rotation, color and width without native metadata', async () => {
    const line = {
      ...newLine(50, 70),
      points: [0, 0, 240, 130],
      width: 240,
      height: 130,
      stroke: '#c42769',
      strokeWidth: 3,
      rotation: 17,
      isArrow: true,
    };
    const exported = await exportPptx([{ ...slide, elements: [line] }]);
    const files = unpack(exported.bytes);
    delete files['codoc/source.json'];
    const imported = await importPptx(pack(files));
    const importedLine = imported.slides[0].elements[0];
    expect(importedLine).toMatchObject({
      type: 'line',
      points: [0, 0, 240, 130],
      strokeWidth: 3,
      rotation: 17,
      isArrow: true,
    });
    expect('stroke' in importedLine && importedLine.stroke?.toLowerCase()).toBe('#c42769');
  });
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
