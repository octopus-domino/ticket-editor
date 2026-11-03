import { afterEach, describe, expect, it, vi } from 'vitest';
import { ModelStore } from '@/features/data-models/state/ModelStore';
import { ModelIO } from '@/features/data-models/api/ModelIO';
import type { DataModel } from '@/features/data-models/domain/DataModel';
import type { DataModelRepository } from '@/features/data-models/api/DataModelRepository';

const model = (id: string): DataModel => ({
  id,
  schemaId: 'S',
  name: id,
  values: {},
  createdAt: '',
  updatedAt: '',
});
afterEach(() => vi.useRealTimers());
describe('model saves and interchange', () => {
  it('saves both resources and never replaces newer local values with a server response', async () => {
    vi.useFakeTimers();
    let release!: (value: DataModel) => void;
    const update = vi
      .fn()
      .mockReturnValueOnce(
        new Promise<DataModel>((resolve) => {
          release = resolve;
        }),
      )
      .mockImplementation(async (id, patch) => ({ ...model(id), ...patch }));
    const repo = { update } as unknown as DataModelRepository;
    const store = new ModelStore(repo);
    store.setState({ ...store.getState(), models: [model('A'), model('B')] });
    store.patch('A', { values: { name: 'old' } });
    const flush = store.flush();
    store.patch('A', { values: { name: 'new' } });
    store.patch('B', { values: { value: 2 } });
    release({ ...model('A'), values: { name: 'old' } });
    await flush;
    await store.flush();
    expect(store.getState().models[0].values).toEqual({ name: 'new' });
    expect(update.mock.calls.map(([id]) => id)).toContain('B');
  });
  it('round trips schema IDs, IDs and nested values in version 1.0', () => {
    const io = new ModelIO();
    const value = {
      ...model('A'),
      values: { order: { items: [{ price: 0, available: false }] } },
    };
    const parsed = io.parse(io.export([value]));
    expect(parsed.ok).toBe(true);
    expect(parsed.schemaId).toBe('S');
    expect(parsed.models?.[0]).toEqual(expect.objectContaining({ id: 'A', values: value.values }));
  });
  it('reports invalid JSON, unknown versions and prototype payloads as inline issues', () => {
    const io = new ModelIO();
    for (const text of [
      '{',
      '{"version":"9","items":[]}',
      '{"values":{"__proto__":{"polluted":true}}}',
    ]) {
      expect(io.parse(text).ok).toBe(false);
      expect(io.parse(text).issues?.length).toBeGreaterThan(0);
    }
  });
});
