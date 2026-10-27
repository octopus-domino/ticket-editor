import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import './App.css';
import { authStore } from './auth/store';
import { LoginPage } from './auth/LoginPage';
import { RegisterPage } from './auth/RegisterPage';
import { OAuth2RedirectPage } from './auth/OAuth2RedirectPage';
import { ProtectedRoute } from './auth/ProtectedRoute';
import { WorkspaceLayout } from './workspace/components/WorkspaceLayout';
import { WorkspaceHome } from './workspace/components/WorkspaceHome';
import { EditorPage } from './workspace/components/EditorPage';

const App: React.FC = () => {
  useEffect(() => {
    void authStore.bootstrap();
  }, []);

  // BASE_URL выставляется Vite из vite.config.ts.base:
  //   на GitHub Pages — '/<repo>/',
  //   локально — '/'.
  const basename = import.meta.env.BASE_URL;

  return (
    <BrowserRouter
      basename={basename}
      future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
    >
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/oauth2/redirect" element={<OAuth2RedirectPage />} />

        <Route
          path="/"
          element={
            <ProtectedRoute>
              <WorkspaceLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<WorkspaceHome />} />
          <Route path="editor/:docId" element={<EditorPage />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
};

export default App;