import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useStore } from '@/shared/store/store';
import { templateStore } from '../state/TemplateStore';
import { schemaStore } from '@/features/schemas/state/SchemaStore';
import { useSchemas } from '@/features/schemas/state/useSchemas';
import type { TemplateSummary } from '../domain/Template';
import {
  SearchSelectList,
  type BulkAction,
  type ListItemAdapter,
} from '@/presentation/components/list';
import { toast } from '@/presentation/components/toast';
import { runBulk } from '@/shared/utils/bulk';

export const TemplatesPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const highlightId = searchParams.get('highlight');
  const { schemas, activeSchema } = useSchemas();

  const items = useStore(templateStore, (s) => s.items);
  const loading = useStore(templateStore, (s) => s.loading);
  const error = useStore(templateStore, (s) => s.error);

  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set());

  useEffect(() => {
    void templateStore.loadAll(activeSchema?.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeSchema?.id]);

  useEffect(() => {
    setSelectedIds(new Set());
  }, [activeSchema?.id]);

  useEffect(() => {
    if (!highlightId || loading) return;
    const t = setTimeout(() => {
      const el = document.querySelector(`[data-template-id="${highlightId}"]`);
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 100);
    return () => clearTimeout(t);
  }, [highlightId, loading, items.length]);

  const adapter = useMemo<ListItemAdapter<TemplateSummary>>(
    () => ({
      getId: (t) => t.id,
      getLabel: (t) => t.name,
      getMeta: (t) => `${t.slideCount} слайд(ов)`,
      getSearchText: (t) => t.name,
    }),
    [],
  );

  const bulkActions = useMemo<BulkAction<TemplateSummary>[]>(
    () => [
      {
        key: 'delete',
        label: 'Удалить',
        icon: '🗑',
        variant: 'danger',
        confirm: (ids) => ({
          title: `Удалить ${ids.length} ${plural(ids.length)}?`,
          description: 'Действие необратимо.',
        }),
        onRun: async (ids) => {
          const result = await runBulk(ids, (id) => templateStore.delete(id));
          if (result.ok > 0) {
            toast.success(`Удалено: ${result.ok} ${plural(result.ok)}`);
          }
          if (result.failed.length > 0) {
            toast.error(
              `Не удалось удалить: ${result.failed.length}`,
              result.failed[0].message,
            );
          }
          setSelectedIds((prev) => {
            const next = new Set(prev);
            ids.forEach((id) => next.delete(id));
            return next;
          });
        },
      },
    ],
    [],
  );

  const onItemClick = useCallback(
    (t: TemplateSummary) => navigate(`/app/editor/${t.id}`),
    [navigate],
  );

  return (
    <div
      className="schema-page"
      style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: 12 }}
    >
      <div className="schema-fields-header">
        <h2>Шаблоны</h2>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <select
            className="gen-select"
            style={{ minWidth: 220 }}
            value={activeSchema?.id ?? ''}
            onChange={(e) => {
              const id = e.target.value;
              if (id) schemaStore.setActive(id);
            }}
          >
            {schemas.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
            {schemas.length === 0 && <option value="">— нет схем —</option>}
          </select>
          <Link to="/app" className="schema-btn-fill">
            + Новый (в редакторе)
          </Link>
        </div>
      </div>

      {error && (
        <div className="schema-error" role="alert">
          {error}
        </div>
      )}

      <SearchSelectList<TemplateSummary>
        items={items}
        adapter={adapter}
        selectedIds={selectedIds}
        onSelectionChange={setSelectedIds}
        onItemClick={onItemClick}
        bulkActions={bulkActions}
        searchPlaceholder="Поиск по названию шаблона…"
        emptyText={
          items.length === 0
            ? 'Шаблонов пока нет. Создайте документ в редакторе и сохраните.'
            : 'Ни один шаблон не подходит под запрос.'
        }
        loading={loading}
      />
    </div>
  );
};

function plural(n: number): string {
  const m10 = n % 10;
  const m100 = n % 100;
  if (m10 === 1 && m100 !== 11) return 'шаблон';
  if (m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14)) return 'шаблона';
  return 'шаблонов';
}