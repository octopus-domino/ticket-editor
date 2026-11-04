import { t as __tr } from '@/shared/i18n';
// src/features/workspace/domain/WorkspaceFlow.ts

export type FlowStep = 'schema' | 'template' | 'models' | 'generate';

export interface FlowState {
  readonly current: FlowStep;
  readonly completed: ReadonlySet<FlowStep>;
}

/**
 * Контекст, из которого вычисляется видимое состояние крошек.
 * Ничего не блокирует — просто показывает «где я сейчас».
 */
export interface FlowContext {
  schemaId: string | null;
  schemaName: string | null;
  hasAnySchema: boolean;

  templateId: string | null;
  templateName: string | null;
  templateCount: number;

  modelCount: number;
  activeModelId: string | null;
}

export interface FlowStepDef {
  id: FlowStep;
  label: string;
  emptyLabel: string;
  hint: string;
}

export const FLOW_STEPS: FlowStepDef[] = [
  {
    id: 'template',
    label: __tr("Шаблон"),
    emptyLabel: __tr("+ Шаблон"),
    hint: __tr("Создайте макет. Поля данных можно добавить позже"),
  },
  {
    id: 'schema',
    label: __tr("Схема данных"),
    emptyLabel: __tr("+ Схема данных"),
    hint: __tr("Опишите поля, которые будут меняться в документах"),
  },
  {
    id: 'models',
    label: __tr("Наборы данных"),
    emptyLabel: __tr("+ Наборы данных"),
    hint: __tr("Заполните значения для генерации"),
  },
  {
    id: 'generate',
    label: __tr("Генерация"),
    emptyLabel: __tr("Генерация"),
    hint: __tr("Экспорт в PDF / SVG / ZIP"),
  },
];

/** Итоговый URL шага с пробросом контекста (schemaId, modelId, templateId). */
export function buildStepRoute(step: FlowStep, ctx: FlowContext): string {
  const sid = ctx.schemaId;

  switch (step) {
    case 'schema':
      // есть схема → к её редактору; нет → список /app/schemas
      return sid ? `/app/schemas/${encodeURIComponent(sid)}` : '/app/schemas';

    case 'template': {
      // если уже есть открытый шаблон — идём редактировать его
      if (ctx.templateId) {
        return `/app/templates/${encodeURIComponent(ctx.templateId)}/edit`;
      }
      // иначе создаём новый шаблон, прокидывая схему
      const p = new URLSearchParams();
      if (sid) p.set('schemaId', sid);
      if (ctx.activeModelId) p.set('modelId', ctx.activeModelId);
      const qs = p.toString();
      return qs ? `/app/templates/new?${qs}` : '/app/templates/new';
    }

    case 'models': {
      const p = new URLSearchParams();
      if (sid) p.set('schemaId', sid);
      if (ctx.activeModelId) p.set('modelId', ctx.activeModelId);
      const qs = p.toString();
      return qs ? `/app/data-models?${qs}` : '/app/data-models';
    }

    case 'generate': {
      const p = new URLSearchParams();
      if (sid) p.set('schemaId', sid);
      if (ctx.activeModelId) p.set('models', ctx.activeModelId);
      if (ctx.templateId) p.set('templateId', ctx.templateId);
      const qs = p.toString();
      return qs ? `/app/generate?${qs}` : '/app/generate';
    }
  }
}

/** Заполнен ли шаг (для визуала: серый/активный). */
export function stepStatus(step: FlowStep, ctx: FlowContext): 'empty' | 'ready' {
  switch (step) {
    case 'schema':
      return ctx.schemaId ? 'ready' : 'empty';
    case 'template':
      return ctx.templateId ? 'ready' : 'empty';
    case 'models':
      return ctx.modelCount > 0 ? 'ready' : 'empty';
    case 'generate':
      return ctx.templateId ? 'ready' : 'empty';
  }
}

/** Какой префикс URL соответствует шагу — для подсветки активного. */
export const STEP_PATH_PREFIX: Record<FlowStep, string> = {
  schema: '/app/schemas',
  template: '/app/editor',
  models: '/app/data-models',
  generate: '/app/generate',
};

/** Плюс-подпись для пустого шага. */
export function stepEmptyLabel(step: FlowStep): string {
  const def = FLOW_STEPS.find((s) => s.id === step);
  return def ? def.emptyLabel : '';
}
