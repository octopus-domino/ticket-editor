import { t as __tr } from '@/shared/i18n';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useStore } from '@/shared/store/store';
import { useSchemas } from '@/features/schemas/state/useSchemas';
import { modelStore } from '../state/ModelStore';
import { modelIO } from '../api/ModelIO';
import type { DataModel } from '../domain/DataModel';
import { ModelValuesEditor } from './ModelValuesEditor';
import { JsonImporterPanel } from './JsonImporterPanel';
import { ExcelActions } from './ExcelActions';
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
      getMeta: (m) => __tr("{0} полей", Object.keys(m.values).length),
      getSearchText: (m) => m.name,
    }),
    [],
  );

  const bulkActions = useMemo<BulkAction<DataModel>[]>(
    () => [
      {
        key: 'export',
        label: __tr("Экспорт"),
        icon: '📤',
        onRun: async (ids) => {
          const toExport = models.filter((m) => ids.includes(m.id));
          if (toExport.length === 0) return;
          modelIO.download(toExport, `${activeSchema?.name ?? 'models'}-models.json`);
          toast.success(__tr("Экспортировано: {0}", toExport.length));
        },
      },
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
          const result = await runBulk(ids, (id) => modelStore.remove(id));
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
    [models, activeSchema?.name],
  );

  const create = useCallback(async (): Promise<void> => {
    if (!activeSchema) return;
    try {
      await modelStore.create(activeSchema.id, __tr("Новый набор данных"), {});
    } catch (e) {
      toast.error(__tr("Не удалось создать набор данных"), (e as Error).message);
    }
  }, [activeSchema]);

  const importModels = useCallback(
    async (items: { name: string; values: Record<string, unknown> }[]): Promise<void> => {
      if (!activeSchema) return;
      try {
        await modelStore.importMany(activeSchema.id, items);
        setImporterOpen(false);
        toast.success(__tr("Импортировано наборов данных: {0}", items.length));
      } catch (e) {
        toast.error(__tr("Не удалось импортировать"), (e as Error).message);
      }
    },
    [activeSchema],
  );

  const saveStatusText = (): string => {
    if (saveStatus === 'saving') return __tr("💾 Сохранение…");
    if (saveStatus === 'error') return `⚠ ${saveError ?? __tr("Не сохранено")}`;
    if (saveStatus === 'saved' && lastSavedAt) {
      const sec = Math.round((Date.now() - lastSavedAt) / 1000);
      return __tr("💾 Сохранено {0}", sec < 5 ? 'только что' : `${sec} с назад`);
    }
    return '';
  };

  if (schemasLoading) return <div className="schema-page">{__tr("Загрузка…")}</div>;

  if (schemas.length === 0) {
    return (
      <div className="schema-page">
        <h2>{__tr("Наборы данных")}</h2>
        <p>{__tr("Наборы данных привязаны к схеме. Сначала создайте схему.")}</p>
        <Link to="/app/schemas/new" className="schema-btn-submit">
          {__tr("+ Создать первую схему")}</Link>
      </div>
    );
  }

  if (!activeSchema)
    return (
      <div className="schema-page">
        <h2>{__tr("Наборы данных")}</h2>
        <p>{__tr("Выберите схему данных — она определяет поля, которые нужно заполнить.")}</p>
        <label htmlFor="data-schema">{__tr("Схема данных")}</label>
        <select id="data-schema" value="" onChange={(event) => selectSchema(event.target.value)}>
          <option value="" disabled>
            {__tr("Выберите схему данных")}</option>
          {schemas.map((schema) => (
            <option key={schema.id} value={schema.id}>
              {schema.name}
            </option>
          ))}
        </select>
        <Link to="/app/schemas/new" state={{ from: '/app/data-models' }}>
          {__tr("+ Создать схему данных")}</Link>
      </div>
    );

  return (
    <div className="dm-page">
      <aside className="dm-sidebar">
        <div className="dm-sidebar-head">
          <select
            className="gen-select"
            value={activeSchema.id}
            aria-label={__tr("Схема данных")}
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
              {__tr("+ Новая")}</button>
            <button
              className="dm-btn-icon"
              onClick={() => setImporterOpen((v) => !v)}
              title={__tr("Импорт JSON")}
            >
              📥
            </button>
          </div>
        </div>

        {importerOpen && <JsonImporterPanel schemaId={activeSchema?.id} onImport={importModels} />}
        <ExcelActions schema={activeSchema} models={selectedIds.size ? models.filter((model) => selectedIds.has(model.id)) : models}/>
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
          searchPlaceholder={__tr("Поиск по названию набора данных…")}
          emptyText={__tr("Наборов данных нет. Создайте новую или импортируйте JSON.")}
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
          <div className="dm-empty">{__tr("Выберите набор данных или создайте новый")}</div>
        )}
      </main>
    </div>
  );
};

function plural(n: number): string {
  const m10 = n % 10;
  const m100 = n % 100;
  if (m10 === 1 && m100 !== 11) return __tr("набор данных");
  if (m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14)) return __tr("набора данных");
  return __tr("наборов данных");
}
