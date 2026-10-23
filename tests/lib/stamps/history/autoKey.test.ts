import { describe, it, expect } from 'vitest';
import { autoKey } from '../../../../src/lib/stamps/history/autoKey';

describe('lib/stamps/history/autoKey', () => {
  it('возвращает undefined для дискретных полей', () => {
    expect(autoKey('id1', { x: 10 })).toBeUndefined();
    expect(autoKey('id1', { text: 'abc' })).toBeUndefined();
  });

  it('возвращает ключ для непрерывных', () => {
    expect(autoKey('id1', { arcSpanDeg: 200 })).toBe('id1:arcSpanDeg');
  });

  it('при смешанных полях — undefined (дискретное побеждает)', () => {
    expect(autoKey('id1', { arcSpanDeg: 200, x: 10 })).toBeUndefined();
  });

  it('сортирует поля', () => {
    expect(autoKey('id1', { arcSpanDeg: 200, arcOffset: 5 }))
      .toBe('id1:arcOffset,arcSpanDeg');
  });

  it('пустой объект → undefined', () => {
    expect(autoKey('id1', {})).toBeUndefined();
  });
});