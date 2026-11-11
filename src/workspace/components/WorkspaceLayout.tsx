import { t as __tr } from '@/shared/i18n';
// src/workspace/components/WorkspaceLayout.tsx
import React, { useEffect } from 'react';
import { Link, Outlet, useNavigate,useLocation } from 'react-router-dom';
import { WorkspaceFlowBreadcrumbs } from './WorkspaceFlowBreadcrumbs';
import { WorkspaceSidebar } from './WorkspaceSidebar';
import { useStore } from '@/shared/store/store';
import { authStore } from '@/auth/store';
import { useSchemas } from '@/features/schemas/state/useSchemas';
import { templateStore } from '@/features/templates/state/TemplateStore';
import { modelStore } from '@/features/data-models/state/ModelStore';
import './workspace-flow.css';
import { FeedbackWidget } from '@/features/feedback/ui/FeedbackWidget';
import { LanguageSwitcher } from '@/shared/i18n/LanguageSwitcher';
import { t } from '@/shared/i18n';
import { useMobilePanel, toggleMobilePanel, closeMobilePanel } from '@/shared/mobile/panels';
import { isGuest } from '@/shared/session/guest';

export const WorkspaceLayout: React.FC = () => {
  const mobilePanel = useMobilePanel();
  const navigate = useNavigate();
  const location=useLocation();
  useEffect(()=>closeMobilePanel(),[location.pathname]);
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

  const displayName = user?.name || user?.email || __tr("Гость");
  const handleLogout = async (): Promise<void> => {
    await authStore.logout();
    navigate('/login', { replace: true });
  };

  return (
    <div className="workspace-layout" data-mobile-panel={mobilePanel || undefined}>
      {isGuest()&&<div className="guest-session-note" role="status">{t('Guest session: changes are not saved to the server.')}</div>}
      <header className="workspace-header">
        <button type="button" className="mobile-menu-button" aria-label={t('Documents')} onClick={() => toggleMobilePanel('documents')}>☰</button>
        <Link to="/" className="logo" style={{ color: 'inherit', textDecoration: 'none' }}>CoDoc</Link>

        <WorkspaceFlowBreadcrumbs />

        <div className="workspace-profile">
          <LanguageSwitcher />
          <FeedbackWidget surface="workspace" />
          {user ? (
            <>
              <Link className="workspace-profile-link" to={isGuest()?'/login':'/app/profile'} aria-label={t('Client profile')}>
              <span className="workspace-avatar" title={displayName}>
                {displayName.charAt(0).toUpperCase()}
              </span>
              <span className="workspace-username" title={displayName}>
                {displayName}
              </span>
              </Link>
              <button
                type="button"
                className="workspace-login-btn"
                onClick={() => void handleLogout()}
              >
                {__tr("Выйти")}</button>
            </>
          ) : (
            <button
              type="button"
              className="workspace-login-btn primary"
              onClick={() => navigate('/login')}
              title={offline ? __tr("Бэкенд недоступен — можно войти позже") : __tr("Войти")}
            >
              {__tr("Войти")}</button>
          )}
        </div>
      </header>

      <div className="workspace-body">
        {mobilePanel && <button type="button" className="mobile-panel-backdrop" aria-label={t('Close panel')} onClick={closeMobilePanel}/>}
        <WorkspaceSidebar />
        <main className="workspace-main">
          <Outlet />
        </main>
      </div>
    </div>
  );
};
