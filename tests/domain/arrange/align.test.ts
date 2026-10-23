import { describe, it, expect } from 'vitest';
import {
  computeAlign, computeDistribute, getBBox,
} from '../../../src/domain/arrange/align';
import type { CanvasElement } from '../../../src/shared/types';

const rect = (
  id: string,
  x: number,
  y: number,
  w = 100,
  h = 50,
): CanvasElement => ({
  id, type: 'shape', shape: 'rect',
  x, y, width: w, height: h, rotation: 0,
  fill: '#000', stroke: 'transparent', strokeWidth: 0,
  text: '', fontSize: 16, textFill: '#000',
});

/**
 * Безопасное извлечение координаты из патча.
 * Бросает понятную ошибку, если патча нет:
 * это означает баг в computeAlign/computeDistribute, а не «edge case».
 */
const xOf = (
  patches: Record<string, { x?: number }> | null,
  id: string,
): number => {
  const v = patches?.[id]?.x;
  if (v === undefined) throw new Error(`No x in patch for "${id}"`);
  return v;
};

const yOf = (
  patches: Record<string, { y?: number }> | null,
  id: string,
): number => {
  const v = patches?.[id]?.y;
  if (v === undefined) throw new Error(`No y in patch for "${id}"`);
  return v;
};

describe('domain/arrange/align', () => {
  it('getBBox возвращает общий bbox', () => {
    const box = getBBox([rect('a', 10, 20), rect('b', 100, 200, 50, 50)]);
    expect(box).toEqual({
      minX: 10, minY: 20, maxX: 150, maxY: 250,
      width: 140, height: 230,
    });
  });

  it('getBBox для пустого массива — null', () => {
    expect(getBBox([])).toBeNull();
  });

  it('computeAlign left выравнивает по левому краю', () => {
    const patches = computeAlign(
      [rect('a', 10, 0), rect('b', 100, 0), rect('c', 200, 0)],
      'left',
    );
    expect(patches).toEqual({
      a: { x: 10, y: 0 },
      b: { x: 10, y: 0 },
      c: { x: 10, y: 0 },
    });
  });

  it('computeAlign center центрирует по общему bbox', () => {
    const patches = computeAlign(
      [rect('a', 0, 0, 100, 50), rect('b', 100, 0, 100, 50)],
      'center',
    );
    expect(xOf(patches, 'a')).toBe(50);
    expect(xOf(patches, 'b')).toBe(50);
  });

  it('computeAlign для одного элемента — null', () => {
    expect(computeAlign([rect('a', 0, 0)], 'left')).toBeNull();
  });

  it('computeDistribute horizontal даёт равные промежутки и сохраняет bbox', () => {
    // Исходно: a=[0..100], b=[150..250], c=[400..500].
    // bbox: 0..500 (ширина 500), сумма ширин = 300.
    // gap = (500 - 300) / 2 = 100.
    // Ожидаемо: a=0, b=200, c=400.
    const patches = computeDistribute(
      [
        rect('a', 0, 0, 100, 50),
        rect('b', 150, 0, 100, 50),
        rect('c', 400, 0, 100, 50),
      ],
      'horizontal',
    );
    expect(patches).not.toBeNull();

    const ax = xOf(patches, 'a');
    const bx = xOf(patches, 'b');
    const cx = xOf(patches, 'c');

    expect(ax).toBe(0);
    expect(bx).toBe(200);
    expect(cx).toBe(400);

    // Соседние позиции отличаются на ширину (100) + gap (100) = 200.
    expect(bx - ax).toBe(200);
    expect(cx - bx).toBe(200);
  });

  it('computeDistribute vertical даёт равные промежутки', () => {
    // Исходно: a=[0..50], b=[100..150], c=[200..250].
    // bbox: 0..250 (высота 250), сумма высот = 150.
    // gap = (250 - 150) / 2 = 50.
    // Ожидаемо: a=0, b=100, c=200.
    const patches = computeDistribute(
      [
        rect('a', 0, 0, 100, 50),
        rect('b', 0, 100, 100, 50),
        rect('c', 0, 200, 100, 50),
      ],
      'vertical',
    );
    expect(patches).not.toBeNull();

    const ay = yOf(patches, 'a');
    const by = yOf(patches, 'b');
    const cy = yOf(patches, 'c');

    expect(ay).toBe(0);
    expect(by).toBe(100);
    expect(cy).toBe(200);

    expect(by - ay).toBe(100);
    expect(cy - by).toBe(100);
  });

  it('computeDistribute для двух элементов — null', () => {
    expect(computeDistribute(
      [rect('a', 0, 0), rect('b', 100, 0)],
      'horizontal',
    )).toBeNull();
  });
});