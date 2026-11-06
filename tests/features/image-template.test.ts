import { describe, expect, it } from 'vitest';
import { recognizedSlide } from '@/features/image-template/domain/recognizedLayout';
import { resolveBindings } from '@/features/bindings/domain/BindingResolver';
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
