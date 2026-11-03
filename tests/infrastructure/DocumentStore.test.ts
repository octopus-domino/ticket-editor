import { describe, expect, it, vi } from 'vitest';
import { DocumentStore } from '@/infra/state/DocumentStore';

describe('document history invariants', () => {
  it('prunes large image payloads by bytes even with very few elements', () => {
    vi.useFakeTimers();
    try {
      const store = new DocumentStore();
      store.commit((draft) => {
        draft.slides[0].backgroundImage = 'A'.repeat(22 * 1024 * 1024);
      });
      vi.runOnlyPendingTimers();
      expect(store.canUndo).toBe(true);
      store.commit((draft) => {
        draft.slides[0].backgroundImage = 'B'.repeat(22 * 1024 * 1024);
      });
      vi.runOnlyPendingTimers();
      expect(store.canUndo).toBe(false);
      expect(store.getState().slides[0].backgroundImage?.startsWith('B')).toBe(true);
    } finally {
      vi.useRealTimers();
    }
  });
  it('undoes exactly one change after 100 and 200 commits', () => {
    const store = new DocumentStore();
    for (let index = 1; index <= 200; index++)
      store.commit((draft) => {
        draft.slides[0].name = String(index);
      });
    expect(store.canRedo).toBe(false);
    store.undo();
    expect(store.getState().slides[0].name).toBe('199');
    store.redo();
    expect(store.getState().slides[0].name).toBe('200');
  });
  it('discards the redo branch even when the next change has the same merge key', () => {
    vi.useFakeTimers();
    const store = new DocumentStore();
    store.commit((draft) => {
      draft.slides[0].name = 'A';
    }, 'name');
    vi.advanceTimersByTime(1000);
    store.commit((draft) => {
      draft.slides[0].name = 'B';
    }, 'name');
    store.undo();
    store.commit((draft) => {
      draft.slides[0].name = 'C';
    }, 'name');
    expect(store.canRedo).toBe(false);
    store.undo();
    expect(store.getState().slides[0].name).toBe('A');
    vi.useRealTimers();
  });
  it('does not record an empty mutation and repairs an invalid active ID', () => {
    const original = new DocumentStore();
    const state = original.getState();
    const store = new DocumentStore({ ...state, activeId: 'missing' });
    store.commit(() => {});
    expect(store.canUndo).toBe(false);
    expect(store.getState().activeId).toBe(state.slides[0].id);
  });
});
