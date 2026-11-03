// tests/lib/resolveSample.test.ts
import { describe, it, expect } from 'vitest';
import { resolveSample } from '@/lib/resolveSample';
import type { DataRoot } from '@/shared/types';

const mockData: DataRoot[] = [
  {
    id: 'root1',
    name: 'event',
    label: 'Событие',
    fields: [
      { id: 'f1', name: 'title', type: 'string', sample: 'Концерт' },
      {
        id: 'f2',
        name: 'items',
        type: 'array',
        children: [
          { id: 'f3', name: 'price', type: 'number', sample: '1000' },
        ],
      },
    ],
  },
];

describe('resolveSample', () => {
  it('returns null for empty path', () => {
    expect(resolveSample(mockData, '')).toBeNull();
  });

  it('returns null if root not found', () => {
    expect(resolveSample(mockData, 'unknown.title')).toBeNull();
  });

  it('returns null if field not found', () => {
    expect(resolveSample(mockData, 'event.unknown')).toBeNull();
  });

  it('resolves top-level field', () => {
    expect(resolveSample(mockData, 'event.title')).toBe('Концерт');
  });

  it('resolves nested array child (stripping index)', () => {
    // Проверяем, что [0] корректно вырезается из пути
    expect(resolveSample(mockData, 'event.items[0].price')).toBe('1000');
  });
});