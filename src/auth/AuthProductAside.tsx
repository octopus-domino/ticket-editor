import { Link } from 'react-router-dom';

export function AuthProductAside() {
  return (
    <aside className="auth-left">
      <Link to="/" className="auth-brand">
        <span className="auth-brand-mark">co</span>CoDoc
      </Link>
      <div className="auth-quote">
        <p className="auth-quote-text">
          Документы разные.
          <br />
          <em>Шаблон — один.</em>
        </p>
        <p>Соберите макет в своём стиле. Подставьте данные. Получите готовые документы.</p>
      </div>
      <ul className="auth-features">
        <li>
          <span className="check">✓</span> Визуальный редактор шаблонов
        </li>
        <li>
          <span className="check">✓</span> Персонализация из своих данных
        </li>
        <li>
          <span className="check">✓</span> Экспорт PDF, PDF/A и SVG
        </li>
      </ul>
    </aside>
  );
}
