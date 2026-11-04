import { t as __tr } from '@/shared/i18n';
import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { authStore } from './store';
import './auth.css';
import { AuthProductAside } from './AuthProductAside';
import { useAuthDestination } from './useAuthDestination';
import { LanguageSwitcher } from '@/shared/i18n/LanguageSwitcher';

export const RegisterPage: React.FC = () => {
  const navigate = useNavigate();
  const { destination, suffix } = useAuthDestination();
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await authStore.register(email, password, name || undefined);
      navigate(destination, { replace: true });
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="auth-root">
      <AuthProductAside />

      <main className="auth-right">
        <div className="auth-form-wrap">
          <LanguageSwitcher />
          <Link to="/" className="auth-back">
            {__tr("← На главную")}</Link>

          <h1 className="auth-title">{__tr("Создать аккаунт")}</h1>
          <p className="auth-subtitle">{__tr("Сохраните свои шаблоны и создавайте документы из данных.")}</p>

          <form className="auth-form" onSubmit={submit}>
            <div className="auth-field">
              <label htmlFor="email">{__tr("Email")}</label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                className={`auth-input${error ? ' error' : ''}`}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoFocus
              />
            </div>

            <div className="auth-field">
              <label htmlFor="name">{__tr("Имя (необязательно)")}</label>
              <input
                id="name"
                type="text"
                autoComplete="name"
                className="auth-input"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>

            <div className="auth-field">
              <label htmlFor="password">{__tr("Пароль (минимум 8 символов)")}</label>
              <input
                id="password"
                type="password"
                autoComplete="new-password"
                minLength={8}
                className={`auth-input${error ? ' error' : ''}`}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            {error && <div className="auth-error">{error}</div>}

            <button type="submit" disabled={busy} className="auth-submit">
              {busy ? __tr("Создание…") : __tr("Создать аккаунт →")}
            </button>
          </form>

          <p className="auth-footer">
            {__tr("Уже есть аккаунт?")}<Link to={`/login${suffix}`}>{__tr("Войти")}</Link>
          </p>
        </div>
      </main>
    </div>
  );
};
