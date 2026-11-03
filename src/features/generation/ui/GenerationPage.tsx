import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useStore } from '@/shared/store/store';
import { templateStore } from '@/features/templates/state/TemplateStore';
import { useSchemas } from '@/features/schemas/state/useSchemas';
import { modelStore } from '@/features/data-models/state/ModelStore';
import type { DataModel } from '@/features/data-models/domain/DataModel';
import { httpGenerationClient } from '../api/HttpGenerationClient';
import type {
  GenerationRequest,
  GenerationResult,
} from '../api/GenerationClient';
import {
  SearchSelectList,
  type ListItemAdapter,
} from '@/presentation/components/list';
import { toast } from '@/presentation/components/toast';

const SUPPORTED = ['pdfa', 'pdf', 'svg'] as const;
type Format = (typeof SUPPORTED)[number];

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

export const GenerationPage: React.FC = () => {
  const [params, setParams] = useSearchParams();
  const { activeSchema } = useSchemas();

  const templates = useStore(templateStore, (s) => s.items);
  const activeTemplateId = useStore(templateStore, (s) => s.activeId);
  const activeTemplate = useStore(templateStore, (s) => s.active);
  const templatesLoading = useStore(templateStore, (s) => s.loading);
  const templatesError = useStore(templateStore, (s) => s.error);

  const models = useStore(modelStore, (s) => s.models);
  const modelsLoading = useStore(modelStore, (s) => s.loading);
  const modelsError = useStore(modelStore, (s) => s.error);
  const saveStatus = useStore(modelStore, (s) => s.saveStatus);

  const urlTemplateId = params.get('templateId');
  const formatFromUrl = (params.get('format') as Format | null) ?? 'pdfa';
  const packFromUrl = (params.get('packAs') as 'zip' | 'single' | null) ?? 'zip';
  const filenameFromUrl = params.get('fn') ?? 'document-{{name}}';
  const idsFromUrl = params.get('models') ?? '';

  const format: Format = SUPPORTED.includes(formatFromUrl) ? formatFromUrl : 'pdfa';
  const packAs: 'zip' | 'single' = packFromUrl === 'single' ? 'single' : 'zip';
  const filenamePattern = filenameFromUrl;

  const [pickedIds, setPickedIds] = useState<Set<string>>(
    () => new Set(idsFromUrl.split(',').filter(Boolean)),
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<GenerationResult | null>(null);

  useEffect(() => {
    void templateStore.loadAll(activeSchema?.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeSchema?.id]);

  useEffect(() => {
    if (activeSchema) void modelStore.load(activeSchema.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeSchema?.id]);

  useEffect(() => {
    const targetId = urlTemplateId ?? activeTemplateId;
    if (targetId && targetId !== activeTemplateId) {
      void templateStore.select(targetId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [urlTemplateId]);

  useEffect(() => {
    if (!activeTemplateId) return;
    const next = new URLSearchParams(params);
    next.set('templateId', activeTemplateId);
    setParams(next, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTemplateId]);

  const updateUrl = useCallback(
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
    updateUrl({
      models: Array.from(pickedIds).join(','),
      format,
      packAs,
      fn: filenamePattern,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pickedIds, format, packAs, filenamePattern]);

  // When packAs=single, auto-trim to first selected — same as previous behavior
  useEffect(() => {
    if (packAs === 'single' && pickedIds.size > 1) {
      const first = Array.from(pickedIds)[0];
      setPickedIds(new Set([first]));
    }
  }, [packAs, pickedIds]);

  const modelAdapter = useMemo<ListItemAdapter<DataModel>>(
    () => ({
      getId: (m) => m.id,
      getLabel: (m) => m.name,
      getMeta: (m) => `${Object.keys(m.values).length} полей`,
      getSearchText: (m) => m.name,
    }),
    [],
  );

  const pickedModels = useMemo(
    () => models.filter((m) => pickedIds.has(m.id)),
    [models, pickedIds],
  );

  const canRun =
    !!activeTemplate &&
    !!activeTemplate.slides?.length &&
    pickedModels.length > 0 &&
    !busy;

  const blockingReasons = useMemo(() => {
    const out: string[] = [];
    if (!activeTemplate) out.push('Шаблон не выбран');
    else if (!activeTemplate.slides?.length) out.push('Шаблон пуст');
    if (pickedModels.length === 0) out.push('Выберите хотя бы одну модель');
    if (packAs === 'single' && pickedModels.length > 1) {
      out.push('Для «Один файл» нужна ровно одна модель');
    }
    return out;
  }, [activeTemplate, pickedModels.length, packAs]);

  const run = useCallback(async (): Promise<void> => {
    if (!canRun || !activeTemplate) return;
    setBusy(true);
    setError(null);
    setResult(null);

    const req: GenerationRequest = {
      inlineSlides: activeTemplate.slides,
      items: pickedModels.map((m) => ({ inlineValues: m.values })),
      format,
      packAs,
      filenamePattern,
    };

    try {
      const r = await httpGenerationClient.generateSync(req);
      setResult(r);
      downloadBlob(r.blob, r.filename);
    } catch (e) {
      setError((e as Error).message);
      toast.error('Генерация не удалась', (e as Error).message);
    } finally {
      setBusy(false);
    }
  }, [canRun, activeTemplate, pickedModels, format, packAs, filenamePattern]);

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

  return (
    <div className="gen-page">
      <main className="gen-main">
        <h2 className="gen-title">Генерация документов</h2>
        <p className="gen-subtitle">
          Шаблон × модели данных → документы. Формат: <b>{format.toUpperCase()}</b>,
          упаковка: <b>{packAs}</b>.
        </p>

        {templatesLoading && <div className="schema-hint">Загрузка шаблонов…</div>}
        {templatesError && <div className="schema-error">{templatesError}</div>}
        {modelsLoading && <div className="schema-hint">Загрузка моделей…</div>}
        {modelsError && <div className="schema-error">{modelsError}</div>}

        {activeTemplate && (
          <div className="gen-preview">
            <div style={{ fontWeight: 600 }}>📄 {activeTemplate.name}</div>
            <div className="schema-hint">
              Слайдов: {activeTemplate.slides.length} · Моделей: {models.length} · Выбрано:{' '}
              {pickedModels.length}
            </div>
          </div>
        )}

        {blockingReasons.length > 0 && (
          <div className="gen-warning">
            {blockingReasons.map((r, i) => <div key={i}>⚠ {r}</div>)}
          </div>
        )}

        {error && <div className="schema-error" style={{ marginTop: 12 }}>{error}</div>}

        {result && (
          <div className="gen-status done" style={{ marginTop: 12 }}>
            Готово: {result.count} документ(ов), ошибок: {result.failed}.{' '}
            <button className="dp-btn" onClick={() => downloadBlob(result.blob, result.filename)}>
              Скачать снова
            </button>
          </div>
        )}

        {!activeTemplate && (
          <p className="gen-empty" style={{ marginTop: 16 }}>
            Нет выбранного шаблона. Откройте{' '}
            <Link to="/app" style={{ color: 'var(--accent)' }}>список проектов</Link>{' '}
            или создайте документ в редакторе и сохраните.
          </p>
        )}
      </main>

      <aside className="gen-sidebar">
        <h3 className="gen-section-title">Шаблон</h3>
        <select
          className="gen-select"
          value={activeTemplateId ?? ''}
          onChange={(e) => void templateStore.select(e.target.value || null)}
        >
          <option value="" disabled>— выберите шаблон —</option>
          {templates.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name} ({t.slideCount} слайд.)
            </option>
          ))}
        </select>

        <h3 className="gen-section-title">Модели данных</h3>

        <SearchSelectList<DataModel>
          items={models}
          adapter={modelAdapter}
          selectedIds={pickedIds}
          onSelectionChange={setPickedIds}
          rowClickTogglesSelection={true}
          bulkActions={[]}
          searchPlaceholder="Поиск по названию модели…"
          emptyText={
            <span>
              Моделей нет. Создайте в{' '}
              <Link to="/app/data-models">Данные</Link>.
            </span>
          }
          maxHeight={300}
          minHeight={160}
        />

        {saveStatus === 'saving' && (
          <div className="schema-hint">💾 сохранение модели…</div>
        )}

        <h3 className="gen-section-title">Параметры</h3>

        <label className="gen-label">
          Формат
          <select
            className="gen-select"
            value={format}
            onChange={(e) => updateUrl({ format: e.target.value })}
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
            onChange={(e) => updateUrl({ packAs: e.target.value })}
          >
            <option value="zip">ZIP</option>
            <option value="single">Один файл (1 модель)</option>
          </select>
        </label>

        <label className="gen-label">
          Шаблон имени
          <input
            className="gen-input"
            value={filenamePattern}
            onChange={(e) => updateUrl({ fn: e.target.value })}
          />
        </label>

        <button
          className="dp-btn-submit"
          onClick={() => void run()}
          disabled={!canRun}
          title="Ctrl+Enter"
          style={{ marginTop: 16 }}
        >
          {busy ? 'Генерация…' : 'Сгенерировать (Ctrl+Enter)'}
        </button>
      </aside>
    </div>
  );
};