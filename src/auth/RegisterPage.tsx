import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { authStore } from './store';

export const RegisterPage: React.FC = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await authStore.register(email, password, name || undefined);
      navigate('/', { replace: true });
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={{ maxWidth: 360, margin: '80px auto', padding: 24, border: '1px solid #e2e8f0', borderRadius: 12 }}>
      <h2 style={{ marginTop: 0 }}>Регистрация</h2>
      <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <label>Email
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required style={{ width: '100%', padding: 8 }} />
        </label>
        <label>Имя (необязательно)
          <input value={name} onChange={(e) => setName(e.target.value)} style={{ width: '100%', padding: 8 }} />
        </label>
        <label>Пароль (мин. 8 символов)
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} minLength={8} required style={{ width: '100%', padding: 8 }} />
        </label>
        {error && <div style={{ color: '#dc2626', fontSize: 13 }}>{error}</div>}
        <button type="submit" disabled={busy} style={{ padding: 10, background: '#6366f1', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer' }}>
          {busy ? 'Создание…' : 'Создать аккаунт'}
        </button>
      </form>
      <p style={{ marginTop: 16, fontSize: 13 }}>
        Уже есть аккаунт? <Link to="/login">Войти</Link>
      </p>
    </div>
  );
};