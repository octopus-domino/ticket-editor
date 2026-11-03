// tests/lib/graphics/pathfinder-boolean.test.ts
import { describe, it, expect } from 'vitest';
import { isBooleanOperand } from '@/lib/graphics/pathfinder';
import type { CanvasElement } from '@/shared/types';

describe('pathfinder - isBooleanOperand', () => {
  it('returns false for unsupported types (e.g., text)', () => {
    const el = { type: 'text' } as CanvasElement;
    expect(isBooleanOperand(el)).toBe(false);
  });

  it('returns false if element is a symbol instance', () => {
    const el = { type: 'shape', symbolId: 'sym-123' } as CanvasElement;
    expect(isBooleanOperand(el)).toBe(false);
  });

  it('returns true for standard shapes and lines', () => {
    const shape = { type: 'shape' } as CanvasElement;
    const line = { type: 'line' } as CanvasElement;
    expect(isBooleanOperand(shape)).toBe(true);
    expect(isBooleanOperand(line)).toBe(true);
  });
});