import { afterEach, describe, expect, it, vi } from 'vitest';
import { RevisionSaveQueue } from '@/application/use-cases/RevisionSaveQueue';

afterEach(() => vi.useRealTimers());
describe('resource revision queue', () => {
  it('does not cancel A when B changes during debounce', async () => {
    vi.useFakeTimers();
    const save = vi.fn().mockResolvedValue(undefined);
    const queue = new RevisionSaveQueue(save);
    queue.enqueue('A', 1);
    queue.enqueue('B', 2);
    await vi.runAllTimersAsync();
    expect(save.mock.calls).toEqual([
      ['A', 1],
      ['B', 2],
    ]);
    expect(queue.isDirty('A')).toBe(false);
  });
  it('serializes in-flight revisions and coalesces only the same resource', async () => {
    let release!: () => void;
    const first = new Promise<void>((resolve) => {
      release = resolve;
    });
    const save = vi.fn().mockReturnValueOnce(first).mockResolvedValue(undefined);
    const queue = new RevisionSaveQueue<number>(save);
    queue.enqueue('A', 1);
    const flush = queue.flush('A');
    queue.enqueue('A', 2);
    queue.enqueue('A', 3);
    expect(save).toHaveBeenCalledTimes(1);
    release();
    await flush;
    expect(save.mock.calls).toEqual([
      ['A', 1],
      ['A', 3],
    ]);
  });
  it('retains a failed snapshot for an explicit retry', async () => {
    const save = vi.fn().mockRejectedValueOnce(new Error('offline')).mockResolvedValue(undefined);
    const queue = new RevisionSaveQueue(save);
    queue.enqueue('A', 1);
    await expect(queue.flush()).rejects.toThrow('offline');
    expect(queue.isDirty('A')).toBe(true);
    await queue.flush();
    expect(save).toHaveBeenCalledTimes(2);
  });
});
