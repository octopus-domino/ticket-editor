import { t as __tr } from '@/shared/i18n';
// src/workspace/components/WorkspaceFlowBreadcrumbs.tsx
import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  FLOW_STEPS,
  buildStepRoute,
  stepStatus,
  STEP_PATH_PREFIX,
  type FlowStep,
} from '@/features/workspace/domain/WorkspaceFlow';
import { useFlowContext } from '../hooks/useFlowContext';

export const WorkspaceFlowBreadcrumbs: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const ctx = useFlowContext();

  return (
    <nav className="flow-breadcrumbs" aria-label={__tr("Путь документа")}>
      <ol className="flow-list">
        {FLOW_STEPS.map((step, index) => {
          const status = stepStatus(step.id, ctx);
          const isActive = location.pathname.startsWith(STEP_PATH_PREFIX[step.id]) ||
            (step.id === 'template' && location.pathname.startsWith('/app/templates'));

          // что писать в крошке: имя активной сущности, счётчик или «+ Создать»
          let label = step.label;
          let meta: string | null = null;
          let badge: number | null = null;

          if (step.id === 'schema') {
            if (ctx.schemaName) meta = ctx.schemaName;
            else label = step.emptyLabel;
          } else if (step.id === 'template') {
            if (ctx.templateName) meta = ctx.templateName;
            else if (ctx.templateCount > 0) badge = ctx.templateCount;
            else label = step.emptyLabel;
          } else if (step.id === 'models') {
            if (ctx.modelCount > 0) badge = ctx.modelCount;
            else label = step.emptyLabel;
          }

          return (
            <li
              key={step.id}
              className={[
                'flow-item',
                `flow-status-${status}`,
                isActive ? 'flow-active' : '',
              ].filter(Boolean).join(' ')}
            >
              <button
                type="button"
                className="flow-btn"
                onClick={() => navigate(buildStepRoute(step.id as FlowStep, ctx))}
                title={step.hint}
                aria-current={isActive ? 'step' : undefined}
              >
                <span className={`flow-num flow-num-${status}`} aria-hidden>
                  {status === 'ready' ? '✓' : '+'}
                </span>
                <span className="flow-label">{label}</span>
                {meta && (
                  <span className="flow-meta" title={meta}>
                    {meta}
                  </span>
                )}
                {badge !== null && (
                  <span className="flow-badge" aria-label={__tr("{0} шт.", badge)}>
                    {badge}
                  </span>
                )}
              </button>
              {index < FLOW_STEPS.length - 1 && (
                <span className="flow-sep" aria-hidden>›</span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
};
