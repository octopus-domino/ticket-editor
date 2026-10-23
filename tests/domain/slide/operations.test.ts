import { describe, it, expect } from 'vitest';
import {
  createSlide, cloneSlide, changeFormat, changeOrientation, moveElementLayer,
} from '../../../src/domain/slide/operations';
import type { CanvasElement, Slide } from '../../../src/shared/types';

function makeFakeElement(overrides: Partial<CanvasElement> = {}): CanvasElement {
  return {
    id: 'el-1',
    type: 'shape',
    shape: 'rect',
    x: 10, y: 20, width: 100, height: 50, rotation: 0,
    fill: '#fff', stroke: '#000', strokeWidth: 1,
    text: '', fontSize: 14, textFill: '#000',
    ...overrides,
  } as CanvasElement;
}

describe('domain/slide/operations', () => {
  it('createSlide возвращает валидный слайд с уникальным id', () => {
    const a = createSlide(1);
    const b = createSlide(2);
    expect(a.id).toBeTruthy();
    expect(a.id).not.toBe(b.id);
    expect(a.elements).toEqual([]);
    expect(a.width).toBeGreaterThan(0);
    expect(a.height).toBeGreaterThan(0);
  });

  it('cloneSlide копирует элементы с новыми id', () => {
    const src: Slide = {
      ...createSlide(1),
      elements: [makeFakeElement({ id: 'a' }), makeFakeElement({ id: 'b' })],
    };
    const copy = cloneSlide(src);
    expect(copy.id).not.toBe(src.id);
    expect(copy.elements.length).toBe(2);
    expect(copy.elements[0].id).not.toBe('a');
    expect(copy.elements[1].id).not.toBe('b');
    expect(copy.elements[0].id).not.toBe(copy.elements[1].id);
  });

  it('changeFormat пересчитывает размеры A4 → A5', () => {
    const slide = createSlide(1);
    const changed = changeFormat(slide, 'a5');
    expect(changed.format).toBe('a5');
    expect(changed.width).toBeLessThan(slide.width);
    expect(changed.height).toBeLessThan(slide.height);
  });

  it('changeOrientation swap ширины и высоты', () => {
    const slide = createSlide(1);
    const flipped = changeOrientation(slide, 'landscape');
    expect(flipped.width).toBe(slide.height);
    expect(flipped.height).toBe(slide.width);
  });

  it('moveElementLayer меняет z-order', () => {
    const slide: Slide = {
      ...createSlide(1),
      elements: [
        makeFakeElement({ id: 'a' }),
        makeFakeElement({ id: 'b' }),
        makeFakeElement({ id: 'c' }),
      ],
    };
    const moved = moveElementLayer(slide, 'b', -1);
    expect(moved.elements.map((e) => e.id)).toEqual(['b', 'a', 'c']);
  });
});