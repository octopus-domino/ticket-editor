import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { authStore } from './store';
import { useStore } from '@/shared/store/store';

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const offline = useStore(authStore, (s) => s.offline);
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await authStore.login(email, password);
      navigate('/', { replace: true });
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  // Если бэкенд недоступен, показываем экран локального режима
  if (offline) {
    return (
      <div style={{ maxWidth: 400, margin: '100px auto', padding: 32, textAlign: 'center', background: '#fff', borderRadius: 12, boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>📴</div>
        <h2 style={{ marginTop: 0, color: '#0f172a' }}>Сервер недоступен</h2>
        <p style={{ color: '#64748b', fontSize: 14, lineHeight: 1.5, marginBottom: 24 }}>
          Мы не можем связаться с сервером. Но вы можете продолжить работу в <b>локальном режиме</b>. Все изменения сохранятся в этом браузере.
        </p>
        <button
          type="button"
          onClick={() => navigate('/editor/local', { replace: true })}
          style={{ width: '100%', padding: '12px', background: '#6366f1', color: '#fff', border: 'none', borderRadius: 6, fontSize: 15, fontWeight: 600, cursor: 'pointer' }}
        >
          Перейти в редактор
        </button>
        <button
          type="button"
          onClick={() => window.location.reload()}
          style={{ width: '100%', padding: '10px', marginTop: 12, background: 'transparent', color: '#6366f1', border: 'none', fontSize: 13, cursor: 'pointer' }}
        >
          Попробовать подключиться снова
        </button>
      </div>
    );
  }

  // Обычная форма логина (если сервер жив)
  return (
    <div style={{ maxWidth: 360, margin: '80px auto', padding: 24, border: '1px solid #e2e8f0', borderRadius: 12 }}>
      <h2 style={{ marginTop: 0 }}>Вход</h2>
      
      <a
        href="/oauth2/authorization/google"
        style={{
          display: 'block', textAlign: 'center', padding: '10px',
          background: '#fff', border: '1px solid #cbd5e1',
          borderRadius: 6, textDecoration: 'none', color: '#0f172a',
          fontWeight: 500, marginBottom: 16
        }}
      >
        <img
          src="https://www.google.com/favicon.ico"
          alt=""
          style={{ width: 16, marginRight: 8, verticalAlign: 'middle' }}
        />
        Войти через Google
      </a>

      <div style={{ textAlign: 'center', color: '#94a3b8', fontSize: 12, marginBottom: 16 }}>
        или войдите с помощью email
      </div>

      <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <label>Email
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required style={{ width: '100%', padding: 8 }} />
        </label>
        <label>Пароль
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required style={{ width: '100%', padding: 8 }} />
        </label>
        {error && <div style={{ color: '#dc2626', fontSize: 13 }}>{error}</div>}
        <button type="submit" disabled={busy} style={{ padding: 10, background: '#6366f1', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer' }}>
          {busy ? 'Вход…' : 'Войти'}
        </button>
      </form>
      <p style={{ marginTop: 16, fontSize: 13 }}>
        Нет аккаунта? <Link to="/register">Зарегистрироваться</Link>
      </p>
    </div>
  );
};