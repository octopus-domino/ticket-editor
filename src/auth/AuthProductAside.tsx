import { t as __tr } from '@/shared/i18n';
import { Link } from 'react-router-dom';

export function AuthProductAside() {
  return (
    <aside className="auth-left">
      <Link to="/" className="auth-brand">
        <span className="auth-brand-mark">co</span>CoDoc
      </Link>
      <div className="auth-quote">
        <p className="auth-quote-text">
          {__tr("Документы разные.")}<br />
          <em>{__tr("Шаблон — один.")}</em>
        </p>
        <p>{__tr("Соберите макет в своём стиле. Подставьте данные. Получите готовые документы.")}</p>
      </div>
      <ul className="auth-features">
        <li><span className="check">✓</span>{__tr('Free to use')}</li>
        <li>
          <span className="check">✓</span> {__tr("Визуальный редактор шаблонов")}</li>
        <li>
          <span className="check">✓</span> {__tr("Персонализация из своих данных")}</li>
        <li>
          <span className="check">✓</span> {__tr("Экспорт PDF, PDF/A и SVG")}</li>
      </ul>
    </aside>
  );
}
