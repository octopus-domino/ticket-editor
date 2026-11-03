import { act, renderHook } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import {
  documentDrafts,
  useDocumentPersistence,
} from '@/presentation/hooks/editor/useDocumentPersistence';
import { createSlide } from '@/domain/slide/operations';

afterEach(() => {
  vi.restoreAllMocks();
  vi.useRealTimers();
});

it('flushes the old resource through its own save callback when the document ID changes', async () => {
  vi.useFakeTimers();
  vi.spyOn(documentDrafts, 'write').mockResolvedValue(undefined);
  vi.spyOn(documentDrafts, 'remove').mockResolvedValue(undefined);
  const a = createSlide(1),
    b = createSlide(2);
  const saveA = vi.fn().mockResolvedValue(undefined),
    saveB = vi.fn().mockResolvedValue(undefined);
  const snapshotA = { slides: [a], activeId: a.id, data: [] };
  const snapshotB = { slides: [b], activeId: b.id, data: [] };
  const { rerender } = renderHook(
    ({ id, snapshot, save }) => useDocumentPersistence(id, snapshot, save),
    { initialProps: { id: 'owner:A', snapshot: snapshotA, save: saveA } },
  );
  act(() => rerender({ id: 'owner:B', snapshot: snapshotB, save: saveB }));
  await act(async () => {
    await vi.advanceTimersByTimeAsync(1500);
  });
  expect(saveA).toHaveBeenCalledWith(expect.objectContaining({ activeId: a.id }));
  expect(saveB).toHaveBeenCalledWith(expect.objectContaining({ activeId: b.id }));
  expect(saveB.mock.calls.some(([snapshot]) => snapshot.activeId === a.id)).toBe(false);
});
