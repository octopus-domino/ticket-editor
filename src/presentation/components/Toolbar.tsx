import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useStore } from '@/shared/store/store';
import { useDocumentStore } from '../providers/EditorProvider';
import { download } from '@/lib/download';
import { serializeSlideToSvg } from '@/lib/svg/serialize';
import { templateStore } from '@/features/templates/state/TemplateStore';
import { schemaStore } from '@/features/schemas/state/SchemaStore';
import { emailStore } from '@/features/email';
import { isFeatureEnabled } from '@/shared/flags';
import { resolveBindings } from '@/features/bindings/domain/BindingResolver';
import { materializeSlide } from '@/features/generation/ui/materializeSlide';
import { modelStore } from '@/features/data-models/state/ModelStore';
import { GenerationMetrics } from '@/shared/analytics/GenerationMetrics';

export const Toolbar: React.FC = () => {
  const docStore = useDocumentStore();
  const slides = useStore(docStore, (s) => s.slides);
  const activeId = useStore(docStore, (s) => s.activeId);
  const data = useStore(docStore, (s) => s.data);
  useStore(docStore, (s) => s.historyVersion);

  const canUndo = docStore.canUndo;
  const canRedo = docStore.canRedo;
  const activeSlide = slides.find((s) => s.id === activeId);

  const [saveAsOpen, setSaveAsOpen] = useState(false);
  const [saveAsName, setSaveAsName] = useState('');
  const [saveAsBusy, setSaveAsBusy] = useState(false);
  const [saveAsError, setSaveAsError] = useState<string | null>(null);

  const [savedTemplate, setSavedTemplate] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const toastTimerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
    };
  }, []);

  const handleExportJson = () => {
    const payload = {
      version: '2.0',
      exportedAt: new Date().toISOString(),
      slides,
      data,
    };
    download(
      JSON.stringify(payload, null, 2),
      `ticket-editor-${Date.now()}.json`,
      'application/json',
    );
  };

  const handleExportSvg = () => {
    if (!activeSlide) return;
    const metrics = new GenerationMetrics({
      source: 'editor_export',
      mode: 'local',
      format: 'svg',
      requestedCount: 1,
    });
    try {
      const svgString = serializeSlideToSvg(activeSlide);
      download(svgString, `slide-${activeSlide.id}.svg`, 'image/svg+xml');
      metrics.complete({ count: 1, failed: 0 });
    } catch (error) {
      metrics.fail('execution');
      throw error;
    }
  };

  const openSaveAs = () => {
    setSaveAsName(`Шаблон ${new Date().toLocaleDateString('ru-RU')}`);
    setSaveAsError(null);
    setSaveAsOpen(true);
  };

  const submitSaveAs = async (): Promise<void> => {
    const name = saveAsName.trim();
    if (!name) return;
    setSaveAsBusy(true);
    setSaveAsError(null);
    try {
      const schemaId = schemaStore.getState().activeId;
      const created = await templateStore.create({
        schemaId,
        name,
        slides,
        bindings: resolveBindings(slides, docStore.getState().bindings),
      });
      setSaveAsOpen(false);
      setSaveAsName('');
      setSavedTemplate({ id: created.id, name: created.name });
      if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
      toastTimerRef.current = window.setTimeout(() => setSavedTemplate(null), 12000);
    } catch (e) {
      setSaveAsError((e as Error).message);
    } finally {
      setSaveAsBusy(false);
    }
  };

  /**
   * Email — только ТЕКУЩИЙ слайд, не все.
   * Пользователь стоит на 3-м слайде → уйдёт 3-й.
   * Модель подставляется в значения, материаллизация вшивает значения в текст.
   */
  const openEmail = (mode: 'preview' | 'send'): void => {
    if (!activeSlide) return;
    const modelState = modelStore.getState();
    const active = modelState.models.find((m) => m.id === modelState.selectedId);
    const values = active?.values ?? {};
    const materialized = materializeSlide(activeSlide, values);
    if (mode === 'send') emailStore.openSend([materialized]);
    else void emailStore.openPreview([materialized]);
  };

  return (
    <header className="toolbar" style={{ position: 'relative' }}>
      <h1>Редактор шаблонов</h1>
      <div className="toolbar-actions">
        <button className="toolbar-btn" onClick={() => docStore.undo()} disabled={!canUndo}>
          ↶
        </button>
        <button className="toolbar-btn" onClick={() => docStore.redo()} disabled={!canRedo}>
          ↷
        </button>
        <div style={{ width: 8 }} />
        <button className="toolbar-btn" onClick={openSaveAs}>
          💾 Сохранить как шаблон
        </button>
        {isFeatureEnabled('FEATURE_EMAIL') && (
          <>
            <button
              className="toolbar-btn"
              onClick={() => openEmail('send')}
              disabled={!activeSlide}
              title="Отправить текущий слайд по электронной почте"
            >
              📤 Отправить по email
            </button>
            <button
              className="toolbar-btn"
              onClick={() => openEmail('preview')}
              disabled={!activeSlide}
              title="Предпросмотр письма и скачивание .eml"
            >
              📧 Email-превью
            </button>
          </>
        )}
        <button className="toolbar-btn" onClick={handleExportSvg}>
          🖼 SVG
        </button>
        <button className="toolbar-btn primary" onClick={handleExportJson}>
          📥 JSON
        </button>
      </div>

      {saveAsOpen && (
        <div
          style={{
            position: 'absolute',
            top: '100%',
            right: 16,
            marginTop: 6,
            background: '#fff',
            border: '1px solid var(--border)',
            borderRadius: 8,
            padding: 12,
            boxShadow: '0 8px 24px rgba(15,23,42,.15)',
            zIndex: 50,
            width: 320,
          }}
        >
          <label
            style={{
              display: 'block',
              fontSize: 11,
              color: 'var(--text-muted)',
              marginBottom: 4,
            }}
          >
            Имя шаблона
          </label>
          <input
            autoFocus
            className="field"
            value={saveAsName}
            onChange={(e) => setSaveAsName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') void submitSaveAs();
              if (e.key === 'Escape') setSaveAsOpen(false);
            }}
            style={{ width: '100%', marginBottom: 8 }}
          />
          {saveAsError && (
            <div style={{ fontSize: 11, color: '#dc2626', marginBottom: 8 }}>{saveAsError}</div>
          )}
          <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
            <button
              className="toolbar-btn"
              onClick={() => setSaveAsOpen(false)}
              disabled={saveAsBusy}
            >
              Отмена
            </button>
            <button
              className="toolbar-btn primary"
              onClick={() => void submitSaveAs()}
              disabled={saveAsBusy || !saveAsName.trim()}
            >
              {saveAsBusy ? 'Сохранение…' : 'Сохранить'}
            </button>
          </div>
        </div>
      )}

      {savedTemplate && (
        <div
          style={{
            position: 'absolute',
            top: '100%',
            right: 16,
            marginTop: 6,
            background: '#f0fdf4',
            border: '1px solid #86efac',
            borderRadius: 8,
            padding: '10px 14px',
            boxShadow: '0 4px 12px rgba(0,0,0,.08)',
            zIndex: 50,
            fontSize: 13,
            color: '#166534',
            display: 'flex',
            gap: 10,
            alignItems: 'center',
            maxWidth: 480,
          }}
          role="status"
          aria-live="polite"
        >
          <span>✅ Шаблон «{savedTemplate.name}» сохранён.</span>
          <Link
            to={`/app/templates?highlight=${encodeURIComponent(savedTemplate.id)}`}
            style={{
              color: '#166534',
              fontWeight: 600,
              textDecoration: 'underline',
              whiteSpace: 'nowrap',
            }}
          >
            Открыть в списке →
          </Link>
          <button
            type="button"
            onClick={() => setSavedTemplate(null)}
            aria-label="Скрыть"
            style={{
              background: 'none',
              border: 'none',
              color: '#166534',
              cursor: 'pointer',
              fontSize: 18,
              padding: 0,
              lineHeight: 1,
            }}
          >
            ×
          </button>
        </div>
      )}
    </header>
  );
};
