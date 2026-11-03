import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Editor, type EditorInitialDoc } from '@/presentation/components/Editor';
import { httpTemplateRepository } from '../api/HttpTemplateRepository';
import type { Template } from '../domain/Template';
import { schemaStore } from '@/features/schemas/state/SchemaStore';
import { resolveBindings } from '@/features/bindings/domain/BindingResolver';
import { documentDrafts } from '@/presentation/hooks/editor/useDocumentPersistence';
import { authStore } from '@/auth/store';
import { reachGoal } from '@/shared/analytics/metrika';
import { templateStore } from '../state/TemplateStore';
import { useStore } from '@/shared/store/store';
import './template-journey.css';

export function TemplateEditorPage() {
  const { templateId } = useParams();
  const activeSchemaId = useStore(schemaStore, (state) => state.activeId);
  const [template, setTemplate] = useState<Template | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [savedSchemaId, setSavedSchemaId] = useState<string | null>(null);
  useEffect(() => {
    let active = true;
    setTemplate(null);
    setError(null);
    setSaved(false);
    void httpTemplateRepository
      .get(templateId!)
      .then(async (value) => {
        if (!active) return;
        if (!value) {
          setError('Шаблон не найден');
          return;
        }
        const owner = authStore.getState().user?.id ?? 'local';
        const draft = await documentDrafts.read(`${owner}:template:${value.id}`).catch(() => null);
        if (!active) return;
        if (draft && draft.savedAt > Date.parse(value.updatedAt))
          value = {
            ...value,
            slides: draft.snapshot.slides,
            bindings: draft.snapshot.bindings ?? [],
          };
        schemaStore.setActive(value.schemaId);
        setTemplate(value);
        setSavedSchemaId(value.schemaId);
        void templateStore.select(value.id);
      })
      .catch((reason: Error) => {
        if (active) setError(reason.message);
      });
    return () => {
      active = false;
    };
  }, [templateId]);
  const save = useCallback(
    async (document: EditorInitialDoc) => {
      if (!template) return;
      const updated = await templateStore.update(template.id, {
        ...template,
        schemaId: activeSchemaId ?? template.schemaId,
        slides: document.slides,
        bindings: resolveBindings(document.slides, document.bindings),
      });
      setSavedSchemaId(updated.schemaId);
      setSaved(true);
      reachGoal('template_saved');
    },
    [template, activeSchemaId],
  );
  if (error) return <p role="alert">{error}</p>;
  if (!template) return <p>Загрузка…</p>;
  return (
    <div className="template-editor-frame">
      <header className="template-editor-toolbar">
        <Link to="/app/templates">← Шаблоны</Link>
        <strong>{template.name}</strong>
        <span>Макет → Данные → Документы</span>
      </header>
      {saved && (
        <div className="template-next" role="status">
          <strong>Шаблон сохранён</strong>
          <Link
            to={`/app/data-models${savedSchemaId ? `?schemaId=${encodeURIComponent(savedSchemaId)}` : ''}`}
          >
            Заполнить данные →
          </Link>
          <Link
            to={`/app/generate?templateId=${encodeURIComponent(template.id)}${savedSchemaId ? `&schemaId=${encodeURIComponent(savedSchemaId)}` : ''}`}
          >
            Перейти к генерации →
          </Link>
        </div>
      )}
      <div className="template-editor-canvas">
        <Editor
          key={template.id}
          documentId={`template:${template.id}`}
          initialDoc={{
            slides: template.slides,
            activeId: template.slides[0].id,
            data: [],
            bindings: template.bindings,
          }}
          onSave={save}
        />
      </div>
    </div>
  );
}
