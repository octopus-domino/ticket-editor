import { t as __tr } from '@/shared/i18n';
import { Link } from 'react-router-dom';
import { useStore } from '@/shared/store/store';
import { authStore } from '@/auth/store';
import { reachGoal } from '@/shared/analytics/metrika';
import { USE_CASES, FEATURES, FAQ } from './content';
import './landing.css';
import './landing-people.css';
import { FeedbackWidget } from '@/features/feedback/ui/FeedbackWidget';
import { SEARCH_PAGES } from './searchPages';
import { LanguageSwitcher } from '@/shared/i18n/LanguageSwitcher';
import { JourneyDiscovery } from './JourneyDiscovery';
import { ReadySolutionsMenu } from './ReadySolutionsMenu';

export function LandingPage() {
  const user = useStore(authStore, (s) => s.user);
  const offline = useStore(authStore, (s) => s.offline);
  const startHref = offline
    ? '/app/editor/local'
    : user
      ? '/app/templates/new'
      : '/register?next=%2Fapp%2Ftemplates%2Fnew';
  const cta = (placement: string) => () => reachGoal('start_template', { placement });
  const stampHref = '/stamp-editor';
  return (
    <div className="codoc-landing">
      <a className="codoc-skip" href="#main-content">
        {__tr('К содержимому')}
      </a>
      <header className="codoc-header codoc-container">
        <Link className="codoc-brand" to="/" aria-label={__tr('CoDoc — главная')}>
          <span aria-hidden="true">co</span>CoDoc.
        </Link>
        <nav aria-label={__tr('Основная навигация')}>
          <a href="#possibilities">{__tr('Возможности')}</a>
          <a href="#stamps">{__tr('Штампы и печати')}</a>
          <a href="#workflow">{__tr('Как это работает')}</a>
          <Link to="/learn">{__tr('Learning center')}</Link>
          <a href="#questions">{__tr('Вопросы')}</a>
        </nav>
        <ReadySolutionsMenu />
        <LanguageSwitcher />
        <Link className="codoc-button codoc-button-small" to={user || offline ? '/app' : '/login'}>
          {user || offline ? __tr('Мои документы') : __tr('Войти')} ↗
        </Link>
      </header>
      <main id="main-content">
        <section className="codoc-hero codoc-container">
          <div className="codoc-hero-copy">
            <p className="codoc-eyebrow">{__tr('● Меньше рутины. Больше вашего дела.')}</p>
            <h1>
              {__tr('Документы разные.')}
              <br />
              {__tr('Шаблон —')} <em>{__tr('один.')}</em>
            </h1>
            <p className="codoc-lead">
              {__tr(
                'Создавайте билеты, сертификаты, штампы и печати онлайн. Соберите макет, подставьте данные и получите готовые PDF — без ручной правки каждого файла.',
              )}
            </p>
            <div className="codoc-actions">
              <Link
                className="codoc-button"
                to="/sites/new"
                onClick={() => reachGoal('start_site', { placement: 'hero' })}
              >
                {__tr('Create a website')} ↗
              </Link>
              <Link className="codoc-button codoc-primary" to={startHref} onClick={cta('hero')}>
                {__tr('Создать свой шаблон ↗')}
              </Link>
              <a className="codoc-text-link" href="#workflow">
                {__tr('Как это работает ↓')}
              </a>
            </div>
            <p className="codoc-micro">{__tr('Визуальный редактор · Свои данные · PDF и SVG')}</p>
            <p className="codoc-micro">
              {__tr(
                'Free to use. Guest work stays in this browser tab session and is never saved to the server.',
              )}
            </p>
            <button
              type="button"
              className="codoc-button"
              onClick={() => {
                authStore.enterGuest();
                window.location.assign('/app');
              }}
            >
              {__tr('Continue without registration')}
            </button>
          </div>
          <div className="codoc-hero-art">
            <img
              src={`${import.meta.env.BASE_URL}images/people-workshop-1280.webp`}
              srcSet={`${import.meta.env.BASE_URL}images/people-workshop-640.webp 640w, ${import.meta.env.BASE_URL}images/people-workshop-1280.webp 1280w`}
              sizes="(max-width: 800px) 100vw, 50vw"
              width="1280"
              height="853"
              alt={__tr('Two organizers preparing a workshop brochure together')}
            />
            <div className="codoc-art-label">
              <span aria-hidden="true">✓</span>
              <div>
                <strong>{__tr('Ваш стиль. Любые данные.')}</strong>
                <small>{__tr('Один макет для всей серии')}</small>
              </div>
            </div>
            <span className="codoc-art-note">{__tr('Сначала дизайн. Потом — без рутины.')}</span>
          </div>
        </section>
        <div className="codoc-proof codoc-container">
          <span>{__tr('От идеи до готового файла')}</span>
          <strong>{__tr('Визуальный редактор')}</strong>
          <i aria-hidden="true">✳</i>
          <strong>{__tr('Персонализация')}</strong>
          <i aria-hidden="true">✳</i>
          <strong>{__tr('Пакетная генерация')}</strong>
          <i aria-hidden="true">✳</i>
          <strong>PDF / PDF/A / SVG</strong>
        </div>
        <JourneyDiscovery />
        <section className="codoc-section codoc-container" id="possibilities">
          <div className="codoc-section-heading">
            <div>
              <p className="codoc-eyebrow">{__tr('Один инструмент — много задач')}</p>
              <h2>{__tr('Что создадим сегодня?')}</h2>
            </div>
            <p>
              {__tr('От одного документа до целой серии.')}
              <br />
              {__tr('Оформление остаётся вашим.')}
            </p>
          </div>
          <div className="codoc-cases">
            {USE_CASES.map((item, index) => (
              <article className={`codoc-case codoc-case-${index}`} key={item.title}>
                <div className="codoc-case-visual" aria-hidden="true">
                  <span className="codoc-case-number">0{index + 1}</span>
                  <div className="codoc-paper">
                    <small>{item.label}</small>
                    <strong>{item.sample}</strong>
                    <span className="codoc-paper-line" />
                    <span className="codoc-paper-line" />
                    <span className="codoc-paper-field">{item.field}</span>
                    <span className="codoc-paper-seal">✳</span>
                  </div>
                </div>
                <h3>{item.title}</h3>
                <p>{item.description}</p>
                <Link to={startHref} onClick={cta(`case_${index}`)}>
                  {__tr('Создать свой макет ↗')}
                </Link>
              </article>
            ))}
          </div>
          <p className="codoc-caption">
            {__tr('Примеры оформления. Соберите собственный макет в редакторе.')}
          </p>
        </section>
        <section className="codoc-section codoc-container codoc-stamps" id="stamps">
          <div>
            <p className="codoc-eyebrow">{__tr('Свой оттиск — внутри вашего документа')}</p>
            <h2>
              {__tr('Штампы и печати.')}
              <br />
              {__tr('От надписи до собственного макета.')}
            </h2>
            <p className="codoc-lead">
              {__tr(
                'Выберите штамп из библиотеки или соберите свой: рамки, текст по дуге, изображения и цвет. Разместите его на бланке, билете или сертификате.',
              )}
            </p>
            <ul>
              <li>{__tr('Круглые и прямоугольные композиции, прямой текст и надписи по дуге.')}</li>
              <li>{__tr('Редактирование слоёв, изображений, шрифтов и оформления.')}</li>
              <li>
                {__tr(
                  'Сохранение собственного штампа в библиотеку браузера для повторного использования.',
                )}
              </li>
              <li>{__tr('Экспорт документа со штампом в PDF и SVG.')}</li>
            </ul>
            <div className="codoc-actions">
              <Link className="codoc-button codoc-primary" to={stampHref} onClick={cta('stamps')}>
                {__tr('Создать макет со штампом ↗')}
              </Link>
              <Link className="codoc-text-link" to="/stamps/">
                {__tr('Подробнее о конструкторе →')}
              </Link>
            </div>
          </div>
          <div className="codoc-stamp-examples" aria-label={__tr('Примеры оформления штампов')}>
            <div className="codoc-stamp-round">
              <span>{__tr('ВАШ ТЕКСТ · ВАШ ДИЗАЙН')}</span>
              <strong>CoDoc</strong>
              <span>{__tr('МАКЕТ ПЕЧАТИ')}</span>
            </div>
            <div className="codoc-stamp-rect">
              <strong>{__tr('СОГЛАСОВАНО')}</strong>
              <span>{__tr('Дата __________')}</span>
            </div>
            <p className="codoc-caption">
              {__tr('Иллюстрации оформления. Текст и композицию вы настраиваете в редакторе.')}
            </p>
          </div>
        </section>
        <section className="codoc-workflow" id="workflow">
          <div className="codoc-container">
            <div className="codoc-section-heading">
              <div>
                <p className="codoc-eyebrow">{__tr('Понятный путь к результату')}</p>
                <h2>
                  {__tr('Настройте один раз.')}
                  <br />
                  <em>{__tr('Используйте снова и снова.')}</em>
                </h2>
              </div>
              <p>
                {__tr('Начните с макета. Добавьте поля,')}
                <br />
                {__tr('когда будете готовы к персонализации.')}
              </p>
            </div>
            <ol className="codoc-steps">
              <li>
                <span>{__tr('01 / Макет')}</span>
                <h3>{__tr('Соберите шаблон')}</h3>
                <p>
                  {__tr(
                    'Добавьте текст, изображения, таблицы и QR-код. Настройте размер страницы и расположение элементов.',
                  )}
                </p>
              </li>
              <li>
                <span>{__tr('02 / Данные')}</span>
                <h3>{__tr('Добавьте переменные')}</h3>
                <p>
                  {__tr(
                    'Опишите поля — имя, дату, номер — и свяжите их с макетом. Заполните значения или импортируйте JSON.',
                  )}
                </p>
              </li>
              <li>
                <span>{__tr('03 / Результат')}</span>
                <h3>{__tr('Получите документы')}</h3>
                <p>
                  {__tr(
                    'Выберите шаблон и наборы данных. Скачайте PDF, архивный PDF/A или SVG, а серию файлов — в ZIP.',
                  )}
                </p>
              </li>
            </ol>
            <div className="codoc-series">
              <img
                src={`${import.meta.env.BASE_URL}images/template-series.webp`}
                width="1200"
                height="800"
                loading="lazy"
                alt={__tr('Один шаблон и персональные данные превращаются в серию сертификатов')}
              />
              <div>
                <strong>{__tr('Один дизайн. Целая серия.')}</strong>
                <p>
                  {__tr('Имена, даты и номера меняются.')}
                  <br />
                  {__tr('Оформление остаётся единым.')}
                </p>
                <Link
                  className="codoc-button codoc-primary"
                  to={startHref}
                  onClick={cta('workflow')}
                >
                  {__tr('Начать с первого шаблона ↗')}
                </Link>
              </div>
            </div>
          </div>
        </section>
        <section className="codoc-section codoc-container">
          <div className="codoc-section-heading">
            <div>
              <p className="codoc-eyebrow">{__tr('Детали, которые работают на вас')}</p>
              <h2>
                {__tr('Красиво на экране.')}
                <br />
                {__tr('Готово к отправке.')}
              </h2>
            </div>
          </div>
          <div className="codoc-features">
            {FEATURES.map((feature) => (
              <article key={feature.title}>
                <span aria-hidden="true">{feature.icon}</span>
                <h3>{feature.title}</h3>
                <p>{feature.description}</p>
              </article>
            ))}
          </div>
        </section>
        <section className="codoc-people codoc-container">
          <img
            src={`${import.meta.env.BASE_URL}images/people-certificate-1280.webp`}
            srcSet={`${import.meta.env.BASE_URL}images/people-certificate-640.webp 640w, ${import.meta.env.BASE_URL}images/people-certificate-1280.webp 1280w`}
            sizes="(max-width: 800px) 100vw, 55vw"
            width="1280"
            height="853"
            loading="lazy"
            alt={__tr('A workshop facilitator hands a certificate to a participant')}
          />
          <div>
            <p className="codoc-eyebrow">{__tr('Made for your everyday work')}</p>
            <h2>{__tr('Less time on files. More time with people.')}</h2>
            <p className="codoc-lead">
              {__tr(
                'Prepare the brochure, personalize the certificates and get back to your guests. Start with a guided example.',
              )}
            </p>
            <Link className="codoc-button codoc-primary" to="/learn?lesson=document">
              {__tr('Open the brochure lesson')} ↗
            </Link>
            <Link className="codoc-text-link" to="/learn?lesson=stamp">
              {__tr('Round stamp with a center image')} →
            </Link>
          </div>
        </section>
        <section className="codoc-faq codoc-container" id="questions">
          <div>
            <p className="codoc-eyebrow">{__tr('Разберёмся вместе')}</p>
            <h2>
              {__tr('Перед первым')}
              <br />
              {__tr('шаблоном.')}
            </h2>
          </div>
          <div>
            {FAQ.map((item) => (
              <details key={item.question}>
                <summary>
                  {item.question}
                  <span aria-hidden="true">+</span>
                </summary>
                <p>{item.answer}</p>
              </details>
            ))}
          </div>
        </section>
        <section className="codoc-final codoc-container">
          <span className="codoc-final-mark" aria-hidden="true">
            ✳
          </span>
          <p className="codoc-eyebrow">{__tr('Следующий документ начинается здесь')}</p>
          <h2>{__tr('Оставьте рутину шаблону.')}</h2>
          <p>{__tr('А себе — время на то, что действительно важно.')}</p>
          <Link className="codoc-button codoc-primary" to={startHref} onClick={cta('footer')}>
            {__tr('Создать шаблон ↗')}
          </Link>
        </section>
      </main>
      <footer className="codoc-footer codoc-container">
        <Link className="codoc-brand" to="/">
          CoDoc.
        </Link>
        <span>{__tr('Редактор шаблонов и генератор PDF онлайн')}</span>
        <nav className="codoc-footer-pages" aria-label={__tr('Возможности CoDoc')}>
          <Link to="/solutions/">{__tr('Ready-to-use services')}</Link>
          <Link to="/website-builder/">{__tr('Website builder')}</Link>
          {SEARCH_PAGES.map((page) => (
            <Link key={page.path} to={page.path}>
              {page.label}
            </Link>
          ))}
        </nav>
        <FeedbackWidget surface="landing" />
        <a href="#main-content">{__tr('Наверх ↑')}</a>
        <small>© {new Date().getFullYear()} CoDoc</small>
      </footer>
    </div>
  );
}
