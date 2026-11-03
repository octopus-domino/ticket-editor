import { describe, it, expect } from 'vitest';
import { applyPathfinder } from '@/lib/graphics/pathfinder';
import type { ShapeElement } from '@/shared/types';

const rect = (x: number, y: number, w: number, h: number): ShapeElement => ({
  id: 'r' + Math.random(), type: 'shape', shape: 'rect',
  x, y, width: w, height: h, rotation: 0,
  fill: '#6366f1', stroke: 'transparent', strokeWidth: 0,
  text: '', fontSize: 16, textFill: '#000',
});

describe('lib/graphics/pathfinder', () => {
  it('union двух прямоугольников даёт bbox объединения', () => {
    const r = applyPathfinder([rect(0, 0, 100, 100), rect(50, 50, 100, 100)], 'union');
    expect(r).not.toBeNull();
    expect(r!.x).toBe(0);
    expect(r!.y).toBe(0);
    expect(r!.width).toBe(150);
    expect(r!.height).toBe(150);
  });

  it('subtract вычитает меньший из большего', () => {
    const r = applyPathfinder([rect(0, 0, 100, 100), rect(25, 25, 50, 50)], 'subtract');
    expect(r).not.toBeNull();
    expect(r!.x).toBe(0);
    expect(r!.width).toBe(100);
  });

  it('intersect даёт пересечение', () => {
    const r = applyPathfinder([rect(0, 0, 100, 100), rect(50, 0, 100, 100)], 'intersect');
    expect(r).not.toBeNull();
    expect(r!.width).toBe(50);
    expect(r!.x).toBe(50);
  });

  it('возвращает null для < 2 элементов', () => {
    expect(applyPathfinder([rect(0, 0, 10, 10)], 'union')).toBeNull();
  });

  it('text не участвует в boolean-операциях', () => {
    const text: ShapeElement = { ...rect(0, 0, 10, 10) };
    (text as any).type = 'text';
    const r = applyPathfinder([rect(0, 0, 100, 100), text], 'union');
    // 1 валидный operand < 2 → null
    expect(r).toBeNull();
  });
});

describe('pathfinder - shape conversions', () => {
  const baseShape: ShapeElement = {
    id: '1', type: 'shape', shape: 'rect', x: 0, y: 0, width: 100, height: 100,
    rotation: 0, fill: '#000', stroke: '#000', strokeWidth: 1, text: '', fontSize: 12, textFill: '#000'
  };

  it('handles circle', () => {
    const circle = { ...baseShape, id: '2', shape: 'circle' } as ShapeElement;
    const result = applyPathfinder([baseShape, circle], 'intersect');
    expect(result).not.toBeNull();
    expect(result?.shape).toBe('polygon');
  });

  it('handles triangle', () => {
    const tri = { ...baseShape, id: '3', shape: 'triangle' } as ShapeElement;
    const result = applyPathfinder([baseShape, tri], 'union');
    expect(result).not.toBeNull();
  });

  it('handles star', () => {
    const star = { ...baseShape, id: '4', shape: 'star' } as ShapeElement;
    const result = applyPathfinder([baseShape, star], 'subtract');
    expect(result).not.toBeNull();
  });
});