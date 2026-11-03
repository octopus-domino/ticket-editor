import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { authStore } from './store';
import { useStore } from '@/shared/store/store';
import './auth.css';
import { AuthProductAside } from './AuthProductAside';
import { useAuthDestination } from './useAuthDestination';

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
          <Link to="/" className="auth-back">
            ← На главную
          </Link>

          {offline ? (
            <div className="auth-offline">
              <div className="auth-offline-icon">📴</div>
              <h2>Сервер недоступен</h2>
              <p>
                Связаться не удалось. Но вы можете работать в <b>локальном режиме</b> — всё
                сохранится в этом браузере.
              </p>
              <div className="auth-offline-actions">
                <button
                  type="button"
                  className="auth-submit"
                  onClick={() => navigate('/app/editor/local', { replace: true })}
                >
                  Перейти в редактор →
                </button>
                <button
                  type="button"
                  className="auth-offline-ghost"
                  onClick={() => window.location.reload()}
                >
                  Попробовать снова
                </button>
              </div>
            </div>
          ) : (
            <>
              <h1 className="auth-title">Вход</h1>
              <p className="auth-subtitle">Продолжите с Google или войдите по email.</p>

              <a
                href="/oauth2/authorization/google"
                className="auth-google"
                onClick={rememberOAuthDestination}
              >
                <img src="https://www.google.com/favicon.ico" alt="" referrerPolicy="no-referrer" />
                Войти через Google
              </a>

              <div className="auth-divider">или</div>

              <form className="auth-form" onSubmit={submit}>
                <div className="auth-field">
                  <label htmlFor="email">Email</label>
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
                  <label htmlFor="password">Пароль</label>
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
                  {busy ? 'Вход…' : 'Войти →'}
                </button>
              </form>

              <p className="auth-footer">
                Нет аккаунта? <Link to={`/register${suffix}`}>Зарегистрироваться</Link>
              </p>
            </>
          )}
        </div>
      </main>
    </div>
  );
};
