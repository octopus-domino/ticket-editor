import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { authStore } from './store';
import './auth.css';

export const RegisterPage: React.FC = () => {
  const navigate = useNavigate();
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
      navigate('/app', { replace: true });
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="auth-root">
      <aside className="auth-left">
        <Link to="/" className="auth-brand">
          <span className="auth-brand-mark">T</span>
          ticket-editor
        </Link>

        <div className="auth-quote">
          <p className="auth-quote-text">
            Первый шаблон — 10 минут.<br />
            <em>Интеграция — день.</em>
          </p>
          <div className="auth-quote-author">
            <div className="auth-quote-avatar">АК</div>
            <div>
              <div className="auth-quote-name">Алексей К.</div>
              <div className="auth-quote-role">CTO, fintech.io</div>
            </div>
          </div>
        </div>

        <ul className="auth-features">
          <li><span className="check">✓</span> 100 документов бесплатно, без карты</li>
          <li><span className="check">✓</span> Неограниченно проектов на Pro</li>
          <li><span className="check">✓</span> Отмена подписки в один клик</li>
        </ul>
      </aside>

      <main className="auth-right">
        <div className="auth-form-wrap">
          <Link to="/" className="auth-back">← На главную</Link>

          <h1 className="auth-title">Создать аккаунт</h1>
          <p className="auth-subtitle">Бесплатно. 100 документов в месяц. Без карты.</p>

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
              <label htmlFor="name">Имя (необязательно)</label>
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
              <label htmlFor="password">Пароль (минимум 8 символов)</label>
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
              {busy ? 'Создание…' : 'Создать аккаунт →'}
            </button>
          </form>

          <p className="auth-footer">
            Уже есть аккаунт? <Link to="/login">Войти</Link>
          </p>
        </div>
      </main>
    </div>
  );
};