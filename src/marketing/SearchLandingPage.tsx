import { t as __tr } from '@/shared/i18n';
import { Link, useLocation } from 'react-router-dom';
import { useStore } from '@/shared/store/store';
import { authStore } from '@/auth/store';
import { reachGoal } from '@/shared/analytics/metrika';
import { FeedbackWidget } from '@/features/feedback/ui/FeedbackWidget';
import { SEARCH_PAGES } from './searchPages';
import { LanguageSwitcher } from '@/shared/i18n/LanguageSwitcher';
import './landing.css';
import './search-page.css';

export function SearchLandingPage() {
  const { pathname } = useLocation();
  const page = SEARCH_PAGES.find(
    (item) => item.path.replace(/\/$/, '') === pathname.replace(/\/$/, ''),
  );
  const user = useStore(authStore, (state) => state.user);
  const offline = useStore(authStore, (state) => state.offline);
  if (!page) return <NotFoundPage />;
  const startHref = page.path === '/stamps/' ? '/stamp-editor' : offline
    ? '/app/editor/local'
    : user
      ? '/app/templates/new'
      : '/register?next=%2Fapp%2Ftemplates%2Fnew';
  return (
    <div className="codoc-landing">
      <header className="codoc-header codoc-container">
        <Link className="codoc-brand" to="/">
          CoDoc.
        </Link>
        <nav aria-label={__tr("Разделы сайта")}>
          {SEARCH_PAGES.map((item) => (
            <Link
              to={item.path}
              key={item.path}
              aria-current={item.path === page.path ? 'page' : undefined}
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <LanguageSwitcher />
        <Link className="codoc-button codoc-button-small" to={user || offline ? '/app' : '/login'}>
          {user || offline ? __tr("Мои документы") : __tr("Войти")} ↗
        </Link>
      </header>
      <main className="codoc-container search-main">
        <p className="codoc-micro">{__tr('Free to use')}</p>
        <nav className="search-breadcrumbs" aria-label={__tr("Хлебные крошки")}>
          <Link to="/">{__tr("Главная")}</Link>
          <span aria-hidden="true">/</span>
          <span aria-current="page">{page.label}</span>
        </nav>
        <section className="search-hero">
          <div>
            <p className="codoc-eyebrow">{page.label} · CoDoc</p>
            <h1>{page.heading}</h1>
            <p className="codoc-lead">{page.lead}</p>
            <Link
              className="codoc-button codoc-primary"
              to={startHref}
              onClick={() => reachGoal('start_template', { placement: page.path })}
            >
              {__tr("Создать свой шаблон ↗")}</Link>
          </div>
          <img
            src={`${import.meta.env.BASE_URL}images/document-studio.webp`}
            width="1536"
            height="1024"
            alt={__tr("Примеры макетов документов, сертификатов и билетов")}
          />
        </section>
        <section className="search-steps">
          <h2>{__tr("От макета к готовым документам")}</h2>
          <ol className="codoc-steps">
            {page.steps.map((step, index) => (
              <li key={step.title}>
                <span>0{index + 1}</span>
                <h3>{step.title}</h3>
                <p>{step.text}</p>
              </li>
            ))}
          </ol>
        </section>
        <article className="search-article">
          {page.sections.map((section) => (
            <section key={section.title}>
              <h2>{section.title}</h2>
              {section.paragraphs.map((text) => (
                <p key={text}>{text}</p>
              ))}
            </section>
          ))}
        </article>
        <section className="search-faq">
          <h2>{__tr("Частые вопросы")}</h2>
          {page.faq.map((item) => (
            <details key={item.question}>
              <summary>{item.question}</summary>
              <p>{item.answer}</p>
            </details>
          ))}
        </section>
        <section className="search-related">
          <h2>{__tr("Другие возможности CoDoc")}</h2>
          <div>
            {SEARCH_PAGES.filter((item) => item.path !== page.path).map((item) => (
              <Link to={item.path} key={item.path}>
                <strong>{item.label} ↗</strong>
                <span>{item.description}</span>
              </Link>
            ))}
          </div>
        </section>
        <section className="codoc-final">
          <h2>{__tr("Создайте первый макет")}</h2>
          <p>{__tr("Начните с оформления. Поля и данные можно добавить позже.")}</p>
          <Link
            className="codoc-button codoc-primary"
            to={startHref}
            onClick={() => reachGoal('start_template', { placement: `${page.path}footer` })}
          >
            {__tr("Открыть конструктор шаблонов ↗")}</Link>
        </section>
      </main>
      <footer className="codoc-footer codoc-container">
        <Link to="/" className="codoc-brand">
          CoDoc.
        </Link>
        <span>{__tr("Редактор шаблонов и генератор PDF онлайн")}</span>
        <FeedbackWidget surface="landing" />
      </footer>
    </div>
  );
}

export function NotFoundPage() {
  return (
    <main className="codoc-landing">
      <div className="codoc-container search-main">
        <p className="codoc-eyebrow">{__tr("Ошибка 404")}</p>
        <h1>{__tr("Страница не найдена")}</h1>
        <p>{__tr("Проверьте адрес или выберите нужный раздел.")}</p>
        <Link className="codoc-button codoc-primary" to="/">
          {__tr("На главную →")}</Link>
        <div className="search-related">
          {SEARCH_PAGES.map((page) => (
            <p key={page.path}>
              <Link to={page.path}>{page.label}</Link>
            </p>
          ))}
        </div>
      </div>
    </main>
  );
}
