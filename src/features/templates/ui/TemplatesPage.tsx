import { t as __tr } from '@/shared/i18n';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useStore } from '@/shared/store/store';
import { templateStore } from '../state/TemplateStore';
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
  const { schemas } = useSchemas();
  const [schemaFilter, setSchemaFilter] = useState('');

  const allItems = useStore(templateStore, (s) => s.items);
  const items = allItems.filter(
    (item) =>
      !schemaFilter ||
      (schemaFilter === '__none__' ? !item.schemaId : item.schemaId === schemaFilter),
  );
  const loading = useStore(templateStore, (s) => s.loading);
  const error = useStore(templateStore, (s) => s.error);

  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set());

  useEffect(() => {
    void templateStore.loadAll();
  }, []);

  useEffect(() => {
    setSelectedIds(new Set());
  }, [schemaFilter]);

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
      getMeta: (t) => __tr("{0} слайд(ов)", t.slideCount),
      getSearchText: (t) => t.name,
    }),
    [],
  );

  const bulkActions = useMemo<BulkAction<TemplateSummary>[]>(
    () => [
      {
        key: 'delete',
        label: __tr("Удалить"),
        icon: '🗑',
        variant: 'danger',
        confirm: (ids) => ({
          title: __tr("Удалить {0} {1}?", ids.length, plural(ids.length)),
          description: __tr("Действие необратимо."),
        }),
        onRun: async (ids) => {
          const result = await runBulk(ids, (id) => templateStore.delete(id));
          if (result.ok > 0) {
            toast.success(__tr("Удалено: {0} {1}", result.ok, plural(result.ok)));
          }
          if (result.failed.length > 0) {
            toast.error(__tr("Не удалось удалить: {0}", result.failed.length), result.failed[0].message);
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
    (t: TemplateSummary) => navigate(`/app/templates/${t.id}/edit`),
    [navigate],
  );

  return (
    <div
      className="schema-page"
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        gap: 12,
      }}
    >
      <div className="schema-fields-header">
        <h2>{__tr("Шаблоны")}</h2>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <select
            className="gen-select"
            style={{ minWidth: 220 }}
            aria-label={__tr("Фильтр по схеме данных")}
            value={schemaFilter}
            onChange={(e) => setSchemaFilter(e.target.value)}
          >
            <option value="">{__tr("Все схемы данных")}</option>
            <option value="__none__">{__tr("Без схемы данных")}</option>
            {schemas.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
          <Link
            to={`/app/templates/new${schemaFilter && schemaFilter !== '__none__' ? `?schemaId=${encodeURIComponent(schemaFilter)}` : ''}`}
            className="schema-btn-fill"
          >
            {__tr("+ Создать шаблон")}</Link>
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
        searchPlaceholder={__tr("Поиск по названию шаблона…")}
        emptyText={
          items.length === 0
            ? __tr("Шаблонов пока нет. Нажмите «Создать шаблон»: дайте название и соберите макет. Данные можно добавить позже.")
            : __tr("Ни один шаблон не подходит под запрос.")
        }
        loading={loading}
      />
    </div>
  );
};

function plural(n: number): string {
  const m10 = n % 10;
  const m100 = n % 100;
  if (m10 === 1 && m100 !== 11) return __tr("шаблон");
  if (m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14)) return __tr("шаблона");
  return __tr("шаблонов");
}
