import { describe, expect, it, vi } from 'vitest';
import { DocumentPersistence } from '@/application/use-cases/DocumentPersistence';

describe('document durability', () => {
  it('does not save unchanged content again but persists a schema-only change', async () => {
    const drafts = { write: vi.fn().mockResolvedValue(undefined), read: vi.fn(), remove: vi.fn().mockResolvedValue(undefined) };
    const save = vi.fn().mockResolvedValue(undefined), notify = vi.fn();
    const persistence = new DocumentPersistence('A', drafts, save, notify);
    persistence.update({ text: 'hello' }, 'schema-a');
    await persistence.flush();
    persistence.update({ text: 'hello' }, 'schema-a');
    await persistence.flush();
    expect(save).toHaveBeenCalledTimes(1);
    persistence.update({ text: 'hello' }, null);
    await persistence.flush();
    expect(save).toHaveBeenCalledTimes(2);
  });
  it('keeps a recovery copy when remote saving fails, and clears it after retry', async () => {
    const drafts = {
      write: vi.fn().mockResolvedValue(undefined),
      read: vi.fn(),
      remove: vi.fn().mockResolvedValue(undefined),
    };
    const save = vi.fn().mockRejectedValueOnce(new Error('offline')).mockResolvedValue(undefined);
    const notify = vi.fn();
    const persistence = new DocumentPersistence('owner:document', drafts, save, notify);
    persistence.update({ value: 1 });
    await expect(persistence.flush()).rejects.toThrow('offline');
    expect(drafts.write).toHaveBeenCalledWith(
      'owner:document',
      expect.objectContaining({ snapshot: { value: 1 } }),
    );
    expect(drafts.remove).not.toHaveBeenCalled();
    await persistence.flush();
    expect(drafts.remove).toHaveBeenCalledWith('owner:document', expect.any(String));
    expect(notify).toHaveBeenLastCalledWith('saved');
  });
  it('flushes the last revision instead of reverting it after an older save', async () => {
    const drafts = {
      write: vi.fn().mockResolvedValue(undefined),
      read: vi.fn(),
      remove: vi.fn().mockResolvedValue(undefined),
    };
    let release!: () => void;
    let signalStarted!: () => void;
    const started = new Promise<void>((resolve) => {
      signalStarted = resolve;
    });
    const save = vi
      .fn()
      .mockImplementationOnce(() => {
        signalStarted();
        return new Promise<void>((resolve) => {
          release = resolve;
        });
      })
      .mockResolvedValue(undefined);
    const persistence = new DocumentPersistence('A', drafts, save, vi.fn());
    persistence.update(1);
    const first = persistence.flush();
    await started;
    persistence.update(2);
    release();
    await first;
    expect(save.mock.calls.map(([snapshot]) => snapshot)).toEqual([1, 2]);
    expect(drafts.remove).toHaveBeenCalledTimes(1);
  });
});
