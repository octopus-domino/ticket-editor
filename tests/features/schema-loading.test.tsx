import { afterEach, expect, it, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { schemaStore } from '@/features/schemas/state/SchemaStore';
import { useSchemas } from '@/features/schemas/state/useSchemas';

const repository = vi.hoisted(() => ({ list: vi.fn() }));
vi.mock('@/features/schemas/api/HttpSchemaRepository', () => ({
  httpSchemaRepository: repository,
}));
afterEach(() => {
  schemaStore.reset();
  vi.clearAllMocks();
});

it('treats an empty schema list as a completed load rather than loading forever', async () => {
  schemaStore.reset();
  repository.list.mockResolvedValue([]);
  const { result, rerender, unmount } = renderHook(() => useSchemas(), {
    wrapper: ({ children }) => <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>{children}</MemoryRouter>,
  });
  await waitFor(() => expect(schemaStore.getState().loaded).toBe(true));
  rerender();
  expect(result.current.loading).toBe(false);
  expect(result.current.schemas).toEqual([]);
  expect(repository.list).toHaveBeenCalledTimes(1);
  unmount();
});

it('does not attach the first schema when a document explicitly cleared its schema during loading', async () => {
  schemaStore.reset();
  let complete!: (schemas: unknown[]) => void;
  repository.list.mockReturnValue(new Promise((resolve) => { complete = resolve; }));
  const loading = schemaStore.loadAll();
  schemaStore.setActive(null);
  complete([{ id: 'S', name: 'Unrelated schema', fields: [] }]);
  await loading;
  expect(schemaStore.getState().schemas).toHaveLength(1);
  expect(schemaStore.getState().activeId).toBeNull();
});
