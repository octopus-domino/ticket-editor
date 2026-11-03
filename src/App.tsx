import React, { lazy, Suspense, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import './App.css';
import { authStore } from './auth/store';
import { useStore } from '@/shared/store/store';
import { LandingPage } from './marketing/LandingPage';
import { LoginPage } from './auth/LoginPage';
import { RegisterPage } from './auth/RegisterPage';
import { OAuth2RedirectPage } from './auth/OAuth2RedirectPage';
import { ProtectedRoute } from './auth/ProtectedRoute';
import { RouteMetadata } from './marketing/RouteMetadata';
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
const SchemasPage = lazy(() =>
  import('@/features/schemas/ui/SchemasPage').then((m) => ({ default: m.SchemasPage })),
);
const SchemaEditorPage = lazy(() =>
  import('@/features/schemas/ui/SchemaEditorPage').then((m) => ({ default: m.SchemaEditorPage })),
);
const ModelsPage = lazy(() =>
  import('@/features/data-models/ui/ModelsPage').then((m) => ({ default: m.ModelsPage })),
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
      {offline && <div className="offline-banner">⚠️ Бэкенд недоступен. Локальный режим.</div>}
      <div className="app-root" style={{ height: offline ? 'calc(100vh - 37px)' : '100vh' }}>
        <Suspense
          fallback={
            <div role="status" style={{ padding: 32 }}>
              Загрузка…
            </div>
          }
        >
          <Routes>
            {/* Публичные страницы */}
            <Route path="/" element={<LandingPage />} />
            {SEARCH_PAGES.map((page) => (
              <Route key={page.path} path={page.path} element={<SearchLandingPage />} />
            ))}
            <Route path="/login" element={<LoginPage />} />
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
              <Route path="templates/new" element={<NewTemplatePage />} />
              <Route path="templates/:templateId/edit" element={<TemplateEditorPage />} />
              <Route path="schemas" element={<SchemasPage />} />
              <Route path="schemas/new" element={<SchemaEditorPage />} />
              <Route path="schemas/:schemaId" element={<SchemaEditorPage />} />
              <Route path="data-models" element={<ModelsPage />} />
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
