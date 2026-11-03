import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { authStore } from './store';
import { authApi } from './api';
import './auth.css';
import { consumeOAuthDestination } from './useAuthDestination';

export const OAuth2RedirectPage: React.FC = () => {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const token = params.get('token');
    if (!token) {
      setError('Токен не получен от сервера');
      setTimeout(() => navigate('/login', { replace: true }), 3000);
      return;
    }

    authStore.setSession(token, { id: '', email: '', name: 'Загрузка…' });

    authApi.me()
      .then((user) => {
        authStore.setSession(token, user);
        navigate(consumeOAuthDestination(), { replace: true });
      })
      .catch((err) => {
        console.error('OAuth2 me() failed:', err);
        authStore.clear();
        setError('Не удалось получить профиль: ' + (err as Error).message);
        setTimeout(() => navigate('/login', { replace: true }), 3000);
      });
  }, [params, navigate]);

  return (
    <div
      className="auth-root"
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
        gridTemplateColumns: 'unset',
      }}
    >
      <div style={{ textAlign: 'center', maxWidth: 400 }}>
        <Link to="/" className="auth-brand" style={{ marginBottom: 32, justifyContent: 'center' }}>
          <span className="auth-brand-mark">T</span>
          ticket-editor
        </Link>

        {error ? (
          <div className="auth-error" style={{ marginTop: 24 }}>{error}</div>
        ) : (
          <>
            <h1 className="auth-title" style={{ fontSize: 22, marginTop: 24 }}>
              Завершаем вход…
            </h1>
            <p className="auth-subtitle">Пара секунд.</p>
          </>
        )}
      </div>
    </div>
  );
};
