import { afterEach, expect, it, vi } from 'vitest';
import { fireEvent, render, renderHook, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { schemaStore } from '@/features/schemas/state/SchemaStore';
import { useSchemas } from '@/features/schemas/state/useSchemas';
import { SchemaEditorPage } from '@/features/schemas/ui/SchemaEditorPage';
import { t } from '@/shared/i18n';

const repository = vi.hoisted(() => ({ list: vi.fn(), update: vi.fn() }));
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

it('keeps the authored order of root fields and array columns when reopening and saving a schema', async () => {
  const fields = ['total', 'items', 'items.quantity', 'items.name', 'comment'].map(path => ({
    path, type: path === 'items' ? 'array' : 'string', required: false, label: path,
  }));
  const schema = { id: 'order-schema', name: 'Order', fields };
  repository.list.mockResolvedValue([schema]);
  repository.update.mockResolvedValue(schema);
  await schemaStore.loadAll();
  render(<MemoryRouter><SchemaEditorPage schemaIdOverride={schema.id} onSaved={vi.fn()} /></MemoryRouter>);
  await screen.findByDisplayValue('total');
  expect(screen.getAllByPlaceholderText('event.title').map(field => (field as HTMLInputElement).value))
    .toEqual(['total', 'items', 'quantity', 'name', 'comment']);
  fireEvent.click(screen.getByRole('button', { name: t('Сохранить') }));
  await waitFor(() => expect(repository.update).toHaveBeenCalledWith(schema.id, { name: schema.name, fields }));
});
