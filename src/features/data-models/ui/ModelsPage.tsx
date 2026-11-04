import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useStore } from '@/shared/store/store';
import { useSchemas } from '@/features/schemas/state/useSchemas';
import { modelStore } from '../state/ModelStore';
import { modelIO } from '../api/ModelIO';
import type { DataModel } from '../domain/DataModel';
import { ModelValuesEditor } from './ModelValuesEditor';
import { JsonImporterPanel } from './JsonImporterPanel';
import {
  SearchSelectList,
  type BulkAction,
  type ListItemAdapter,
} from '@/presentation/components/list';
import { toast } from '@/presentation/components/toast';
import { runBulk } from '@/shared/utils/bulk';

export const ModelsPage: React.FC = () => {
  const { schemas, activeSchema, loading: schemasLoading, selectSchema } = useSchemas();
  const [importerOpen, setImporterOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set());

  const models = useStore(modelStore, (s) => s.models);
  const activeModelId = useStore(modelStore, (s) => s.selectedId);
  const saveStatus = useStore(modelStore, (s) => s.saveStatus);
  const saveError = useStore(modelStore, (s) => s.saveError);
  const lastSavedAt = useStore(modelStore, (s) => s.lastSavedAt);
  const loading = useStore(modelStore, (s) => s.loading);
  const loadError = useStore(modelStore, (s) => s.error);

  useEffect(() => {
    if (activeSchema) void modelStore.load(activeSchema.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeSchema?.id]);

  useEffect(() => {
    setSelectedIds(new Set());
  }, [activeSchema?.id]);

  const activeModel = useMemo(
    () => models.find((m) => m.id === activeModelId) ?? null,
    [models, activeModelId],
  );

  const adapter = useMemo<ListItemAdapter<DataModel>>(
    () => ({
      getId: (m) => m.id,
      getLabel: (m) => m.name,
      getMeta: (m) => `${Object.keys(m.values).length} полей`,
      getSearchText: (m) => m.name,
    }),
    [],
  );

  const bulkActions = useMemo<BulkAction<DataModel>[]>(
    () => [
      {
        key: 'export',
        label: 'Экспорт',
        icon: '📤',
        onRun: async (ids) => {
          const toExport = models.filter((m) => ids.includes(m.id));
          if (toExport.length === 0) return;
          modelIO.download(toExport, `${activeSchema?.name ?? 'models'}-models.json`);
          toast.success(`Экспортировано: ${toExport.length}`);
        },
      },
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
          const result = await runBulk(ids, (id) => modelStore.remove(id));
          if (result.ok > 0) {
            toast.success(`Удалено: ${result.ok} ${plural(result.ok)}`);
          }
          if (result.failed.length > 0) {
            toast.error(`Не удалось удалить: ${result.failed.length}`, result.failed[0].message);
          }
          setSelectedIds((prev) => {
            const next = new Set(prev);
            ids.forEach((id) => next.delete(id));
            return next;
          });
        },
      },
    ],
    [models, activeSchema?.name],
  );

  const create = useCallback(async (): Promise<void> => {
    if (!activeSchema) return;
    try {
      await modelStore.create(activeSchema.id, 'Новый набор данных', {});
    } catch (e) {
      toast.error('Не удалось создать набор данных', (e as Error).message);
    }
  }, [activeSchema]);

  const importModels = useCallback(
    async (items: { name: string; values: Record<string, unknown> }[]): Promise<void> => {
      if (!activeSchema) return;
      try {
        await modelStore.importMany(activeSchema.id, items);
        setImporterOpen(false);
        toast.success(`Импортировано наборов данных: ${items.length}`);
      } catch (e) {
        toast.error('Не удалось импортировать', (e as Error).message);
      }
    },
    [activeSchema],
  );

  const saveStatusText = (): string => {
    if (saveStatus === 'saving') return '💾 Сохранение…';
    if (saveStatus === 'error') return `⚠ ${saveError ?? 'Не сохранено'}`;
    if (saveStatus === 'saved' && lastSavedAt) {
      const sec = Math.round((Date.now() - lastSavedAt) / 1000);
      return `💾 Сохранено ${sec < 5 ? 'только что' : `${sec} с назад`}`;
    }
    return '';
  };

  if (schemasLoading) return <div className="schema-page">Загрузка…</div>;

  if (schemas.length === 0) {
    return (
      <div className="schema-page">
        <h2>Наборы данных</h2>
        <p>Наборы данных привязаны к схеме. Сначала создайте схему.</p>
        <Link to="/app/schemas/new" className="schema-btn-submit">
          + Создать первую схему
        </Link>
      </div>
    );
  }

  if (!activeSchema)
    return (
      <div className="schema-page">
        <h2>Наборы данных</h2>
        <p>Выберите схему данных — она определяет поля, которые нужно заполнить.</p>
        <label htmlFor="data-schema">Схема данных</label>
        <select id="data-schema" value="" onChange={(event) => selectSchema(event.target.value)}>
          <option value="" disabled>
            Выберите схему данных
          </option>
          {schemas.map((schema) => (
            <option key={schema.id} value={schema.id}>
              {schema.name}
            </option>
          ))}
        </select>
        <Link to="/app/schemas/new" state={{ from: '/app/data-models' }}>
          + Создать схему данных
        </Link>
      </div>
    );

  return (
    <div className="dm-page">
      <aside className="dm-sidebar">
        <div className="dm-sidebar-head">
          <select
            className="gen-select"
            value={activeSchema.id}
            aria-label="Схема данных"
            onChange={(e) => selectSchema(e.target.value)}
          >
            {schemas.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
          <div className="dm-sidebar-actions">
            <button
              className="dm-btn-primary"
              disabled={!activeSchema}
              onClick={() => void create()}
            >
              + Новая
            </button>
            <button
              className="dm-btn-icon"
              onClick={() => setImporterOpen((v) => !v)}
              title="Импорт JSON"
            >
              📥
            </button>
          </div>
        </div>

        {importerOpen && <JsonImporterPanel schemaId={activeSchema?.id} onImport={importModels} />}
        {loadError && (
          <div className="schema-error" role="alert">
            {loadError}
          </div>
        )}

        <SearchSelectList<DataModel>
          items={models}
          adapter={adapter}
          selectedIds={selectedIds}
          onSelectionChange={setSelectedIds}
          activeId={activeModelId}
          onItemClick={(m) => modelStore.select(m.id)}
          bulkActions={bulkActions}
          searchPlaceholder="Поиск по названию набора данных…"
          emptyText="Наборов данных нет. Создайте новую или импортируйте JSON."
          loading={loading}
        />
      </aside>

      <main className="dm-main">
        {activeModel ? (
          <div className="dm-editor">
            <div className="dm-editor-head">
              <input
                className="dm-editor-name"
                value={activeModel.name}
                onChange={(e) => modelStore.patch(activeModel.id, { name: e.target.value })}
              />
              <span className={`dm-save-status dm-status-${saveStatus}`}>{saveStatusText()}</span>
            </div>
            <ModelValuesEditor
              modelId={activeModel.id}
              schema={activeSchema}
              values={activeModel.values}
              onChange={(values) => modelStore.patch(activeModel.id, { values })}
            />
          </div>
        ) : (
          <div className="dm-empty">Выберите набор данных или создайте новый</div>
        )}
      </main>
    </div>
  );
};

function plural(n: number): string {
  const m10 = n % 10;
  const m100 = n % 100;
  if (m10 === 1 && m100 !== 11) return 'набор данных';
  if (m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14)) return 'набора данных';
  return 'наборов данных';
}
