import { t as __tr } from '@/shared/i18n';
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
import { workspaceStore } from '@/workspace/store';
import './template-journey.css';
import { TutorialCoach } from '@/features/learning/TutorialCoach';
import { ResourceHistoryPanel } from '@/features/history/ResourceHistoryPanel';
import { ConstructorPublicationActions } from '@/features/journeys/ui/ConstructorPublicationActions';

function TemplateEditorSession({ templateId }: { templateId: string }) {
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
          setError(__tr("Шаблон не найден"));
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
        workspaceStore.setActiveFolder(value.folderId ?? null);
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
        schemaId: activeSchemaId,
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
  if (!template) return <p>{__tr("Загрузка…")}</p>;
  return (
    <div className="template-editor-frame">
      <TutorialCoach topic="document" />
      <header className="template-editor-toolbar">
        <Link to="/app/library">← {__tr('Document library')}</Link>
        <strong>{template.name}</strong>
        <ResourceHistoryPanel kind="template" id={template.id} />
        <span>{__tr("Макет → Данные → Документы")}</span>
      </header>
        <div className="template-next" role="status" style={{ visibility: saved ? 'visible' : 'hidden' }}>
          <strong>{__tr("Шаблон сохранён")}</strong>
          <Link
            to={`/app/data-models${savedSchemaId ? `?schemaId=${encodeURIComponent(savedSchemaId)}` : ''}`}
          >
            {__tr("Заполнить данные →")}</Link>
          <Link
            to={`/app/generate?templateId=${encodeURIComponent(template.id)}${savedSchemaId ? `&schemaId=${encodeURIComponent(savedSchemaId)}` : ''}`}
          >
            {__tr("Перейти к генерации →")}</Link>
        </div>
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
          saveContext={activeSchemaId}
        />
      </div>
      <ConstructorPublicationActions templateId={template.id} ready={saved} />
    </div>
  );
}

export function TemplateEditorPage() {
  const { templateId } = useParams();
  if (!templateId) return <p role="alert">{__tr("Шаблон не найден")}</p>;
  return <TemplateEditorSession key={templateId} templateId={templateId} />;
}
