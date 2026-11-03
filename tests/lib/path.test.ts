import { describe, expect, it } from 'vitest';
import { getByPath, parsePath, setByPath } from '@/lib/path';

describe('safe model paths', () => {
  it('updates an indexed field without deleting siblings or cloning unrelated data', () => {
    const source = {
      order: { items: [{ name: 'A', price: 100 }] },
      unrelated: { keep: true },
    };
    const result = setByPath(source, 'order.items[0].price', 200);
    expect(result).toEqual({
      order: { items: [{ name: 'A', price: 200 }] },
      unrelated: { keep: true },
    });
    expect(result.unrelated).toBe(source.unrelated);
    expect(source.order.items[0].price).toBe(100);
  });
  it.each([
    '__proto__.polluted',
    'a.constructor.prototype.polluted',
    'a.prototype.x',
    'a[999999].x',
    '',
    'a..b',
  ])('rejects unsafe path %s', (path) => {
    expect(() => setByPath({}, path, true)).toThrow();
    expect(({} as Record<string, unknown>).polluted).toBeUndefined();
  });
  it('reads flat and nested versioned models without walking the prototype', () => {
    expect(getByPath({ 'a.b': 0 }, 'a.b')).toBe(0);
    expect(getByPath({ a: [{ b: false }] }, 'a[0].b')).toBe(false);
    expect(getByPath(Object.create({ inherited: 7 }), 'inherited')).toBeUndefined();
    expect(parsePath('a[0].b')).toEqual(['a', 0, 'b']);
  });
  it('creates nested arrays while preserving existing rows', () => {
    expect(setByPath({ a: [{ x: 1 }] }, 'a[1].b[0].c', 2)).toEqual({
      a: [{ x: 1 }, { b: [{ c: 2 }] }],
    });
  });
});
