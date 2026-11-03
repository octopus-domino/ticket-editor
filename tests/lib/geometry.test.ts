// tests/lib/geometry.test.ts
import { describe, it, expect } from 'vitest';
import { getBBox, hitShapeEl, findElementAt } from '@/lib/geometry';
import type { CanvasElement, Slide } from '@/shared/types';

const baseEl = { id: '1', x: 10, y: 10, width: 50, height: 50, rotation: 0 };

describe('geometry', () => {
  describe('getBBox', () => {
    it('returns default bbox for simple element', () => {
      const el = { ...baseEl, type: 'shape' } as CanvasElement;
      expect(getBBox(el)).toEqual({ x: 10, y: 10, w: 50, h: 50 });
    });

    it('calculates bbox from points for line', () => {
      const el = {
        ...baseEl,
        type: 'line',
        points: [0, 0, 20, 30, -10, 10],
      } as CanvasElement;
      expect(getBBox(el)).toEqual({ x: 0, y: 10, w: 30, h: 30 });
    });
  });

  describe('hitShapeEl', () => {
    it('returns false if click is outside bounds', () => {
      const el = { ...baseEl, type: 'shape', shape: 'rect' } as CanvasElement;
      expect(hitShapeEl(el, 5, 5)).toBe(false);
    });

    it('hits circle correctly', () => {
      const el = { ...baseEl, type: 'shape', shape: 'circle' } as CanvasElement;
      expect(hitShapeEl(el, 35, 35)).toBe(true); // center
      expect(hitShapeEl(el, 10, 10)).toBe(false); // corner
    });

    it('hits rect correctly (always true inside bbox)', () => {
      const el = { ...baseEl, type: 'shape', shape: 'rect' } as CanvasElement;
      expect(hitShapeEl(el, 15, 15)).toBe(true);
    });

    it('hits fill element via point-in-polygon', () => {
      const el = {
        ...baseEl,
        type: 'fill',
        points: [0, 0, 50, 0, 50, 50, 0, 50], // Квадрат
      } as CanvasElement;
      expect(hitShapeEl(el, 30, 30)).toBe(true); // Внутри
      expect(hitShapeEl(el, 60, 60)).toBe(false); // Снаружи
    });
  });

  describe('findElementAt', () => {
    it('finds line element by expanded bbox', () => {
      const slide = {
        elements: [{ ...baseEl, id: 'line1', type: 'line', points: [0, 0, 50, 50] }],
      } as unknown as Slide;
      
      // Прямая линия имеет нулевую толщину, но хит-тест дает погрешность +-6px
      expect(findElementAt(slide, 35, 35)?.id).toBe('line1');
      expect(findElementAt(slide, 80, 80)).toBeNull();
    });

    it('finds default shape element', () => {
      const slide = {
        elements: [{ ...baseEl, id: 'shape1', type: 'shape' }],
      } as unknown as Slide;
      expect(findElementAt(slide, 15, 15)?.id).toBe('shape1');
    });
  });
});