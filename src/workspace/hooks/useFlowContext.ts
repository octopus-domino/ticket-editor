// src/workspace/hooks/useFlowContext.ts
import { useStore } from '@/shared/store/store';
import { useLocation } from 'react-router-dom';
import { useSchemas } from '@/features/schemas/state/useSchemas';
import { templateStore } from '@/features/templates/state/TemplateStore';
import { modelStore } from '@/features/data-models/state/ModelStore';
import type { FlowContext } from '@/features/workspace/domain/WorkspaceFlow';

export function useFlowContext(): FlowContext {
  const { pathname } = useLocation();
  const { schemas, activeSchema } = useSchemas();

  const templates = useStore(templateStore, (s) => s.items);
  const activeTemplateId = useStore(templateStore, (s) => s.activeId);
  const activeTemplate = useStore(templateStore, (s) => s.active);

  const models = useStore(modelStore, (s) => s.models);
  const activeModelId = useStore(modelStore, (s) => s.selectedId);

  const schemaId = activeSchema?.id ?? null;

  // шаблоны/модели фильтруем под активную схему (если она выбрана)
  const schemaTemplates = schemaId ? templates.filter((t) => t.schemaId === schemaId) : templates;

  const schemaModels = schemaId ? models.filter((m) => m.schemaId === schemaId) : models;

  // если активная модель не относится к активной схеме — игнорируем её
  const effectiveModelId =
    activeModelId && schemaModels.some((m) => m.id === activeModelId)
      ? activeModelId
      : (schemaModels[0]?.id ?? null);

  // активный шаблон считаем «текущим», только если он подходит под схему
  const effectiveTemplateId =
    !pathname.startsWith('/app/editor/') &&
    pathname !== '/app/templates/new' &&
    activeTemplateId &&
    schemaTemplates.some((t) => t.id === activeTemplateId)
      ? activeTemplateId
      : null;

  return {
    schemaId,
    schemaName: activeSchema?.name ?? null,
    hasAnySchema: schemas.length > 0,

    templateId: effectiveTemplateId,
    templateName: effectiveTemplateId
      ? (schemaTemplates.find((item) => item.id === effectiveTemplateId)?.name ??
        activeTemplate?.name ??
        null)
      : null,
    templateCount: schemaTemplates.length,

    modelCount: schemaModels.length,
    activeModelId: effectiveModelId,
  };
}
