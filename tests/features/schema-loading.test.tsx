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
