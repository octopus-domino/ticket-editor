import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { authStore } from './store';
import { authApi } from './api';

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

    // Сохраняем токен в стор ДО вызова me()
    authStore.setSession(token, { id: '', email: '', name: 'Загрузка...' });

    // Теперь authFetch подхватит этот токен
    authApi.me()
      .then((user) => {
        authStore.setSession(token, user);
        navigate('/', { replace: true });
      })
      .catch((err) => {
        console.error('OAuth2 me() failed:', err);
        authStore.clear();
        setError('Не удалось получить профиль: ' + (err as Error).message);
        setTimeout(() => navigate('/login', { replace: true }), 3000);
      });
  }, [params, navigate]);

  if (error) {
    return <div style={{ padding: 40, textAlign: 'center', color: '#dc2626' }}>{error}</div>;
  }

  return (
    <div style={{ padding: 40, textAlign: 'center', color: '#64748b' }}>
      Завершаем вход через Google…
    </div>
  );
};