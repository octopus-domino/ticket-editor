import { describe, it, expect } from 'vitest';
import { applyPathfinder } from '../../../src/lib/graphics/pathfinder';
import type { ShapeElement } from '../../../src/shared/types';

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