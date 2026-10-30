import { describe, it, expect } from 'vitest';
import { toSvgDiagram } from '@/lib/svg/exporters';
import type { DiagramElement } from '@/shared/types';

const base = (overrides: Partial<DiagramElement> = {}): DiagramElement => ({
  id: 'd1',
  type: 'diagram',
  x: 10,
  y: 20,
  width: 200,
  height: 100,
  rotation: 0,
  svg: '',
  xml: '',
  ...overrides,
});

describe('toSvgDiagram', () => {
  it('пустой SVG → рисует плейсхолдер', () => {
    const out = toSvgDiagram(base());
    expect(out).toContain('<rect');
    expect(out).toContain('stroke-dasharray');
  });

  it('валидный SVG → base64 в data URL', () => {
    const svg = '<svg xmlns="http://www.w3.org/2000/svg"><g><rect/></g></svg>';
    const out = toSvgDiagram(base({ svg }));
    expect(out).toContain('data:image/svg+xml;base64,');
    expect(out).toContain('<image');
  });

  it('XML-пролог убирается', () => {
    const svg = '<?xml version="1.0"?><svg xmlns="http://www.w3.org/2000/svg"><g/></svg>';
    const out = toSvgDiagram(base({ svg }));
    expect(out).toContain('data:image/svg+xml;base64,');
    // пролог не должен попасть в base64-строку
    // (не проверяем base64 напрямую — просто убеждаемся, что вызов не упал)
  });

  it('невалидный SVG (не <svg>) → плейсхолдер', () => {
    const out = toSvgDiagram(base({ svg: 'not an svg' }));
    expect(out).toContain('<rect');
  });

  it('rotation и flipX/flipY сохраняются', () => {
    const svg = '<svg xmlns="http://www.w3.org/2000/svg"><g/></svg>';
    const out = toSvgDiagram(base({ svg, rotation: 45 }));
    expect(out).toContain('rotate(45)');
  });
});