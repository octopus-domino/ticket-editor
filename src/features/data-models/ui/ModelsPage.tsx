import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useStore } from '@/shared/store/store';
import type { DataSchema } from '@/features/schemas/domain/DataSchema';
import { useSchemas } from '@/features/schemas/state/useSchemas';
import { schemaStore } from '@/features/schemas/state/SchemaStore';
import { modelStore } from '../state/ModelStore';
import { modelIO } from '../api/ModelIO';
import { ModelList } from './ModelList';
import { ModelValuesEditor } from './ModelValuesEditor';
import { JsonImporterPanel } from './JsonImporterPanel';

export const ModelsPage: React.FC = () => {
  const { schemas, activeSchema, loading: schemasLoading } = useSchemas();
  const [importerOpen, setImporterOpen] = useState(false);
  const [checkedForExport, setCheckedForExport] = useState<Set<string>>(new Set());
  const [actionError, setActionError] = useState<string | null>(null);

  const models = useStore(modelStore, (s) => s.models);
  const selectedId = useStore(modelStore, (s) => s.selectedId);
  const saveStatus = useStore(modelStore, (s) => s.saveStatus);
  const saveError = useStore(modelStore, (s) => s.saveError);
  const lastSavedAt = useStore(modelStore, (s) => s.lastSavedAt);
  const loading = useStore(modelStore, (s) => s.loading);
  const loadError = useStore(modelStore, (s) => s.error);

  useEffect(() => {
    if (activeSchema) void modelStore.load(activeSchema.id);
  }, [activeSchema?.id]);

  const activeModel = useMemo(
    () => models.find((m) => m.id === selectedId) ?? null,
    [models, selectedId],
  );

  const create = async (): Promise<void> => {
    if (!activeSchema) return;
    try {
      await modelStore.create(activeSchema.id, 'Новая модель', {});
    } catch (e) {
      setActionError((e as Error).message);
    }
  };

  const importModels = async (items: { name: string; values: Record<string, unknown> }[]): Promise<void> => {
    if (!activeSchema) return;
    try {
      await modelStore.importMany(activeSchema.id, items);
      setImporterOpen(false);
      setActionError(null);
    } catch (e) {
      setActionError((e as Error).message);
    }
  };

  const exportModels = (mode: 'all' | 'selected'): void => {
    if (!activeSchema) return;
    const toExport = mode === 'all'
      ? models
      : models.filter((m) => checkedForExport.has(m.id));
    if (toExport.length === 0) {
      setActionError('Нечего экспортировать: выберите модели или используйте «все».');
      return;
    }
    setActionError(null);
    modelIO.download(toExport, `${activeSchema.name}-models.json`);
  };

  const toggleCheck = (id: string): void => {
    setCheckedForExport((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

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
        <h2>Модели данных</h2>
        <p>Модели данных привязаны к схеме. Сначала создайте схему.</p>
        <Link to="/schemas/new" className="schema-btn-submit">+ Создать первую схему</Link>
      </div>
    );
  }

  if (!activeSchema) return <div className="schema-page">Схема не выбрана</div>;

  return (
    <div className="dm-page">
      <aside className="dm-sidebar">
        <div className="dm-sidebar-head">
          <select
            className="gen-select"
            value={activeSchema.id}
            onChange={(e) => schemaStore.setActive(e.target.value)}
          >
            {schemas.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
          <div className="dm-sidebar-actions">
            <button className="dm-btn-primary" disabled={!activeSchema} onClick={() => void create()}>
              + Новая
            </button>
            <button className="dm-btn-icon" onClick={() => setImporterOpen((v) => !v)} title="Импорт JSON">📥</button>
            <button
              className="dm-btn-icon"
              onClick={() => exportModels('selected')}
              disabled={checkedForExport.size === 0}
              title={`Экспорт выбранных (${checkedForExport.size})`}
            >📤</button>
          </div>
          {checkedForExport.size > 0 && (
            <button
              className="dp-btn"
              onClick={() => exportModels('all')}
              style={{ marginTop: 4 }}
              title="Экспортировать все модели"
            >📤 Экспорт всех</button>
          )}
        </div>

        {importerOpen && <JsonImporterPanel onImport={importModels} />}
        {loading && <div className="schema-hint" style={{ padding: 12 }}>Загрузка…</div>}
        {loadError && <div className="schema-error">{loadError}</div>}
        {actionError && <div className="schema-error">{actionError}</div>}

        <ModelList
          models={models}
          selectedId={selectedId}
          checkedForExport={checkedForExport}
          onSelect={(id) => modelStore.select(id)}
          onToggleCheck={toggleCheck}
          onRemove={(id) => void modelStore.remove(id)}
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
          <div className="dm-empty">Выберите модель или создайте новую</div>
        )}
      </main>
    </div>
  );
};