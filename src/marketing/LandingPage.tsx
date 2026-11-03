import { Link } from 'react-router-dom';
import { useStore } from '@/shared/store/store';
import { authStore } from '@/auth/store';
import { reachGoal } from '@/shared/analytics/metrika';
import { USE_CASES, FEATURES, FAQ } from './content';
import './landing.css';
import { FeedbackWidget } from '@/features/feedback/ui/FeedbackWidget';
import { SEARCH_PAGES } from './searchPages';

export function LandingPage() {
  const user = useStore(authStore, (s) => s.user);
  const offline = useStore(authStore, (s) => s.offline);
  const startHref = offline
    ? '/app/editor/local'
    : user
      ? '/app/templates/new'
      : '/register?next=%2Fapp%2Ftemplates%2Fnew';
  const cta = (placement: string) => () => reachGoal('start_template', { placement });
  return (
    <div className="codoc-landing">
      <a className="codoc-skip" href="#main-content">
        К содержимому
      </a>
      <header className="codoc-header codoc-container">
        <Link className="codoc-brand" to="/" aria-label="CoDoc — главная">
          <span aria-hidden="true">co</span>CoDoc.
        </Link>
        <nav aria-label="Основная навигация">
          <a href="#possibilities">Возможности</a>
          <a href="#stamps">Штампы и печати</a>
          <a href="#workflow">Как это работает</a>
          <a href="#questions">Вопросы</a>
        </nav>
        <Link className="codoc-button codoc-button-small" to={user || offline ? '/app' : '/login'}>
          {user || offline ? 'Мои документы' : 'Войти'} ↗
        </Link>
      </header>
      <main id="main-content">
        <section className="codoc-hero codoc-container">
          <div className="codoc-hero-copy">
            <p className="codoc-eyebrow">● Меньше рутины. Больше вашего дела.</p>
            <h1>
              Документы разные.
              <br />
              Шаблон — <em>один.</em>
            </h1>
            <p className="codoc-lead">
              Создавайте билеты, сертификаты, штампы и печати онлайн. Соберите макет, подставьте
              данные и получите готовые PDF — без ручной правки каждого файла.
            </p>
            <div className="codoc-actions">
              <Link className="codoc-button codoc-primary" to={startHref} onClick={cta('hero')}>
                Создать свой шаблон ↗
              </Link>
              <a className="codoc-text-link" href="#workflow">
                Как это работает ↓
              </a>
            </div>
            <p className="codoc-micro">Визуальный редактор · Свои данные · PDF и SVG</p>
          </div>
          <div className="codoc-hero-art">
            <img
              src={`${import.meta.env.BASE_URL}images/document-studio.webp`}
              width="1536"
              height="1024"
              alt="Примеры оформления: сертификат, билет и деловой документ в едином стиле"
            />
            <div className="codoc-art-label">
              <span aria-hidden="true">✓</span>
              <div>
                <strong>Ваш стиль. Любые данные.</strong>
                <small>Один макет для всей серии</small>
              </div>
            </div>
            <span className="codoc-art-note">Сначала дизайн. Потом — без рутины.</span>
          </div>
        </section>
        <div className="codoc-proof codoc-container">
          <span>От идеи до готового файла</span>
          <strong>Визуальный редактор</strong>
          <i aria-hidden="true">✳</i>
          <strong>Персонализация</strong>
          <i aria-hidden="true">✳</i>
          <strong>Пакетная генерация</strong>
          <i aria-hidden="true">✳</i>
          <strong>PDF / PDF/A / SVG</strong>
        </div>
        <section className="codoc-section codoc-container" id="possibilities">
          <div className="codoc-section-heading">
            <div>
              <p className="codoc-eyebrow">Один инструмент — много задач</p>
              <h2>Что создадим сегодня?</h2>
            </div>
            <p>
              От одного документа до целой серии.
              <br />
              Оформление остаётся вашим.
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
                  Создать свой макет ↗
                </Link>
              </article>
            ))}
          </div>
          <p className="codoc-caption">
            Примеры оформления. Соберите собственный макет в редакторе.
          </p>
        </section>
        <section className="codoc-section codoc-container codoc-stamps" id="stamps">
          <div>
            <p className="codoc-eyebrow">Свой оттиск — внутри вашего документа</p>
            <h2>
              Штампы и печати.
              <br />
              От надписи до собственного макета.
            </h2>
            <p className="codoc-lead">
              Выберите штамп из библиотеки или соберите свой: рамки, текст по дуге, изображения и
              цвет. Разместите его на бланке, билете или сертификате.
            </p>
            <ul>
              <li>Круглые и прямоугольные композиции, прямой текст и надписи по дуге.</li>
              <li>Редактирование слоёв, изображений, шрифтов и оформления.</li>
              <li>
                Сохранение собственного штампа в библиотеку браузера для повторного использования.
              </li>
              <li>Экспорт документа со штампом в PDF и SVG.</li>
            </ul>
            <div className="codoc-actions">
              <Link className="codoc-button codoc-primary" to={startHref} onClick={cta('stamps')}>
                Создать макет со штампом ↗
              </Link>
              <Link className="codoc-text-link" to="/stamps/">
                Подробнее о конструкторе →
              </Link>
            </div>
          </div>
          <div className="codoc-stamp-examples" aria-label="Примеры оформления штампов">
            <div className="codoc-stamp-round">
              <span>ВАШ ТЕКСТ · ВАШ ДИЗАЙН</span>
              <strong>CoDoc</strong>
              <span>МАКЕТ ПЕЧАТИ</span>
            </div>
            <div className="codoc-stamp-rect">
              <strong>СОГЛАСОВАНО</strong>
              <span>Дата __________</span>
            </div>
            <p className="codoc-caption">
              Иллюстрации оформления. Текст и композицию вы настраиваете в редакторе.
            </p>
          </div>
        </section>
        <section className="codoc-workflow" id="workflow">
          <div className="codoc-container">
            <div className="codoc-section-heading">
              <div>
                <p className="codoc-eyebrow">Понятный путь к результату</p>
                <h2>
                  Настройте один раз.
                  <br />
                  <em>Используйте снова и снова.</em>
                </h2>
              </div>
              <p>
                Начните с макета. Добавьте поля,
                <br />
                когда будете готовы к персонализации.
              </p>
            </div>
            <ol className="codoc-steps">
              <li>
                <span>01 / Макет</span>
                <h3>Соберите шаблон</h3>
                <p>
                  Добавьте текст, изображения, таблицы и QR-код. Настройте размер страницы и
                  расположение элементов.
                </p>
              </li>
              <li>
                <span>02 / Данные</span>
                <h3>Добавьте переменные</h3>
                <p>
                  Опишите поля — имя, дату, номер — и свяжите их с макетом. Заполните значения или
                  импортируйте JSON.
                </p>
              </li>
              <li>
                <span>03 / Результат</span>
                <h3>Получите документы</h3>
                <p>
                  Выберите шаблон и наборы данных. Скачайте PDF, архивный PDF/A или SVG, а серию
                  файлов — в ZIP.
                </p>
              </li>
            </ol>
            <div className="codoc-series">
              <img
                src={`${import.meta.env.BASE_URL}images/template-series.webp`}
                width="1200"
                height="800"
                loading="lazy"
                alt="Один шаблон и персональные данные превращаются в серию сертификатов"
              />
              <div>
                <strong>Один дизайн. Целая серия.</strong>
                <p>
                  Имена, даты и номера меняются.
                  <br />
                  Оформление остаётся единым.
                </p>
                <Link
                  className="codoc-button codoc-primary"
                  to={startHref}
                  onClick={cta('workflow')}
                >
                  Начать с первого шаблона ↗
                </Link>
              </div>
            </div>
          </div>
        </section>
        <section className="codoc-section codoc-container">
          <div className="codoc-section-heading">
            <div>
              <p className="codoc-eyebrow">Детали, которые работают на вас</p>
              <h2>
                Красиво на экране.
                <br />
                Готово к отправке.
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
        <section className="codoc-faq codoc-container" id="questions">
          <div>
            <p className="codoc-eyebrow">Разберёмся вместе</p>
            <h2>
              Перед первым
              <br />
              шаблоном.
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
          <p className="codoc-eyebrow">Следующий документ начинается здесь</p>
          <h2>Оставьте рутину шаблону.</h2>
          <p>А себе — время на то, что действительно важно.</p>
          <Link className="codoc-button codoc-primary" to={startHref} onClick={cta('footer')}>
            Создать шаблон ↗
          </Link>
        </section>
      </main>
      <footer className="codoc-footer codoc-container">
        <Link className="codoc-brand" to="/">
          CoDoc.
        </Link>
        <span>Редактор шаблонов и генератор PDF онлайн</span>
        <nav className="codoc-footer-pages" aria-label="Возможности CoDoc">
          {SEARCH_PAGES.map((page) => (
            <Link key={page.path} to={page.path}>
              {page.label}
            </Link>
          ))}
        </nav>
        <FeedbackWidget surface="landing" />
        <a href="#main-content">Наверх ↑</a>
        <small>© {new Date().getFullYear()} CoDoc</small>
      </footer>
    </div>
  );
}
