import { act, renderHook } from '@testing-library/react';
import { expect, it } from 'vitest';
import { useModelHistory } from '@/features/data-models/state/useModelHistory';
it('retains independent model history when switching and discards redo branches', () => {
  const { result, rerender } = renderHook(({ id }) => useModelHistory(id, { name: 'original' }), {
    initialProps: { id: 'A' },
  });
  act(() => result.current.push({ name: 'Alice' }, 'name'));
  rerender({ id: 'B' });
  act(() => result.current.push({ name: 'Bob' }, 'name'));
  rerender({ id: 'A' });
  expect(result.current.canUndo).toBe(true);
  act(() => {
    expect(result.current.undo()).toEqual({ name: 'original' });
  });
  act(() => result.current.push({ name: 'New branch' }, 'name'));
  expect(result.current.canRedo).toBe(false);
  rerender({ id: 'B' });
  act(() => {
    expect(result.current.undo()).toEqual({ name: 'original' });
  });
});
