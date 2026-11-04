import { t as __tr } from '@/shared/i18n';
import React, { useEffect, useMemo, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useStore } from '@/shared/store/store';
import { inferFieldsFromSlides, flattenFields } from '@/features/schemas/domain/SchemaInference';
import { useSchemas } from '@/features/schemas/state/useSchemas';
import { schemaStore } from '@/features/schemas/state/SchemaStore';
import { modelStore } from '@/features/data-models/state/ModelStore';
import { getPath } from '@/features/data-models/domain/DataModelValidator';
import { ModelValuesEditor } from '@/features/data-models/ui/ModelValuesEditor';
import { ExcelActions } from '@/features/data-models/ui/ExcelActions';
import { JsonImporterPanel } from '@/features/data-models/ui/JsonImporterPanel';
import type { DataModel } from '@/features/data-models/domain/DataModel';
import { useDocumentStore } from '../providers/EditorProvider';
import {
  SearchSelectList,
  type BulkAction,
  type ListItemAdapter,
} from '@/presentation/components/list';
import { toast } from '@/presentation/components/toast';
import { runBulk } from '@/shared/utils/bulk';

export const DataPanel: React.FC = () => {
  const docStore = useDocumentStore();
  const location = useLocation();
  const { schemas, activeSchema, loading, error, selectSchema } = useSchemas();

  const models = useStore(modelStore, (s) => s.models);
  const activeModelId = useStore(modelStore, (s) => s.selectedId);

  const [uiError, setUiError] = useState<string | null>(null);
  const [valuesOpen, setValuesOpen] = useState(false);
  const [importerOpen, setImporterOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [selectedModelIds, setSelectedModelIds] = useState<Set<string>>(() => new Set());

  const returnTo = location.pathname + location.search;

  useEffect(() => {
    if (activeSchema) void modelStore.load(activeSchema.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeSchema?.id]);

  useEffect(() => {
    setSelectedModelIds(new Set());
  }, [activeSchema?.id]);

  const activeModel = models.find((m) => m.id === activeModelId);

  const modelAdapter = useMemo<ListItemAdapter<DataModel>>(
    () => ({
      getId: (m) => m.id,
      getLabel: (m) => m.name,
      getMeta: (m) => `${Object.keys(m.values).length}`,
      getSearchText: (m) => m.name,
    }),
    [],
  );

  const modelBulkActions = useMemo<BulkAction<DataModel>[]>(
    () => [
      {
        key: 'delete',
        label: __tr('Удалить'),
        icon: '🗑',
        variant: 'danger',
        confirm: (ids) => ({
          title: __tr('Удалить {0} {1}?', ids.length, pluralModels(ids.length)),
          description: __tr('Действие необратимо.'),
        }),
        onRun: async (ids) => {
          const result = await runBulk(ids, (id) => modelStore.remove(id));
          if (result.ok > 0) toast.success(__tr('Удалено: {0}', result.ok));
          if (result.failed.length > 0) {
            toast.error(
              __tr('Не удалось удалить: {0}', result.failed.length),
              result.failed[0].message,
            );
          }
          setSelectedModelIds((prev) => {
            const next = new Set(prev);
            ids.forEach((id) => next.delete(id));
            return next;
          });
        },
      },
    ],
    [],
  );

  const createFromDocument = async (): Promise<void> => {
    const slides = docStore.getState().slides;
    const inferred = inferFieldsFromSlides(slides);
    if (inferred.length === 0) {
      setUiError(__tr('В документе нет {{...}} или fieldPath. Добавьте плейсхолдер на холст.'));
      return;
    }
    setUiError(null);
    try {
      const created = await schemaStore.create({
        name: __tr('Схема {0}', new Date().toLocaleDateString('ru-RU')),
        fields: inferred,
      });
      selectSchema(created.id);
    } catch (e) {
      setUiError((e as Error).message);
    }
  };

  const createEmpty = async (): Promise<void> => {
    setUiError(null);
    try {
      const created = await schemaStore.create({
        name: __tr('Новая схема'),
        fields: [
          { path: 'title', type: 'string', required: true, label: __tr('Заголовок') },
          { path: 'subtitle', type: 'string', required: false, label: __tr('Подзаголовок') },
        ],
      });
      selectSchema(created.id);
    } catch (e) {
      setUiError((e as Error).message);
    }
  };

  const createModel = async (): Promise<void> => {
    if (!activeSchema) return;
    setCreating(true);
    setUiError(null);
    try {
      await modelStore.create(activeSchema.id, __tr('Новый набор данных'), {});
    } catch (e) {
      setUiError((e as Error).message);
    } finally {
      setCreating(false);
    }
  };

  const onDragField = (e: React.DragEvent, path: string, type: string): void => {
    let sample = '';
    if (activeModel) {
      const v = getPath(activeModel.values, path);
      if (v !== undefined && v !== null) sample = String(v);
    }
    e.dataTransfer.setData(
      'application/json',
      JSON.stringify({ kind: 'field', path, fieldType: type, sample }),
    );
    e.dataTransfer.effectAllowed = 'copy';
  };

  const onDragArray = (e: React.DragEvent, path: string): void => {
    if (!activeSchema) return;
    const flat = flattenFields(activeSchema.fields);
    const prefix = `${path}.`;
    const arrayChildren = flat
      .filter((f) => f.path.startsWith(prefix))
      .map((f): { name: string; type: string } | null => {
        const rel = f.path.slice(prefix.length);
        if (rel.includes('.')) return null;
        if (f.type === 'array' || f.type === 'object') return null;
        return { name: rel, type: f.type };
      })
      .filter((c): c is { name: string; type: string } => c !== null);

    let sampleCount = 3;
    if (activeModel) {
      const arr = getPath(activeModel.values, path);
      if (Array.isArray(arr) && arr.length > 0) sampleCount = arr.length;
    }

    e.dataTransfer.setData(
      'application/json',
      JSON.stringify({
        kind: 'array',
        path,
        arrayName: path.split('.').pop(),
        sampleCount,
        arrayChildren,
      }),
    );
    e.dataTransfer.effectAllowed = 'copy';
  };

  if (loading)
    return (
      <div className="dp-container">
        <div className="schema-hint">{__tr('Загрузка…')}</div>
      </div>
    );
  if (error)
    return (
      <div className="dp-container">
        <div className="schema-error">{error}</div>
      </div>
    );

  if (!activeSchema) {
    return (
      <div className="dp-container">
        <div className="dp-section-title">{__tr('Добавьте схему данных')}</div>
        <p className="schema-hint">
          {__tr('Выберите существующую схему или создайте новую прямо здесь.')}
        </p>
        {schemas.length > 0 && (
          <select
            className="dp-select-model"
            aria-label={__tr('Схема данных')}
            value=""
            onChange={(event) => selectSchema(event.target.value)}
          >
            <option value="" disabled>
              {__tr('Выберите схему')}
            </option>
            {schemas.map((schema) => (
              <option key={schema.id} value={schema.id}>
                {schema.name}
              </option>
            ))}
          </select>
        )}
        {uiError && <div className="schema-error">{uiError}</div>}
        <button className="dp-btn-submit" onClick={() => void createFromDocument()}>
          {__tr('⤓ Создать из документа')}
        </button>
        <button
          className="dp-btn"
          onClick={() => void createEmpty()}
          style={{ marginTop: 8, width: '100%' }}
        >
          {__tr('+ Создать схему')}
        </button>
      </div>
    );
  }

  const leafFields = flattenFields(activeSchema.fields).filter(
    (f) => f.type !== 'object' && f.type !== 'array',
  );
  const arrayFields = flattenFields(activeSchema.fields).filter((f) => f.type === 'array');

  return (
    <div className="dp-container">
      <div className="dp-toolbar" style={{ flexDirection: 'column', gap: 4 }}>
        <select
          className="dp-select-model"
          aria-label={__tr('Схема данных')}
          value={activeSchema.id}
          onChange={(e) => selectSchema(e.target.value)}
        >
          {schemas.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
        <div style={{ display: 'flex', gap: 6, fontSize: 11 }}>
          <Link
            to={`/app/schemas/${activeSchema.id}`}
            state={{ from: returnTo }}
            style={{ color: 'var(--accent)' }}
          >
            {__tr('✎ Редактировать схему')}
          </Link>
        </div>
      </div>

      <div className="dp-section-title">{__tr('Поля (drag на холст)')}</div>
      <ExcelActions
        schema={activeSchema}
        models={models.filter((model) => model.schemaId === activeSchema.id)}
      />
      <button type="button" onClick={() => setImporterOpen(!importerOpen)}>
        Excel / JSON ↑
      </button>
      {importerOpen && (
        <JsonImporterPanel
          schemaId={activeSchema.id}
          onImport={async (items) => {
            await modelStore.importMany(activeSchema.id, items);
            setImporterOpen(false);
          }}
        />
      )}
      <div className="dp-list">
        {leafFields.map((f) => (
          <div
            key={f.path}
            className="dp-field-chip"
            draggable
            onDragStart={(e) => onDragField(e, f.path, f.type)}
          >
            <span>{f.path}</span>
            <span className="schema-hint">{f.type}</span>
          </div>
        ))}
        {leafFields.length === 0 && <div className="schema-hint">{__tr('Нет полей')}</div>}
      </div>

      {arrayFields.length > 0 && (
        <>
          <div className="dp-section-title">{__tr('Массивы (drag → таблица)')}</div>
          <div className="dp-list">
            {arrayFields.map((f) => (
              <div
                key={f.path}
                className="dp-field-chip"
                draggable
                onDragStart={(e) => onDragArray(e, f.path)}
              >
                <span>{f.path}</span>
                <span className="schema-hint">{__tr('→ таблица')}</span>
              </div>
            ))}
          </div>
        </>
      )}

      <div
        className="dp-section-title"
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginTop: 12,
        }}
      >
        <span>{__tr('Наборы данных')}</span>
        <button
          className="dp-btn"
          onClick={() => void createModel()}
          disabled={creating}
          title={__tr('Создать новый набор данных')}
          style={{ fontSize: 11 }}
        >
          {creating ? '…' : __tr('+ Новая')}
        </button>
      </div>

      <SearchSelectList<DataModel>
        items={models}
        adapter={modelAdapter}
        selectedIds={selectedModelIds}
        onSelectionChange={setSelectedModelIds}
        activeId={activeModelId}
        onItemClick={(m) => modelStore.select(m.id)}
        bulkActions={modelBulkActions}
        searchPlaceholder={__tr('Поиск по названию набора данных…')}
        emptyText={
          <span>
            {__tr('Нет наборов данных. Создайте через')}
            <Link to="/app/data-models">{__tr('Данные')}</Link> {__tr('или нажмите «+ Новая».')}
          </span>
        }
        maxHeight={240}
        minHeight={140}
      />

      {activeModel && (
        <>
          <div
            className="dp-section-title"
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              cursor: 'pointer',
              marginTop: 12,
            }}
            onClick={() => setValuesOpen((v) => !v)}
          >
            <span>
              {__tr('Значения:')}
              {activeModel.name}
            </span>
            <span style={{ fontSize: 11 }}>{valuesOpen ? '▾' : '▸'}</span>
          </div>
          {valuesOpen && (
            <div style={{ maxHeight: 380, overflowY: 'auto', marginTop: 6 }}>
              <ModelValuesEditor
                modelId={activeModel.id}
                schema={activeSchema}
                values={activeModel.values}
                onChange={(values) => modelStore.patch(activeModel.id, { values })}
              />
            </div>
          )}
          <button
            className="dp-btn-submit"
            onClick={() => docStore.applyModelToSlides(activeModel.values)}
            style={{ marginTop: 8 }}
          >
            {__tr('Применить набор данных к холсту')}
          </button>
        </>
      )}

      {uiError && <div className="schema-error">{uiError}</div>}
    </div>
  );
};

function pluralModels(n: number): string {
  const m10 = n % 10;
  const m100 = n % 100;
  if (m10 === 1 && m100 !== 11) return __tr('набор данных');
  if (m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14)) return __tr('набора данных');
  return __tr('наборов данных');
}
