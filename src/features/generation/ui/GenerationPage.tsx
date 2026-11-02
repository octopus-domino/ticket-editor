import React, { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useStore } from '@/shared/store/store';
import type { DataSchema } from '@/features/schemas/domain/DataSchema';
import { httpSchemaRepository } from '@/features/schemas/api/HttpSchemaRepository';
import type { DataModel } from '@/features/data-models/domain/DataModel';
import { httpDataModelRepository } from '@/features/data-models/api/HttpDataModelRepository';
import { resolveBindings } from '@/features/bindings/domain/BindingResolver';
import { validateGeneration } from '../domain/GenerationValidator';
import { generationStore } from '../state/GenerationStore';

const SUPPORTED = ['pdfa', 'pdf', 'svg'] as const;
type Format = (typeof SUPPORTED)[number];

interface Autosave {
  slides?: unknown[];
}

/** Читает slides из autosave-ключа редактора. */
function readSlidesFromAutosave(): unknown[] {
  try {
    const raw = localStorage.getItem('ticket-editor:autosave');
    if (!raw) return [];
    const parsed = JSON.parse(raw) as Autosave;
    return Array.isArray(parsed.slides) ? parsed.slides : [];
  } catch {
    return [];
  }
}

/** Приводит unknown[] → Slide[] для валидатора (он ожидает Slide[]). */
function asSlidesForBinding(slides: unknown[]): never[] {
  return slides as never[];
}

export const GenerationPage: React.FC = () => {
  const [params, setParams] = useSearchParams();

  const [schema, setSchema] = useState<DataSchema | null>(null);
  const [models, setModels] = useState<DataModel[]>([]);
  const [slides, setSlides] = useState<unknown[]>([]);
  const [pickedIds, setPickedIds] = useState<Set<string>>(new Set());
  const [bootError, setBootError] = useState<string | null>(null);

  const format = (params.get('format') as Format) ?? 'pdfa';
  const packAs = (params.get('packAs') as 'zip' | 'single') ?? 'zip';
  const filenamePattern = params.get('fn') ?? 'ticket-{{name}}';

  const phase = useStore(generationStore, (s) => s.phase);
  const result = useStore(generationStore, (s) => s.result);
  const job = useStore(generationStore, (s) => s.job);
  const err = useStore(generationStore, (s) => s.error);

  useEffect(() => {
    setSlides(readSlidesFromAutosave());
  }, []);

  useEffect(() => {
    void (async () => {
      const raw = localStorage.getItem('ticket-editor:schemaId');
      if (!raw) {
        setBootError('Нет выбранной схемы. Откройте редактор и выберите схему в панели «Данные».');
        return;
      }
      try {
        const s = await httpSchemaRepository.get(raw);
        setSchema(s);
        const list = await httpDataModelRepository.list(s.id);
        setModels(list);
        const fromUrl = params.get('ids');
        if (fromUrl) setPickedIds(new Set(fromUrl.split(',').filter(Boolean)));
      } catch (e) {
        setBootError((e as Error).message);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    params.set('format', format);
    params.set('packAs', packAs);
    params.set('fn', filenamePattern);
    params.set('ids', Array.from(pickedIds).join(','));
    setParams(params, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [format, packAs, filenamePattern, pickedIds]);

  const pickedModels = useMemo(
    () => models.filter((m) => pickedIds.has(m.id)),
    [models, pickedIds],
  );

  const validationIssues = useMemo(
    () =>
      schema
        ? validateGeneration({
            schema,
            bindings: resolveBindings(asSlidesForBinding(slides)),
            selectedModels: pickedModels,
            format,
            supportedFormats: [...SUPPORTED],
          })
        : [],
    [schema, slides, pickedModels, format],
  );

  const canRun = validationIssues.length === 0 && pickedModels.length > 0 && slides.length > 0;
  const useAsync = pickedModels.length > 100;

  const togglePick = (id: string): void => {
    setPickedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const run = async (): Promise<void> => {
    if (!schema || !canRun) return;
    const req = {
      inlineSlides: slides,
      items: pickedModels.map((m) => ({ dataModelId: m.id })),
      format,
      packAs,
      filenamePattern,
    };
    if (useAsync) {
      await generationStore.runAsync(req);
    } else {
      const r = await generationStore.runSync(req);
      downloadBlob(r.blob, r.filename);
    }
  };

  return (
    <div className="gen-page">
      <main className="gen-main">
        <h2 className="gen-title">Генерация документов</h2>
        <p className="gen-subtitle">
          Схема: <b>{schema?.name ?? '—'}</b>. Моделей: {models.length}. Слайдов: {slides.length}.
        </p>

        {bootError && <div className="schema-error">{bootError}</div>}

        {!bootError && slides.length === 0 && (
          <div className="schema-error">
            Нет активного документа. Откройте редактор, дождитесь автосохранения и вернитесь сюда.
          </div>
        )}

        {!bootError && models.length === 0 && (
          <p className="gen-empty">
            Моделей нет. Создайте их в разделе{' '}
            <a href="/data-models" style={{ color: '#4f46e5' }}>Данные</a>.
          </p>
        )}

        <h3 className="gen-section-title">Выберите модели</h3>
        <div className="gen-model-list">
          {models.map((m) => (
            <label key={m.id} className={`gen-model-item ${pickedIds.has(m.id) ? 'checked' : ''}`}>
              <input
                className="gen-model-checkbox"
                type="checkbox"
                checked={pickedIds.has(m.id)}
                onChange={() => togglePick(m.id)}
              />
              <span>{m.name}</span>
            </label>
          ))}
        </div>

        {validationIssues.length > 0 && (
          <div className="schema-error" style={{ marginTop: 16 }}>
            {validationIssues.slice(0, 10).map((i, k) => (
              <div key={k}>⚠ {i.message}</div>
            ))}
          </div>
        )}

        {phase === 'async-running' && job && (
          <div className="gen-progress">
            <div>
              Прогресс: {job.progress.completed} / {job.progress.total} (failed: {job.progress.failed})
            </div>
            <progress value={job.progress.completed} max={job.progress.total} />
          </div>
        )}
        {phase === 'async-done' && result && (
          <div className="gen-status done">
            Готово: {result.count} документ(ов).{' '}
            <button onClick={() => downloadBlob(result.blob, result.filename)}>Скачать</button>
          </div>
        )}
        {err && <div className="schema-error" style={{ marginTop: 16 }}>{err}</div>}
      </main>

      <aside className="gen-sidebar">
        <h3 className="gen-section-title">Параметры</h3>

        <label className="gen-label">
          Формат
          <select
            className="gen-select"
            value={format}
            onChange={(e) => {
              params.set('format', e.target.value);
              setParams(params);
            }}
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
            onChange={(e) => {
              params.set('packAs', e.target.value);
              setParams(params);
            }}
          >
            <option value="zip">ZIP</option>
            <option value="single">Один файл</option>
          </select>
        </label>

        <label className="gen-label">
          Шаблон имени
          <input
            className="gen-input"
            value={filenamePattern}
            onChange={(e) => {
              params.set('fn', e.target.value);
              setParams(params);
            }}
          />
        </label>

        <div className="gen-subtitle" style={{ marginTop: 16 }}>
          Выбрано моделей: {pickedIds.size}
          {useAsync && ' (async)'}
        </div>

        <button
          className="gen-btn-generate"
          onClick={() => void run()}
          disabled={!canRun || phase === 'async-running' || phase === 'sync-running'}
        >
          {phase === 'sync-running'
            ? 'Генерация…'
            : phase === 'async-running'
              ? 'В очереди…'
              : 'Сгенерировать'}
        </button>
      </aside>
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