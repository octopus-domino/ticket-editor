import { t as __tr } from '@/shared/i18n';
import React, { useCallback, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useSchemas } from '../state/useSchemas';
import { schemaStore } from '../state/SchemaStore';
import type { DataSchema } from '../domain/DataSchema';
import {
  SearchSelectList,
  type BulkAction,
  type ListItemAdapter,
} from '@/presentation/components/list';
import { toast } from '@/presentation/components/toast';
import { runBulk } from '@/shared/utils/bulk';

export const SchemasPage: React.FC = () => {
  const { schemas, loading, error } = useSchemas();
  const navigate = useNavigate();

  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set());

  const adapter = useMemo<ListItemAdapter<DataSchema>>(
    () => ({
      getId: (s) => s.id,
      getLabel: (s) => s.name,
      getMeta: (s) => __tr("{0} полей", s.fields.length),
      getSearchText: (s) => s.name,
    }),
    [],
  );

  const bulkActions = useMemo<BulkAction<DataSchema>[]>(
    () => [
      {
        key: 'delete',
        label: __tr("Удалить"),
        icon: '🗑',
        variant: 'danger',
        confirm: (ids) => ({
          title: __tr("Удалить {0} {1}?", ids.length, plural(ids.length)),
          description:
            __tr("Схемы, к которым привязаны наборы данных данных, удалить нельзя — сначала удалите наборы данных."),
        }),
        onRun: async (ids) => {
          const result = await runBulk(ids, (id) => schemaStore.delete(id));
          if (result.ok > 0) {
            toast.success(__tr("Удалено: {0} {1}", result.ok, plural(result.ok)));
          }
          if (result.failed.length > 0) {
            toast.error(
              __tr("Не удалось удалить: {0}", result.failed.length),
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
    (s: DataSchema) => navigate(`/app/schemas/${s.id}`),
    [navigate],
  );

  return (
    <div
      className="schema-page"
      style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: 12 }}
    >
      <div className="schema-fields-header">
        <h2>{__tr("Схемы данных")}</h2>
        <Link to="/app/schemas/new" className="schema-btn-fill">
          {__tr("+ Новая схема")}</Link>
      </div>

      {error && (
        <div className="schema-error" role="alert">
          {error}
        </div>
      )}

      <SearchSelectList<DataSchema>
        items={schemas}
        adapter={adapter}
        selectedIds={selectedIds}
        onSelectionChange={setSelectedIds}
        onItemClick={onItemClick}
        bulkActions={bulkActions}
        searchPlaceholder={__tr("Поиск по названию схемы…")}
        emptyText={
          schemas.length === 0
            ? __tr("Схем пока нет. Создайте первую.")
            : __tr("Ни одна схема не подходит под запрос.")
        }
        loading={loading}
      />
    </div>
  );
};

function plural(n: number): string {
  const m10 = n % 10;
  const m100 = n % 100;
  if (m10 === 1 && m100 !== 11) return __tr("схему");
  if (m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14)) return __tr("схемы");
  return __tr("схем");
}