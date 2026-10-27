import React from 'react';
import { Navigate } from 'react-router-dom';
import { useStore } from '@/shared/store/store';
import { authStore } from './store';

export const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const user = useStore(authStore, (s) => s.user);
  const booting = useStore(authStore, (s) => s.booting);
  if (booting) return <div style={{ padding: 40 }}>Загрузка…</div>;
  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
};