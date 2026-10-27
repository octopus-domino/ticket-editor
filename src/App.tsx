import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import './App.css';
import { authStore } from './auth/store';
import { useStore } from '@/shared/store/store';
import { LoginPage } from './auth/LoginPage';
import { RegisterPage } from './auth/RegisterPage';
import { OAuth2RedirectPage } from './auth/OAuth2RedirectPage';
import { ProtectedRoute } from './auth/ProtectedRoute';
import { WorkspaceLayout } from './workspace/components/WorkspaceLayout';
import { WorkspaceHome } from './workspace/components/WorkspaceHome';
import { EditorPage } from './workspace/components/EditorPage';

const App: React.FC = () => {
  const offline = useStore(authStore, (s) => s.offline);

  useEffect(() => {
    void authStore.bootstrap();
  }, []);

  const basename = import.meta.env.BASE_URL;

  return (
    <BrowserRouter basename={basename} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      {offline && (
        <div style={{ padding: '8px 16px', background: '#fffbeb', color: '#92400e', textAlign: 'center', fontSize: 13, borderBottom: '1px solid #fde68a', zIndex: 9999, position: 'relative' }}>
          ⚠️ Бэкенд недоступен. Вы работаете в локальном режиме. Изменения сохраняются в этом браузере.
        </div>
      )}
      
      <div style={{ display: 'flex', flexDirection: 'column', height: offline ? 'calc(100vh - 37px)' : '100vh' }}>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/oauth2/redirect" element={<OAuth2RedirectPage />} />

          <Route path="/" element={<ProtectedRoute><WorkspaceLayout /></ProtectedRoute>}>
            {/* Если пользователь зашел на главную, и мы оффлайн — кидаем в локальный проект */}
            <Route index element={offline ? <Navigate to="/editor/local" replace /> : <WorkspaceHome />} />
            <Route path="editor/:docId" element={<EditorPage />} />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
};

export default App;