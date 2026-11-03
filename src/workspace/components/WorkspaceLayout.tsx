// src/workspace/components/WorkspaceLayout.tsx
import React, { useEffect } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { WorkspaceFlowBreadcrumbs } from './WorkspaceFlowBreadcrumbs';
import { WorkspaceSidebar } from './WorkspaceSidebar';
import { useStore } from '@/shared/store/store';
import { authStore } from '@/auth/store';
import { useSchemas } from '@/features/schemas/state/useSchemas';
import { templateStore } from '@/features/templates/state/TemplateStore';
import { modelStore } from '@/features/data-models/state/ModelStore';
import './workspace-flow.css';
import { FeedbackWidget } from '@/features/feedback/ui/FeedbackWidget';

export const WorkspaceLayout: React.FC = () => {
  const navigate = useNavigate();
  const { schemas, activeSchema } = useSchemas();
  const user = useStore(authStore, (s) => s.user);
  const offline = useStore(authStore, (s) => s.offline);
  const activeSchemaId = activeSchema?.id;

  // Предзагрузка шаблонов и моделей — нужны для крошек.
  useEffect(() => {
    if (schemas.length === 0) return;
    void templateStore.loadAll();
  }, [schemas.length]);

  useEffect(() => {
    if (activeSchemaId) void modelStore.load(activeSchemaId);
  }, [activeSchemaId]);

  const displayName = user?.name || user?.email || 'Гость';
  const handleLogout = async (): Promise<void> => {
    await authStore.logout();
    navigate('/login', { replace: true });
  };

  return (
    <div className="workspace-layout">
      <header className="workspace-header">
        <div className="logo">CoDoc</div>

        <WorkspaceFlowBreadcrumbs />

        <div className="workspace-profile">
          <FeedbackWidget surface="workspace" />
          {user ? (
            <>
              <span className="workspace-avatar" title={displayName}>
                {displayName.charAt(0).toUpperCase()}
              </span>
              <span className="workspace-username" title={displayName}>
                {displayName}
              </span>
              <button
                type="button"
                className="workspace-login-btn"
                onClick={() => void handleLogout()}
              >
                Выйти
              </button>
            </>
          ) : (
            <button
              type="button"
              className="workspace-login-btn primary"
              onClick={() => navigate('/login')}
              title={offline ? 'Бэкенд недоступен — можно войти позже' : 'Войти'}
            >
              Войти
            </button>
          )}
        </div>
      </header>

      <div className="workspace-body">
        <WorkspaceSidebar />
        <main className="workspace-main">
          <Outlet />
        </main>
      </div>
    </div>
  );
};
