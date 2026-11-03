import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import './App.css';
import { authStore } from './auth/store';
import { useStore } from '@/shared/store/store';
import { LandingPage } from './marketing/LandingPage';
import { LoginPage } from './auth/LoginPage';
import { RegisterPage } from './auth/RegisterPage';
import { OAuth2RedirectPage } from './auth/OAuth2RedirectPage';
import { ProtectedRoute } from './auth/ProtectedRoute';
import { WorkspaceLayout } from './workspace/components/WorkspaceLayout';
import { WorkspaceHome } from './workspace/components/WorkspaceHome';
import { EditorPage } from './workspace/components/EditorPage';
import { SchemasPage } from '@/features/schemas/ui/SchemasPage';
import { SchemaEditorPage } from '@/features/schemas/ui/SchemaEditorPage';
import { ModelsPage } from '@/features/data-models/ui/ModelsPage';
import { GenerationPage } from '@/features/generation/ui/GenerationPage';
import { TemplatesPage } from '@/features/templates/ui/TemplatesPage';
import { TemplateEditorPage } from '@/features/templates/ui/TemplateEditorPage';

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
      {offline && <div className="offline-banner">⚠️ Бэкенд недоступен. Локальный режим.</div>}
      <div className="app-root" style={{ height: offline ? 'calc(100vh - 37px)' : '100vh' }}>
        <Routes>
          {/* Публичные страницы */}
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/auth/callback" element={<OAuth2RedirectPage />} />

          {/* Защищённая часть */}
          <Route
            path="/app"
            element={
              <ProtectedRoute>
                <WorkspaceLayout />
              </ProtectedRoute>
            }
          >
            <Route
              index
              element={offline ? <Navigate to="/app/editor/local" replace /> : <WorkspaceHome />}
            />
            <Route path="editor/:docId" element={<EditorPage />} />
            <Route path="templates" element={<TemplatesPage />} />
            <Route path="templates/:templateId/edit" element={<TemplateEditorPage />} />
            <Route path="schemas" element={<SchemasPage />} />
            <Route path="schemas/new" element={<SchemaEditorPage />} />
            <Route path="schemas/:schemaId" element={<SchemaEditorPage />} />
            <Route path="data-models" element={<ModelsPage />} />
            <Route path="generate" element={<GenerationPage />} />
          </Route>

          {/* Всё остальное — на лендинг */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
};

export default App;
