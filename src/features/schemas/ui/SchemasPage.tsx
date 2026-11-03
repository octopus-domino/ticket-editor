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
      getMeta: (s) => `${s.fields.length} полей`,
      getSearchText: (s) => s.name,
    }),
    [],
  );

  const bulkActions = useMemo<BulkAction<DataSchema>[]>(
    () => [
      {
        key: 'delete',
        label: 'Удалить',
        icon: '🗑',
        variant: 'danger',
        confirm: (ids) => ({
          title: `Удалить ${ids.length} ${plural(ids.length)}?`,
          description:
            'Схемы, к которым привязаны модели данных, удалить нельзя — сначала удалите модели.',
        }),
        onRun: async (ids) => {
          const result = await runBulk(ids, (id) => schemaStore.delete(id));
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
    (s: DataSchema) => navigate(`/app/schemas/${s.id}`),
    [navigate],
  );

  return (
    <div
      className="schema-page"
      style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: 12 }}
    >
      <div className="schema-fields-header">
        <h2>Схемы данных</h2>
        <Link to="/app/schemas/new" className="schema-btn-fill">
          + Новая схема
        </Link>
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
        searchPlaceholder="Поиск по названию схемы…"
        emptyText={
          schemas.length === 0
            ? 'Схем пока нет. Создайте первую.'
            : 'Ни одна схема не подходит под запрос.'
        }
        loading={loading}
      />
    </div>
  );
};

function plural(n: number): string {
  const m10 = n % 10;
  const m100 = n % 100;
  if (m10 === 1 && m100 !== 11) return 'схему';
  if (m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14)) return 'схемы';
  return 'схем';
}