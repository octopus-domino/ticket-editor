import { describe, expect, it } from 'vitest';
import { recognizedSlide } from '@/features/image-template/domain/recognizedLayout';
import { resolveBindings } from '@/features/bindings/domain/BindingResolver';
import { parseHtmlToRuns } from '@/lib/richText/parser/runs';
const item = (type: string, properties: object, y = 20) => ({
  type,
  x: 20,
  y,
  width: 200,
  height: 40,
  properties,
});
const draft = (elements: unknown[]) => ({
  width: 600,
  height: 800,
  elements,
  warnings: [],
  engine: 'ocr',
});
describe('image to editable template', () => {
  it('fits plain OCR text into its original box and preserves explicit inline style resets', () => {
    const { slide } = recognizedSlide(
      {
        ...draft([
          item('text', { text: 'A deliberately narrow OCR box', fontSize: 24 }),
          item('text', {
            text: 'Bold plain',
            fontStyle: 'bold',
            textDecoration: 'underline',
            html: '<div style="font-weight:700;text-decoration:underline"><span>Bold</span><span style="font-weight:400;font-style:normal;text-decoration:none">plain</span></div>',
          }),
        ]),
        engine: 'dual',
      },
      'Styles',
    );
    expect(slide.elements[0]).toMatchObject({ x: 20, y: 20, width: 200, height: 40 });
    if (slide.elements[0].type !== 'text') throw new Error('Expected text');
    expect(slide.elements[0].fontSize).toBeLessThanOrEqual(24);
    const text = slide.elements[1];
    if (text.type !== 'text') throw new Error('Expected text');
    const runs = parseHtmlToRuns(text.html!, {
      fontSize: text.fontSize,
      fontFamily: text.fontFamily,
      fontStyle: text.fontStyle,
      textDecoration: text.textDecoration,
      fill: text.fill,
    });
    expect(runs.find((run) => run.text === 'plain')).toMatchObject({
      bold: false,
      italic: false,
      underline: false,
    });
  });
  it('accepts the dual-engine contract and preserves mixed inline styles without shrinking all text', () => {
    const { slide } = recognizedSlide(
      {
        width: 678,
        height: 949,
        engine: 'dual',
        warnings: ['recognition.low_confidence'],
        elements: [
          {
            type: 'path',
            x: 34,
            y: 814,
            width: 612,
            height: 62,
            properties: {
              fill: '#eae7e0',
              d: 'M 34 814 L 340 814 L 645 814 L 645 845 L 645 875 L 340 875 L 34 875 L 34 845 Z',
              strokeWidth: 0,
              stroke: 'transparent',
            },
          },
          {
            type: 'text',
            x: 27,
            y: 39,
            width: 601,
            height: 819,
            properties: {
              text: 'Ставка годовых '.repeat(100),
              richText: true,
              fontSize: 13.461538461538462,
              fontFamily: 'Courier New',
              fontStyle: 'bold',
              textDecoration: 'underline',
              fill: '#a1a1a3',
              html: '<div><span style="color:#a1a1a3;font-size:13px;font-family:\'Courier New\';font-weight:700;">Ставка</span> <span style="color:#ffffff;font-size:28px;font-family:\'Times New Roman\';font-style:italic;text-decoration:line-through;">годовых</span></div>',
            },
          },
        ],
      },
      'Dual result',
    );
    expect(slide.elements[0]).toMatchObject({
      x: 34,
      y: 814,
      d: 'M 0 0 L 306 0 L 611 0 L 611 31 L 611 61 L 306 61 L 0 61 L 0 31 Z',
    });
    const text = slide.elements[1];
    if (text.type !== 'text') throw new Error('Expected text');
    expect(text).toMatchObject({
      richText: true,
      autoHeight: false,
      fontSize: 13.461538461538462,
      textDecoration: 'underline',
    });
    const runs = parseHtmlToRuns(text.html!, {
      fontSize: text.fontSize,
      fontFamily: text.fontFamily,
      fill: text.fill,
      fontStyle: text.fontStyle,
      textDecoration: text.textDecoration,
    });
    expect(runs.find((run) => run.text === 'Ставка')).toMatchObject({
      fontSize: 13,
      fontFamily: 'Courier New',
      bold: true,
    });
    expect(runs.find((run) => run.text === 'годовых')).toMatchObject({
      fontSize: 28,
      fontFamily: 'Times New Roman',
      bold: false,
      italic: true,
      strike: true,
      underline: false,
    });
  });

  it('scales inline font sizes and translates page paths while preserving arc flags and relative distances', () => {
    const { slide } = recognizedSlide(
      {
        ...draft([
          item('text', {
            text: 'Title',
            richText: true,
            html: '<span style="font-size:20px">Title</span>',
          }),
          { ...item('path', { d: 'M20 20 H120 V40 A10 5 45 0 1 120 50 l-10 -5 z' }), height: 80 },
          { ...item('path', { d: 'm20 20 10 5 l-5 -2 z' }), height: 80 },
        ]),
        width: 2000,
        height: 2000,
        engine: 'dual',
      },
      'Scaled',
    );
    const scale = 1552 / 2000;
    expect(slide.elements[0].type === 'text' && slide.elements[0].html).toContain(
      `font-size: ${20 * scale}px`,
    );
    expect(slide.elements[1].type === 'path' && slide.elements[1].d).toBe(
      `M0 0 H${100 * scale} V${20 * scale} A${10 * scale} ${5 * scale} 45 0 1 ${100 * scale} ${30 * scale} l${-10 * scale} ${-5 * scale} z`,
    );
    expect(slide.elements[2].type === 'path' && slide.elements[2].d).toBe(
      `m0 0 ${10 * scale} ${5 * scale} l${-5 * scale} ${-2 * scale} z`,
    );
  });

  it('discards executable markup and external resources while keeping supported text styles', () => {
    const { slide } = recognizedSlide(
      draft([
        item('text', {
          text: 'Safe',
          richText: true,
          html: '<script>alert(1)</script><img src="https://external.test/pixel"><span onclick="alert(1)" style="font-size:18px;color:#123456;background-image:url(https://external.test/bg)">Safe</span>',
        }),
      ]),
      'Safe',
    );
    const text = slide.elements[0];
    if (text.type !== 'text') throw new Error('Expected text');
    expect(text.html).toContain('Safe');
    expect(text.html).not.toMatch(/script|img|src|onclick|url|external|alert/);
    expect(() =>
      recognizedSlide({ ...draft([item('text', { text: 'x' })]), engine: 'unknown' }, 'x'),
    ).toThrow();
  });
  it('preserves text, real tables and source dimensions without adding white margins', () => {
    const { slide } = recognizedSlide(
      draft([
        item('text', { text: 'Certificate {{name}}', fontSize: 20 }),
        item(
          'table',
          {
            data: [
              ['Item', 'Price'],
              ['Book', '{{price}}'],
            ],
          },
          120,
        ),
        item('image', { src: 'data:image/png;base64,AA==' }, 240),
      ]),
      'Scanned certificate',
    );
    expect(slide.elements.map((e) => e.type)).toEqual(['text', 'table', 'image']);
    expect(slide.elements[0].x).toBe(20);
    expect([slide.width, slide.height]).toEqual([600, 800]);
    expect(
      slide.elements.every(
        (e) =>
          e.x >= 0 && e.y >= 0 && e.x + e.width <= slide.width && e.y + e.height <= slide.height,
      ),
    ).toBe(true);
    expect(resolveBindings([slide]).some((binding) => binding.schemaPath === 'name')).toBe(true);
  });
  it('keeps recognized font, emphasis, color, alignment and stroke thickness', () => {
    const { slide } = recognizedSlide(
      draft([
        item('text', {
          text: 'Title',
          fontSize: 18,
          fontFamily: 'Georgia',
          fontStyle: 'bold italic',
          fill: '#ef4500',
          align: 'center',
        }),
        { ...item('line', { stroke: '#123456', strokeWidth: 4 }), height: 1 },
      ]),
      'Styled page',
    );
    expect(slide.elements[0]).toMatchObject({
      autoHeight: false,
      height: 40,
      fontFamily: 'Georgia',
      fontStyle: 'bold italic',
      fill: '#ef4500',
      align: 'center',
    });
    expect(slide.elements[1]).toMatchObject({
      stroke: '#123456',
      strokeWidth: 4,
      points: [0, 0, 200, 0],
    });
  });
  it('rejects external images, invalid coordinates and malformed tables before saving', () => {
    expect(() =>
      recognizedSlide(draft([item('image', { src: 'https://external.test/track' })]), 'x'),
    ).toThrow();
    expect(() =>
      recognizedSlide(draft([{ ...item('text', { text: 'x' }), x: 590 }]), 'x'),
    ).toThrow();
    expect(() =>
      recognizedSlide(draft([item('table', { data: [['a', 'b'], ['c']] })]), 'x'),
    ).toThrow();
  });
  it('supports editable vision objects without accepting markup or script', () => {
    const input = {
      ...draft([
        item('stamp', { shape: 'circle', topText: 'COMPANY' }),
        item('chart', { kind: 'bar', values: [1, 2] }, 100),
        item('qr', { text: 'https://codoc.site' }, 200),
        item('path', { d: 'M0 0L100 20' }, 300),
      ]),
      engine: 'ollama',
    };
    expect(recognizedSlide(input, 'x').slide.elements.map((e) => e.type)).toEqual([
      'stamp',
      'chart',
      'qr',
      'path',
    ]);
    expect(() =>
      recognizedSlide(draft([item('path', { d: '<script>evil</script>' })]), 'x'),
    ).toThrow();
  });
});
