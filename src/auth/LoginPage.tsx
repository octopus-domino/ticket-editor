import { t as __tr } from '@/shared/i18n';
import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { authStore } from './store';
import { useStore } from '@/shared/store/store';
import './auth.css';
import { AuthProductAside } from './AuthProductAside';
import { useAuthDestination } from './useAuthDestination';
import { LanguageSwitcher } from '@/shared/i18n/LanguageSwitcher';

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const { destination, suffix, rememberOAuthDestination } = useAuthDestination();
  const offline = useStore(authStore, (s) => s.offline);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await authStore.login(email, password);
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
          <button
            type="button"
            className="auth-submit"
            onClick={() => {
              authStore.enterGuest();
              navigate(destination, { replace: true });
            }}
          >
            {__tr('Continue without registration')}
          </button>
          <p>
            {__tr(
              'Free to use. Guest work stays in this browser tab session and is never saved to the server.',
            )}
          </p>
          <Link to="/" className="auth-back">
            {__tr('← На главную')}
          </Link>

          {offline ? (
            <div className="auth-offline">
              <div className="auth-offline-icon">📴</div>
              <h2>{__tr('Сервер недоступен')}</h2>
              <p>
                {__tr('Связаться не удалось. Но вы можете работать в')}{' '}
                <b>{__tr('локальном режиме')}</b> {__tr('— всё сохранится в этом браузере.')}
              </p>
              <div className="auth-offline-actions">
                <button
                  type="button"
                  className="auth-submit"
                  onClick={() => navigate('/app/editor/local', { replace: true })}
                >
                  {__tr('Перейти в редактор →')}
                </button>
                <button
                  type="button"
                  className="auth-offline-ghost"
                  onClick={() => window.location.reload()}
                >
                  {__tr('Попробовать снова')}
                </button>
              </div>
            </div>
          ) : (
            <>
              <h1 className="auth-title">{__tr('Вход')}</h1>
              <p className="auth-subtitle">{__tr('Продолжите с Google или войдите по email.')}</p>

              <a
                href="/oauth2/authorization/google"
                className="auth-google"
                onClick={rememberOAuthDestination}
              >
                <img src="https://www.google.com/favicon.ico" alt="" referrerPolicy="no-referrer" />
                {__tr('Войти через Google')}
              </a>

              <div className="auth-divider">{__tr('или')}</div>

              <form className="auth-form" onSubmit={submit}>
                <div className="auth-field">
                  <label htmlFor="email">{__tr('Email')}</label>
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
                  <label htmlFor="password">{__tr('Пароль')}</label>
                  <input
                    id="password"
                    type="password"
                    autoComplete="current-password"
                    className={`auth-input${error ? ' error' : ''}`}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>

                {error && <div className="auth-error">{error}</div>}

                <button type="submit" disabled={busy} className="auth-submit">
                  {busy ? __tr('Вход…') : __tr('Войти →')}
                </button>
              </form>

              <p className="auth-footer">
                {__tr('Нет аккаунта?')}
                <Link to={`/register${suffix}`}>{__tr('Зарегистрироваться')}</Link>
              </p>
            </>
          )}
        </div>
      </main>
    </div>
  );
};
