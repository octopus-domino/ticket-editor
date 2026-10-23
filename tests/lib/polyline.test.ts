import { describe, it, expect } from 'vitest';
import {
  parsePoints, serializePoints, findNearestSegment,
  insertPoint, removePoint, ensureMinimalPoints, getPointsBBox,
} from '../../src/lib/polyline';

describe('lib/polyline', () => {
  it('parsePoints → []', () => {
    expect(parsePoints(undefined)).toEqual([]);
    expect(parsePoints([])).toEqual([]);
    expect(parsePoints([1, 2])).toEqual([]);
  });

  it('parse/serialize roundtrip', () => {
    const flat = [0, 0, 10, 10, 20, 5];
    const pts = parsePoints(flat);
    expect(pts).toHaveLength(3);
    expect(serializePoints(pts)).toEqual(flat);
  });

  it('insertPoint вставляет между точками', () => {
    const pts = parsePoints([0, 0, 10, 0, 20, 0]);
    const next = insertPoint(pts, 5, 1, 0.01);
    expect(next).toHaveLength(4);
    expect(next[1].x).toBeCloseTo(5);
    expect(next[1].y).toBeCloseTo(0);
  });

  it('removePoint не удаляет последние две точки', () => {
    const pts = parsePoints([0, 0, 10, 0]);
    expect(removePoint(pts, 0)).toEqual(pts);
    const big = parsePoints([0, 0, 10, 0, 20, 0]);
    expect(removePoint(big, 1)).toHaveLength(2);
  });

  it('findNearestSegment возвращает ближайший сегмент', () => {
    const pts = parsePoints([0, 0, 10, 0, 20, 0]);
    const r = findNearestSegment(pts, 8, 3);
    expect(r.segmentIndex).toBe(0);
    expect(r.distance).toBeCloseTo(3, 1);
  });

  it('ensureMinimalPoints подставляет дефолт', () => {
    expect(ensureMinimalPoints(undefined, 100, 40)).toEqual([0, 20, 100, 20]);
    expect(ensureMinimalPoints([0, 0, 10, 10], 100, 40)).toEqual([0, 0, 10, 10]);
  });

  it('getPointsBBox считает рамку', () => {
    const bbox = getPointsBBox(parsePoints([0, 0, 10, 5, 20, 3]));
    expect(bbox.width).toBe(20);
    expect(bbox.height).toBe(5);
  });
});