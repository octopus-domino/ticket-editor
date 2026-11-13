import { t as __tr } from '@/shared/i18n';
import React, { lazy, Suspense, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import './App.css';
import './shared/authoring-layout.css';
import { authStore } from './auth/store';
import { useStore } from '@/shared/store/store';
import { LandingPage } from './marketing/LandingPage';
import { LoginPage } from './auth/LoginPage';
import { RegisterPage } from './auth/RegisterPage';
import { OAuth2RedirectPage } from './auth/OAuth2RedirectPage';
import { ProtectedRoute } from './auth/ProtectedRoute';
import { RouteMetadata } from './marketing/RouteMetadata';
import { defaultJourney } from './features/journeys/domain/definitions';
import { JOURNEY_PAGES } from './marketing/journeyPages';
import { JourneyMarketingPage } from './marketing/JourneyMarketingPage';
const JourneyApp = lazy(() => import('./features/journeys/JourneyApp'));
const PublicationsPage = lazy(() => import('./features/journeys/ui/PublicationsPage'));
const WorkflowBuilder = lazy(() => import('./features/workflows/WorkflowBuilder'));
const WorkflowRunner = lazy(() => import('./features/workflows/WorkflowRunner'));
const VisitCheckPage = lazy(() => import('./features/workflows/VisitCheckPage'));
import { SearchLandingPage, NotFoundPage } from './marketing/SearchLandingPage';
import { SEARCH_PAGES } from './marketing/searchPages';

const WorkspaceRuntime = lazy(() =>
  import('./workspace/components/WorkspaceRuntime').then((m) => ({ default: m.WorkspaceRuntime })),
);
const WorkspaceHome = lazy(() =>
  import('./workspace/components/WorkspaceHome').then((m) => ({ default: m.WorkspaceHome })),
);
const EditorPage = lazy(() =>
  import('./workspace/components/EditorPage').then((m) => ({ default: m.EditorPage })),
);
const GenerationPage = lazy(() =>
  import('@/features/generation/ui/GenerationPage').then((m) => ({ default: m.GenerationPage })),
);
const TemplatesPage = lazy(() =>
  import('@/features/templates/ui/TemplatesPage').then((m) => ({ default: m.TemplatesPage })),
);
const TemplateEditorPage = lazy(() =>
  import('@/features/templates/ui/TemplateEditorPage').then((m) => ({
    default: m.TemplateEditorPage,
  })),
);
const NewTemplatePage = lazy(() =>
  import('@/features/templates/ui/NewTemplatePage').then((m) => ({ default: m.NewTemplatePage })),
);
const DocumentLibraryPage = lazy(() => import('./features/library/DocumentLibraryPage').then((module) => ({ default: module.DocumentLibraryPage })));
const StampStudioPage = lazy(() => import('./features/stamps/StampStudioPage').then((module) => ({ default: module.StampStudioPage })));
const LearningPage = lazy(() => import('./features/learning/LearningPage').then((module) => ({ default: module.LearningPage })));
const SigningPage = lazy(() => import('./features/signing/SigningPage').then((module) => ({ default: module.SigningPage })));
const ApiAccessPage = lazy(() => import('./features/client-api/ApiAccessPage').then((module) => ({ default: module.ApiAccessPage })));
const ConnectorPage = lazy(() => import('./features/connectors/ConnectorPage').then((module) => ({ default: module.ConnectorPage })));
const GenerationHistoryPage = lazy(() => import('./features/history/GenerationHistoryPage').then((module) => ({ default: module.GenerationHistoryPage })));
const AssetLibrariesPage = lazy(() => import('./features/asset-libraries/AssetLibrariesPage').then((module) => ({ default: module.AssetLibrariesPage })));
const DataWorkspacePage = lazy(() => import('./features/data-models/ui/DataWorkspacePage').then((module) => ({ default: module.DataWorkspacePage })));
const ProfilePage = lazy(() => import('./features/profile/ProfilePage').then((module) => ({ default: module.ProfilePage })));

const App: React.FC = () => {
  const offline = useStore(authStore, (s) => s.offline);

  useEffect(() => {
    void authStore.bootstrap();
  }, []);

  const basename = import.meta.env.BASE_URL;

  return (
    <BrowserRouter
      basename={basename}
      future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
    >
      <RouteMetadata />
      {offline && <div className="offline-banner">{__tr("⚠️ Бэкенд недоступен. Локальный режим.")}</div>}
      <div className="app-root" style={{ height: offline ? 'calc(100vh - 37px)' : '100vh' }}>
        <Suspense
          fallback={
            <div role="status" style={{ padding: 32 }}>
              {__tr("Загрузка…")}</div>
          }
        >
          <Routes>
            {/* Публичные страницы */}
            <Route path="/" element={window.location.hostname.endsWith('.codoc.site') && !['www','app','api','drawio','go'].includes(window.location.hostname.split('.')[0]) ? <JourneyApp mode={defaultJourney(window.location.hostname)?'wizard':'custom'} /> : <LandingPage />} />
            <Route path="/start/:kind" element={<JourneyApp />} />
            {JOURNEY_PAGES.map(page => <Route key={page.path} path={page.path} element={<JourneyMarketingPage/>} />)}
            <Route path="/s/:slug" element={<JourneyApp mode="custom" />} />
            <Route path="/sites/new" element={<JourneyApp mode="builder" />} />
            <Route path="/flows/:slug" element={<WorkflowRunner />} />
            <Route path="/visits/:id" element={<VisitCheckPage />} />
            <Route path="/d/:id" element={<JourneyApp mode="public" />} />
            <Route path="/manage/:id" element={<JourneyApp mode="manage" />} />
            <Route path="/issues/:id" element={<JourneyApp mode="batch" />} />
            {SEARCH_PAGES.map((page) => (
              <Route key={page.path} path={page.path} element={<SearchLandingPage />} />
            ))}
            <Route path="/login" element={<LoginPage />} />
            <Route path="/learn" element={<LearningPage />} />
            <Route path="/stamp-editor" element={<StampStudioPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/auth/callback" element={<OAuth2RedirectPage />} />

            {/* Защищённая часть */}
            <Route
              path="/app"
              element={
                <ProtectedRoute>
                  <WorkspaceRuntime />
                </ProtectedRoute>
              }
            >
              <Route
                index
                element={offline ? <Navigate to="/app/editor/local" replace /> : <WorkspaceHome />}
              />
              <Route path="editor/:docId" element={<EditorPage />} />
              <Route path="templates" element={<TemplatesPage />} />
              <Route path="workflows" element={<WorkflowBuilder />} />
              <Route path="library" element={<DocumentLibraryPage />} />
              <Route path="stamps" element={<StampStudioPage />} />
              <Route path="learn" element={<LearningPage />} />
              <Route path="sign" element={<SigningPage />} />
              <Route path="api-access" element={<ApiAccessPage />} />
              <Route path="integrations" element={<ConnectorPage />} />
              <Route path="history" element={<GenerationHistoryPage />} />
              <Route path="publications" element={<PublicationsPage />} />
              <Route path="libraries" element={<AssetLibrariesPage />} />
              <Route path="templates/new" element={<NewTemplatePage />} />
              <Route path="templates/:templateId/edit" element={<TemplateEditorPage />} />
              <Route path="schemas" element={<DataWorkspacePage />} />
              <Route path="schemas/new" element={<DataWorkspacePage />} />
              <Route path="schemas/:schemaId" element={<DataWorkspacePage />} />
              <Route path="data-models" element={<DataWorkspacePage />} />
              <Route path="data" element={<DataWorkspacePage />} />
              <Route path="profile" element={<ProfilePage />} />
              <Route path="generate" element={<GenerationPage />} />
            </Route>

            {/* Всё остальное — на лендинг */}
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </Suspense>
      </div>
    </BrowserRouter>
  );
};

export default App;
