import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useStore } from '@/shared/store/store';
import { useDocumentStore } from '@/presentation/providers/EditorProvider';
import { useSchemas } from '@/features/schemas/state/useSchemas';
import { modelStore } from '@/features/data-models/state/ModelStore';
import { ModelValuesEditor } from '@/features/data-models/ui/ModelValuesEditor';
import { JsonImporterPanel } from '@/features/data-models/ui/JsonImporterPanel';
import { modelIO } from '@/features/data-models/api/ModelIO';
import type { DataModel } from '@/features/data-models/domain/DataModel';
import { resolveBindings } from '@/features/bindings/domain/BindingResolver';
import { validateGeneration } from '../domain/GenerationValidator';
import { generationStore } from '../state/GenerationStore';
import { SearchSelectList, type ListItemAdapter } from '@/presentation/components/list';
import { toast } from '@/presentation/components/toast';

const SUPPORTED = ['pdfa', 'pdf', 'svg'] as const;
type Format = (typeof SUPPORTED)[number];

export const GenerationPanel: React.FC = () => {
  const docStore = useDocumentStore();
  const slides = useStore(docStore, (s) => s.slides);
  const [params, setParams] = useSearchParams();

  const { activeSchema } = useSchemas();
  const models = useStore(modelStore, (s) => s.models);
  const selectedId = useStore(modelStore, (s) => s.selectedId);
  const saveStatus = useStore(modelStore, (s) => s.saveStatus);

  const format = (params.get('format') as Format) ?? 'pdfa';
  const packAs = (params.get('packAs') as 'zip' | 'single') ?? 'zip';
  const filenamePattern = params.get('fn') ?? 'ticket-{{name}}';
  const idsParam = params.get('models') ?? '';

  const [pickedIds, setPickedIds] = useState<Set<string>>(
    () => new Set(idsParam.split(',').filter(Boolean)),
  );
  const [importerOpen, setImporterOpen] = useState(false);

  const phase = useStore(generationStore, (s) => s.phase);
  const result = useStore(generationStore, (s) => s.result);
  const job = useStore(generationStore, (s) => s.job);
  const err = useStore(generationStore, (s) => s.error);

  useEffect(() => {
    if (activeSchema) void modelStore.load(activeSchema.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeSchema?.id]);

  const activeModel = models.find((m) => m.id === selectedId);
  const pickedModels = useMemo(
    () => models.filter((m) => pickedIds.has(m.id)),
    [models, pickedIds],
  );

  const modelAdapter = useMemo<ListItemAdapter<DataModel>>(
    () => ({
      getId: (m) => m.id,
      getLabel: (m) => m.name,
      getMeta: (m) => `${Object.keys(m.values).length}`,
      getSearchText: (m) => m.name,
    }),
    [],
  );

  const updateParams = useCallback(
    (patch: Record<string, string | null>) => {
      const next = new URLSearchParams(params);
      for (const [k, v] of Object.entries(patch)) {
        if (v === null || v === '') next.delete(k);
        else next.set(k, v);
      }
      setParams(next, { replace: true });
    },
    [params, setParams],
  );

  useEffect(() => {
    updateParams({
      models: Array.from(pickedIds).join(','),
      format,
      packAs,
      fn: filenamePattern,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pickedIds, format, packAs, filenamePattern]);

  useEffect(() => {
    if (packAs === 'single' && pickedIds.size > 1) {
      const first = Array.from(pickedIds)[0];
      setPickedIds(new Set([first]));
      modelStore.select(first);
    }
  }, [packAs, pickedIds]);

  const validationIssues = useMemo(
    () =>
      activeSchema
        ? validateGeneration({
            schema: activeSchema,
            bindings: resolveBindings(slides, docStore.getState().bindings),
            selectedModels:
              pickedModels.length > 0 ? pickedModels : activeModel ? [activeModel] : [],
            format,
            supportedFormats: [...SUPPORTED],
          })
        : [],
    [activeSchema, slides, pickedModels, activeModel, format, docStore],
  );

  const packAsIssues = useMemo(() => {
    if (packAs === 'single' && pickedModels.length > 1) {
      return [
        {
          kind: 'format' as const,
          message: 'Для «Один файл» выберите ровно одну модель.',
        },
      ];
    }
    return [];
  }, [packAs, pickedModels.length]);

  const blockingIssues = [...validationIssues, ...packAsIssues];
  const warnings = validationIssues.filter((i) => i.kind === 'model');
  const canRun = blockingIssues.length === 0;
  const useAsync = pickedModels.length > 100;

  const run = useCallback(async (): Promise<void> => {
    if (!activeSchema || !canRun) return;

    const modelsToRender =
      pickedModels.length > 0
        ? pickedModels
        : activeModel
          ? [activeModel]
          : [
              {
                id: '__empty__',
                name: 'empty',
                values: {},
                schemaId: activeSchema.id,
                createdAt: '',
                updatedAt: '',
              },
            ];

    const items = modelsToRender.map((model) => ({
      inlineValues: model.values,
    }));

    const req = {
      schemaId: activeSchema.id,
      bindings: resolveBindings(slides, docStore.getState().bindings),
      inlineSlides: slides,
      items,
      format,
      packAs,
      filenamePattern,
    };

    try {
      if (useAsync) {
        await generationStore.runAsync(req);
      } else {
        const r = await generationStore.runSync(req);
        downloadBlob(r.blob, r.filename);
      }
    } catch (e) {
      console.error('[generation] failed', e);
    }
  }, [
    activeSchema,
    canRun,
    pickedModels,
    activeModel,
    slides,
    format,
    packAs,
    filenamePattern,
    useAsync,
    docStore,
  ]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === 'Enter') {
        e.preventDefault();
        if (canRun) void run();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [run, canRun]);

  const importModels = async (
    items: { name: string; values: Record<string, unknown> }[],
  ): Promise<void> => {
    if (!activeSchema) return;
    try {
      await modelStore.importMany(activeSchema.id, items);
      setImporterOpen(false);
      toast.success(`Импортировано моделей: ${items.length}`);
    } catch (e) {
      toast.error('Не удалось импортировать', (e as Error).message);
    }
  };

  if (!activeSchema) {
    return (
      <div className="dp-container">
        <div className="schema-error">
          Схема не выбрана. Откройте вкладку «Данные» и выберите схему.
        </div>
      </div>
    );
  }

  return (
    <div className="dp-container" style={{ overflowY: 'auto' }}>
      <div className="gen-preview">
        <div style={{ fontWeight: 600 }}>📄 {activeSchema.name}</div>
        <div className="schema-hint">
          Слайдов: {slides.length} · Моделей: {models.length}
        </div>
      </div>

      <div
        className="dp-section-title"
        style={{ display: 'flex', justifyContent: 'space-between' }}
      >
        <span>Модели</span>
        <span style={{ display: 'flex', gap: 4 }}>
          <button className="dp-btn" onClick={() => setImporterOpen((v) => !v)} title="Импорт JSON">
            📥
          </button>
          <button
            className="dp-btn"
            onClick={() => modelIO.download(models, `${activeSchema.name}-models.json`)}
            title="Экспорт JSON"
          >
            📤
          </button>
        </span>
      </div>

      {importerOpen && <JsonImporterPanel schemaId={activeSchema?.id} onImport={importModels} />}

      <SearchSelectList<DataModel>
        items={models}
        adapter={modelAdapter}
        selectedIds={pickedIds}
        onSelectionChange={setPickedIds}
        activeId={selectedId}
        onItemClick={(m) => modelStore.select(m.id)}
        bulkActions={[]}
        searchPlaceholder="Поиск по названию модели…"
        emptyText={
          <span>Моделей нет. Создайте в разделе «Данные» или нажмите 📥 для импорта.</span>
        }
        maxHeight={260}
        minHeight={140}
      />

      {blockingIssues.length > 0 && (
        <div className="schema-error" style={{ marginTop: 12 }}>
          {blockingIssues.map((i, k) => (
            <div key={k}>⚠ {i.message}</div>
          ))}
        </div>
      )}

      {warnings.length > 0 && (
        <div className="gen-warning" style={{ marginTop: 12 }}>
          {warnings.slice(0, 5).map((i, k) => (
            <div key={k}>⚠ {i.message}</div>
          ))}
          {warnings.length > 5 && <div>…и ещё {warnings.length - 5}</div>}
        </div>
      )}

      {activeModel && (
        <div style={{ marginTop: 12 }}>
          <div
            className="dp-section-title"
            style={{ display: 'flex', justifyContent: 'space-between' }}
          >
            <span>Поля: {activeModel.name}</span>
            {saveStatus === 'saving' && (
              <span style={{ fontSize: 10, color: '#94a3b8' }}>💾...</span>
            )}
            {saveStatus === 'saved' && (
              <span style={{ fontSize: 10, color: '#16a34a' }}>✓ сохранено</span>
            )}
          </div>
          <ModelValuesEditor
            modelId={activeModel.id}
            schema={activeSchema}
            values={activeModel.values}
            onChange={(values) => modelStore.patch(activeModel.id, { values })}
          />
        </div>
      )}

      <div className="dp-section-title" style={{ marginTop: 16 }}>
        Параметры
      </div>

      <label className="gen-label">
        Формат
        <select
          className="gen-select"
          value={format}
          onChange={(e) => updateParams({ format: e.target.value })}
        >
          <option value="pdfa">PDF/A-2b</option>
          <option value="pdf">PDF</option>
          <option value="svg">SVG</option>
        </select>
      </label>

      <label className="gen-label">
        Упаковка
        <select
          className="gen-select"
          value={packAs}
          onChange={(e) => updateParams({ packAs: e.target.value })}
        >
          <option value="zip">ZIP</option>
          <option value="single">Один файл (если 1 модель)</option>
        </select>
      </label>

      <label className="gen-label">
        Шаблон имени
        <input
          className="gen-input"
          value={filenamePattern}
          onChange={(e) => updateParams({ fn: e.target.value })}
        />
      </label>

      <button
        className="dp-btn-submit"
        onClick={() => void run()}
        disabled={!canRun || phase === 'async-running' || phase === 'sync-running'}
        style={{ marginTop: 16 }}
        title="Ctrl+Enter"
      >
        {phase === 'sync-running'
          ? 'Генерация…'
          : phase === 'async-running'
            ? 'В очереди…'
            : 'Сгенерировать (Ctrl+Enter)'}
      </button>

      {phase === 'async-running' && job && (
        <div className="gen-progress" style={{ marginTop: 12 }}>
          <div>
            Прогресс: {job.progress.completed} / {job.progress.total}
          </div>
          <progress value={job.progress.completed} max={job.progress.total} />
          {job.errors.length > 0 && (
            <details style={{ marginTop: 8 }}>
              <summary>Ошибок: {job.errors.length}</summary>
              {job.errors.slice(0, 5).map((e, k) => (
                <div key={k} style={{ fontSize: 11 }}>
                  #{e.index}: {e.message}
                </div>
              ))}
            </details>
          )}
        </div>
      )}
      {phase === 'async-done' && result && (
        <div className="gen-status done" style={{ marginTop: 12 }}>
          Готово: {result.count}.{' '}
          <button className="dp-btn" onClick={() => downloadBlob(result.blob, result.filename)}>
            Скачать
          </button>
        </div>
      )}
      {err && (
        <div className="schema-error" style={{ marginTop: 12 }}>
          {err}
        </div>
      )}
    </div>
  );
};

function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
