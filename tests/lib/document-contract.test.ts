import { beforeAll, describe, expect, it, vi } from 'vitest';
import * as factory from '@/lib/factories';
import { migrateDocument } from '@/lib/migrations';
import { importElements } from '@/application/use-cases/importElements';
import { ModelIO } from '@/features/data-models/api/FileModelIO';
import { serializeSlideToSvg } from '@/lib/svg/serialize';
import type { BasicShape, CanvasElement } from '@/shared/types';
import { materializeSlide } from '@/lib/materialize';

describe('document interchange and rendering contract', () => {
  beforeAll(() => {
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
  });
  const shapes: BasicShape[] = [
    'rect',
    'roundRect',
    'circle',
    'triangle',
    'star',
    'arrow',
    'polygon',
    'arc',
  ];
  it.each(shapes)('exports %s with all stroke alignments and stable clipping', (kind) => {
    for (const strokeAlign of ['inside', 'center', 'outside'] as const) {
      const shape = {
        ...factory.newShape(kind),
        appearance: {
          fills: [],
          strokes: [{ id: 'stroke', color: '#123456', width: 12, align: strokeAlign }],
        },
        strokeWidth: 12,
        polygonPoints: [0, 0, 100, 0, 50, 100],
        rotation: 25,
      };
      const text = {
        ...factory.newSimpleText(),
        text: '<Alice & Bob>',
        clipPathId: shape.id,
      };
      const slide = { ...factory.newSlide(1), elements: [shape, text] };
      const svg = serializeSlideToSvg(slide);
      const xml = new DOMParser().parseFromString(svg, 'image/svg+xml');
      expect(xml.querySelector('parsererror')).toBeNull();
      expect(xml.querySelector('clipPath')).not.toBeNull();
      expect(svg).not.toContain('NaN');
      expect(svg).toContain('&amp;');
      if (strokeAlign !== 'center') expect(xml.querySelector('mask')).not.toBeNull();
    }
  });
  it('round trips every factory element including QR and bindings', () => {
    const elements: CanvasElement[] = [
      factory.newText(),
      factory.newSimpleText(),
      factory.newShape('rect'),
      factory.newLine(),
      factory.newTable(),
      factory.newFooter(),
      factory.newPath(),
      factory.newChart('bar'),
      factory.newChart('donut'),
      factory.newQr(),
      factory.newDiagram(),
      factory.newStamp('circle'),
    ];
    const binding = {
      elementId: elements[0].id,
      elementLabel: 'Name',
      placeholder: '{{alias}}',
      schemaPath: 'name',
      source: 'manual' as const,
      status: 'linked' as const,
      inferred: 'alias',
    };
    const document = migrateDocument({
      version: '2.0',
      slides: [{ ...factory.newSlide(1), elements }],
      bindings: [binding],
    });
    expect(document.slides[0].elements.map((element) => element.type)).toEqual(
      elements.map((element) => element.type),
    );
    expect(document.bindings).toEqual([binding]);
    expect(() => migrateDocument({ version: '9.0', slides: [] })).toThrow();
    expect(() => migrateDocument(null)).toThrow();
  });
  it('validates partial imports atomically and remaps references', () => {
    const first = factory.newShape('rect'),
      second = factory.newShape('circle');
    const group = {
      id: 'group',
      type: 'group',
      x: 0,
      y: 0,
      width: 100,
      height: 100,
      rotation: 0,
      children: [first.id, second.id],
    };
    const elements = importElements([first, second, group], 0)!;
    expect(elements[0].id).not.toBe(first.id);
    expect(elements[2]).toMatchObject({
      children: [elements[0].id, elements[1].id],
    });
    expect(() => importElements([first, first], 0)).toThrow();
    expect(() => importElements([{ ...first, width: -1 }], 0)).toThrow();
    expect(() => importElements([first], 2000)).toThrow();
    expect(importElements({ slides: [] }, 0)).toBeNull();
  });
  it('fills rendering copies without changing templates', () => {
    const slide = {
      ...factory.newSlide(1),
      elements: [
        { ...factory.newQr(), text: '{{alias}}' },
        { ...factory.newTable(), data: [['{{name}}']] },
        { ...factory.newChart('bar'), dataPath: 'rows', valueField: 'price' },
        {
          ...factory.newSimpleText(),
          text: '{{name}}',
          html: '<p>{{name}}</p>',
        },
      ],
    };
    const binding = {
      elementId: slide.elements[0].id,
      elementLabel: '',
      placeholder: '{{alias}}',
      schemaPath: 'name',
      source: 'manual' as const,
      status: 'linked' as const,
      inferred: '',
    };
    const result = materializeSlide(
      slide,
      { name: '<Alice>', rows: [{ price: 12 }, { price: 7 }] },
      [binding],
    );
    expect(result.elements[0]).toMatchObject({ text: '<Alice>' });
    expect(result.elements[1]).toMatchObject({ data: [['<Alice>']] });
    expect(result.elements[2]).toMatchObject({ values: [12, 7] });
    expect(result.elements[3]).toMatchObject({ html: '<p>&lt;Alice&gt;</p>' });
    expect(slide.elements[0]).toMatchObject({ text: '{{alias}}' });
  });
  it('rejects unsafe model envelopes and preserves identity on export', () => {
    const io = new ModelIO();
    const model = {
      id: 'M',
      schemaId: 'S',
      name: 'Model',
      values: { optional: null },
      createdAt: '',
      updatedAt: '',
    };
    expect(io.parse(io.export([model]))).toMatchObject({
      ok: true,
      schemaId: 'S',
      models: [{ id: 'M', values: { optional: null } }],
    });
    for (const raw of [
      '{"version":"9.0","items":[]}',
      '{"values":{"__proto__":{"x":1}}}',
      'invalid',
    ])
      expect(io.parse(raw).ok).toBe(false);
    expect(
      io.parse(
        JSON.stringify({
          values: Object.fromEntries(Array.from({ length: 501 }, (_, index) => [index, index])),
        }),
      ).ok,
    ).toBe(false);
    expect(() => io.export([model, { ...model, schemaId: 'other' }])).toThrow();
  });
  it('serializes rich and primitive elements as well formed SVG', () => {
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
    const slide = factory.newSlide(1);
    slide.elements = [
      factory.newText(),
      factory.newLine(),
      factory.newTable(),
      factory.newFooter(slide),
      factory.newPath(),
      factory.newChart('bar'),
      factory.newChart('donut'),
      factory.newQr(),
      factory.newDiagram(),
      factory.newStamp('circle'),
    ];
    const svg = serializeSlideToSvg(slide);
    expect(
      new DOMParser().parseFromString(svg, 'image/svg+xml').querySelector('parsererror'),
    ).toBeNull();
    expect(svg).not.toMatch(/NaN|Infinity/);
  });
});
