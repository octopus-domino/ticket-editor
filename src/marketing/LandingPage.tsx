import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useStore } from '@/shared/store/store';
import { authStore } from '@/auth/store';
import './landing.css';

/* ============================================================
   SVG-штампы (визуальная библиотека)
   ============================================================ */

const StampOrg = () => (
  <svg viewBox="0 0 120 120" width="100%" height="100%" aria-hidden>
    <circle cx="60" cy="60" r="55" fill="none" stroke="#0a2540" strokeWidth="2" />
    <circle cx="60" cy="60" r="42" fill="none" stroke="#0a2540" strokeWidth="1" />
    <defs>
      <path id="stamp-arc-top" d="M 15 60 A 45 45 0 0 1 105 60" fill="none" />
      <path id="stamp-arc-bot" d="M 105 60 A 45 45 0 0 1 15 60" fill="none" />
    </defs>
    <text fontSize="8" fill="#0a2540" fontWeight="bold" fontFamily="Arial">
      <textPath href="#stamp-arc-top" startOffset="50%" textAnchor="middle">ООО «РОМАШКА»</textPath>
    </text>
    <text fontSize="6" fill="#0a2540" fontFamily="Arial">
      <textPath href="#stamp-arc-bot" startOffset="50%" textAnchor="middle">ОГРН 1234567890123</textPath>
    </text>
    <text x="60" y="57" textAnchor="middle" fontSize="11" fill="#0a2540" fontWeight="bold" fontFamily="Arial">МОСКВА</text>
    <text x="60" y="70" textAnchor="middle" fontSize="6" fill="#374151" fontFamily="Arial">ИНН 7701234567</text>
    <text x="60" y="80" textAnchor="middle" fontSize="5" fill="#374151" fontFamily="Arial">КПП 770101001</text>
  </svg>
);

const StampPaid = () => (
  <svg viewBox="0 0 200 70" width="100%" height="100%" aria-hidden>
    <rect x="2" y="2" width="196" height="66" rx="4" fill="#dcfce7" stroke="#15803d" strokeWidth="3" />
    <rect x="8" y="8" width="184" height="54" rx="2" fill="none" stroke="#15803d" strokeWidth="1" strokeDasharray="3,3" />
    <text x="100" y="38" textAnchor="middle" fontSize="22" fontWeight="bold" fill="#15803d" fontFamily="Arial">ОПЛАЧЕНО</text>
    <text x="100" y="54" textAnchor="middle" fontSize="7" fill="#15803d" fontFamily="Arial">«____» ____________ 20___ г.</text>
  </svg>
);

const StampVerified = () => (
  <svg viewBox="0 0 200 70" width="100%" height="100%" aria-hidden>
    <rect x="2" y="2" width="196" height="66" rx="4" fill="#fff" stroke="#1e40af" strokeWidth="2" />
    <rect x="4" y="4" width="192" height="26" rx="2" fill="#1e40af" />
    <text x="100" y="22" textAnchor="middle" fontSize="13" fontWeight="bold" fill="#fff" fontFamily="Arial">ПРОВЕРЕНО</text>
    <text x="100" y="46" textAnchor="middle" fontSize="8" fill="#0a2540" fontFamily="Arial">Дата: «___» _______ 20___</text>
    <text x="100" y="60" textAnchor="middle" fontSize="8" fill="#374151" fontFamily="Arial">Подпись: ____________</text>
  </svg>
);

const StampTriangle = () => (
  <svg viewBox="0 0 140 120" width="100%" height="100%" aria-hidden>
    <polygon points="70,4 136,116 4,116" fill="none" stroke="#0a2540" strokeWidth="2" strokeLinejoin="round" />
    <text x="70" y="72" textAnchor="middle" fontSize="6.5" fill="#0a2540" fontFamily="Arial">ГОРОДСКАЯ</text>
    <text x="70" y="81" textAnchor="middle" fontSize="6.5" fill="#0a2540" fontFamily="Arial">ПОЛИКЛИНИКА</text>
    <text x="70" y="97" textAnchor="middle" fontSize="9" fontWeight="bold" fill="#0a2540" fontFamily="Arial">ДЛЯ СПРАВОК</text>
  </svg>
);

const StampCertified = () => (
  <svg viewBox="0 0 200 80" width="100%" height="100%" aria-hidden>
    <rect x="2" y="2" width="196" height="76" rx="4" fill="#fff" stroke="#0a2540" strokeWidth="2" />
    <rect x="8" y="8" width="184" height="64" rx="3" fill="none" stroke="#0a2540" strokeWidth="1" strokeDasharray="3,3" />
    <text x="100" y="32" textAnchor="middle" fontSize="17" fontWeight="bold" fill="#0a2540" fontFamily="Arial">КОПИЯ ВЕРНА</text>
    <text x="20" y="52" fontSize="7" fill="#374151" fontFamily="Arial">Генеральный директор</text>
    <text x="20" y="64" fontSize="7" fill="#0a2540" fontFamily="Arial">____________ / И.И. Иванов</text>
  </svg>
);

const StampEntry = () => (
  <svg viewBox="0 0 200 70" width="100%" height="100%" aria-hidden>
    <rect x="2" y="2" width="196" height="66" rx="4" fill="#fff" stroke="#1e40af" strokeWidth="2" />
    <text x="100" y="24" textAnchor="middle" fontSize="14" fontWeight="bold" fill="#1e40af" fontFamily="Arial">ВХОДЯЩИЙ</text>
    <text x="100" y="42" textAnchor="middle" fontSize="9" fill="#0a2540" fontFamily="Arial">№ _________</text>
    <text x="100" y="56" textAnchor="middle" fontSize="7" fill="#374151" fontFamily="Arial">«___» _______ 20___</text>
  </svg>
);

/* ============================================================
   CSS-мокапы документов
   ============================================================ */

const MockTicket = () => (
  <div className="mock-ticket">
    <div className="mock-ticket__left">
      <div className="brand">ЯНДЕКС</div>
      <div>
        <div className="date">15</div>
        <div className="month">марта, сб · 19:00</div>
      </div>
    </div>
    <div className="mock-ticket__right">
      <div className="title">ГАМЛЕТ</div>
      <div className="sub">Трагедия в пяти действиях</div>
      <div className="row">
        <span><b>Партер</b><i>сектор</i></span>
        <span><b>12</b><i>ряд</i></span>
        <span><b>8</b><i>место</i></span>
      </div>
      <div className="barcode">
        {Array.from({ length: 40 }).map((_, i) => (
          <span key={i} style={{ height: `${10 + ((i * 7) % 10)}px` }} />
        ))}
      </div>
    </div>
  </div>
);

const MockCatalog = () => (
  <div className="mock-catalog">
    {Array.from({ length: 6 }).map((_, i) => (
      <div key={i} className="mock-catalog__card">
        <div className="mock-catalog__img">
          <span className="mock-catalog__badge">-25%</span>
        </div>
        <div className="mock-catalog__name">Товар {i + 1}</div>
        <div className="mock-catalog__price">99 ₽</div>
      </div>
    ))}
  </div>
);

const MockCard = () => (
  <div className="mock-card">
    <div>
      <div className="mock-card__brand">
        fintech.io
        <small>финансовые технологии</small>
      </div>
    </div>
    <div className="mock-card__info">
      <b>Алексей Кузнецов</b>
      <span>CTO · +7 (495) 000-00-00</span>
      <span>a.kuznetsov@fintech.io</span>
    </div>
  </div>
);

const MockContract = () => (
  <div className="mock-doc">
    <div className="mock-doc__head">ДОГОВОР НАЙМА</div>
    <div className="mock-doc__line mock-doc__line--short" />
    <div className="mock-doc__line" />
    <div className="mock-doc__line mock-doc__line--mid" />
    <div className="mock-doc__line" />
    <div className="mock-doc__line mock-doc__line--short" />
    <div className="mock-doc__line" />
    <div className="mock-doc__line mock-doc__line--mid" />
    <div className="mock-doc__sign">
      <span>Наймодатель</span>
      <span>Наниматель</span>
    </div>
  </div>
);

const MockCert = () => (
  <div className="mock-cert">
    <div className="mock-cert__label">ПОЧЁТНАЯ ГРАМОТА</div>
    <div className="mock-cert__title">ГРАМОТА</div>
    <div className="mock-cert__name">Иванов Иван Иванович</div>
    <div className="mock-cert__line">за выдающиеся успехи</div>
    <div className="mock-cert__seal" />
  </div>
);

const MockPoster = () => (
  <div className="mock-poster">
    <div className="mock-poster__label">ПРЕМЬЕРА · 2026</div>
    <div className="mock-poster__title">
      НОЧЬ<br />
      <em>ОТКРЫТЫХ</em><br />
      ДВЕРЕЙ
    </div>
    <div className="mock-poster__foot">Москва · 15 марта · 19:00</div>
  </div>
);

const MockQr = () => (
  <div className="mock-qr">
    <div className="mock-qr__code">
      {Array.from({ length: 64 }).map((_, i) => {
        const row = Math.floor(i / 8);
        const col = i % 8;
        const isCorner =
          (row < 2 && col < 2) ||
          (row < 2 && col > 5) ||
          (row > 5 && col < 2);
        const isDark = isCorner || ((i * 7919 + 31) % 3 === 0);
        return <span key={i} style={{ background: isDark ? '#0f172a' : 'transparent' }} />;
      })}
    </div>
    <div className="mock-qr__label">QR · 2026</div>
  </div>
);

/* ============================================================
   ВАЖНО: MockPaidSmall объявлен ДО CREATE_ITEMS — иначе TDZ
   ============================================================ */

const MockPaidSmall = () => (
  <div
    style={{
      padding: '10% 4%',
      width: '100%',
      height: '100%',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
    }}
  >
    <div style={{ width: '85%' }}>
      <StampPaid />
    </div>
  </div>
);

/* ============================================================
   Данные секций
   ============================================================ */

const CREATE_ITEMS = [
  { name: 'Билеты и пропуска', desc: 'Театр, концерт, событие. Со штрих-кодом и QR.', mock: <MockTicket /> },
  { name: 'Каталоги и прайсы', desc: 'Сетка 3×3, карточки товаров, скидки.', mock: <MockCatalog /> },
  { name: 'Печати и штампы', desc: 'ОПЛАЧЕНО, ПРИНЯТО, КОПИЯ ВЕРНА.', mock: <MockPaidSmall /> },
  { name: 'Бизнес-карточки', desc: 'Визитки, пропуска, бейджи.', mock: <MockCard /> },
  { name: 'Договоры и заявления', desc: 'С реквизитами, подписями, полями.', mock: <MockContract /> },
  { name: 'Грамоты и дипломы', desc: 'Печатная продукция с золотом.', mock: <MockCert /> },
  { name: 'Плакаты и флаеры', desc: 'Афиши, постеры, листовки.', mock: <MockPoster /> },
  { name: 'QR и штрих-коды', desc: 'QR, Data Matrix, Aztec, PDF417.', mock: <MockQr /> },
];

const STAMPS = [
  { name: 'Печать организации', desc: 'Круглая, с дуговым текстом', svg: <StampOrg /> },
  { name: 'ОПЛАЧЕНО', desc: 'Зелёная плашка, дата', svg: <StampPaid /> },
  { name: 'ПРОВЕРЕНО', desc: 'Синяя шапка, подпись', svg: <StampVerified /> },
  { name: 'Для справок', desc: 'Треугольный медицинский', svg: <StampTriangle /> },
  { name: 'КОПИЯ ВЕРНА', desc: 'С реквизитами директора', svg: <StampCertified /> },
  { name: 'ВХОДЯЩИЙ', desc: 'Регистрация корреспонденции', svg: <StampEntry /> },
];

const FEATURES = [
  { icon: '🎨', title: 'Холст на Konva', desc: 'Drag & drop, слои, группы, точные координаты. 60 fps.' },
  { icon: '📝', title: 'Rich-text TipTap', desc: 'Заголовки, списки, ссылки, жирный/курсив. Markdown-совместимый HTML.' },
  { icon: '▦', title: 'Таблицы', desc: 'Per-side границы, colspan/rowspan, вложенные списки внутри ячеек.' },
  { icon: '✂', title: 'Pathfinder', desc: 'Union, subtract, intersect, xor. Через polyclip.' },
  { icon: '📊', title: 'Графики', desc: 'Bar и Donut. Данные из JSON-модели, живое обновление.' },
  { icon: '◯', title: 'Дуговой текст', desc: 'По окружности и эллипсу. С настройкой радиуса, span, направления.' },
  { icon: '🔳', title: 'QR всех форматов', desc: 'QR, Data Matrix, Aztec, PDF417. Цвета, ECC, margin.' },
  { icon: '🖼', title: 'draw.io внутри', desc: 'Embed-редактор диаграмм. SVG встраивается в документ.' },
  { icon: '📐', title: 'Точность', desc: 'Пиксели, миллиметры, A4/A5/Letter/свой. Сетка, снапы, направляющие.' },
];

const PRINT_FEATURES = [
  { icon: '📄', title: 'PDF/A-2b', desc: 'Архивный формат. OutputIntent sRGB, XMP-метаданные. Для юристов и госов.' },
  { icon: '🎨', title: 'SVG', desc: 'Вектор для типографии. Открывается в Illustrator, InDesign, Figma.' },
  { icon: '⚡', title: 'PDF', desc: 'Быстрый для отправки. 340 мс на страницу.' },
  { icon: 'Aa', title: 'Шрифты вшиты', desc: 'TTF/OTF внутри PDF. Кириллица из коробки — DejaVu.' },
  { icon: '🖼', title: 'Картинки встроены', desc: 'URL → data URL. Без внешних зависимостей в готовом файле.' },
  { icon: '📏', title: 'Поля и отступы', desc: 'Print margins, bleed, safe area. Ничего не обрежется.' },
];

const TEMPLATES = [
  { name: 'Билет в театр', desc: '900×340 · ГАМЛЕТ', mock: <MockTicket /> },
  { name: 'Билет Яндекс.Афиши', desc: '700×500 · RADIO TAPOK', mock: <MockPoster /> },
  { name: 'Каталог «Магнит»', desc: 'A4 · сетка 3×3', mock: <MockCatalog /> },
  { name: 'Договор найма', desc: 'A4 · 4 раздела', mock: <MockContract /> },
  { name: 'Заявление физлица', desc: 'A4 · шапка + подпись', mock: <MockContract /> },
  { name: 'Бланк заказа', desc: 'A4 · таблица позиций', mock: <MockCatalog /> },
];

const DATA_FEATURES = [
  { title: 'Схемы', desc: 'Опишите, какие поля нужны. Переиспользуйте между шаблонами.' },
  { title: 'Модели данных', desc: 'Конкретные значения для схемы. Импорт JSON, autosave, undo.' },
  { title: 'Батч-генерация', desc: 'Один шаблон × N моделей → N PDF. Async, прогресс, отчёт.' },
  { title: 'API', desc: 'POST /api/generate. JSON на входе, ZIP на выходе. Idempotency-key.' },
];

const FAQ = [
  {
    q: 'Штампы поддерживаются?',
    a: 'Да. Встроенная библиотека: круглые печати организации, банковские (ОПЛАЧЕНО, ПРИНЯТО, КОПИЯ ВЕРНА), угловые штампы, треугольные медицинские, с QR и эмблемой. Редактируются — текст, цвета, дуговой текст, заливка.',
  },
  {
    q: 'Это только для документов?',
    a: 'Нет. Печатные материалы: билеты, каталоги, визитки, пропуска, грамоты, афиши, плакаты, флаеры. Всё, что верстается в макет и печатается.',
  },
  {
    q: 'Готово к типографии?',
    a: 'Да. PDF/A-2b с OutputIntent sRGB — стандарт для архива и типографии. SVG — вектор, откроется в Illustrator. Шрифты и картинки вшиты, ничего не «потеряется» при печати.',
  },
  {
    q: 'Есть self-hosted?',
    a: 'Да. Enterprise. Один Docker-контейнер. Опросник при первом запуске: откуда брать данные — 1С, Битрикс24, JSON. Работает в закрытом контуре. Offline-лицензия с привязкой к железу.',
  },
  {
    q: 'Куда уходят данные?',
    a: 'SaaS — в ваш аккаунт. AI-шаблоны работают на локальных open-source моделях, не через OpenAI. Self-hosted — никуда не уходят.',
  },
  {
    q: 'Как подключить 1С?',
    a: 'Двумя способами. 1С после проведения документа шлёт POST на /api/generate — просто. Или мы сами забираем данные из HTTP-сервиса 1С по OData. Закрытый периметр — on-premise агент внутри сети.',
  },
  {
    q: 'Свои шрифты можно?',
    a: 'Да. Загружаете TTF/OTF — встраиваются в PDF/A. DejaVu-совместимые уже включены, кириллица работает из коробки.',
  },
  {
    q: 'Почему не Puppeteer / wkhtmltopdf?',
    a: 'Chrome жрёт 500 МБ RAM, кириллица ломается, шрифты не подхватываются. Шаблоны нельзя редактировать — только код. Мы делаем иначе: Batik + PDFBox. 340 мс на страницу, кириллица из коробки, настоящий PDF/A-2b.',
  },
  {
    q: 'Сколько стоит?',
    a: 'Starter — 100 документов в месяц, бесплатно, без карты. Pro — 4 900 ₽/мес, 10 000 документов. Enterprise — self-hosted, SSO, SLA. Уйти с Pro на Starter — данные остаются.',
  },
];

/* ============================================================
   Страница
   ============================================================ */

export const LandingPage: React.FC = () => {
  const user = useStore(authStore, (s) => s.user);
  const offline = useStore(authStore, (s) => s.offline);
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const enterHref = offline ? '/app/editor/local' : '/app';
  const startHref = user || offline ? enterHref : '/register';

  const scrollTo = (id: string) => (e: React.MouseEvent) => {
    const el = document.getElementById(id);
    if (!el) return;
    e.preventDefault();
    el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  useEffect(() => {
    const hash = window.location.hash.slice(1);
    if (!hash) return;
    const el = document.getElementById(hash);
    if (el) setTimeout(() => el.scrollIntoView({ block: 'start' }), 50);
  }, []);

  return (
    <div className="lp-root">
      <nav className="lp-nav">
        <div className="lp-nav-inner">
          <Link to="/" className="lp-logo">
            <span className="lp-logo-mark">T</span>
            ticket-editor
          </Link>
          <div className="lp-nav-links">
            <a href="#create" onClick={scrollTo('create')}>Что создать</a>
            <a href="#stamps" onClick={scrollTo('stamps')}>Штампы</a>
            <a href="#features" onClick={scrollTo('features')}>Возможности</a>
            <a href="#print" onClick={scrollTo('print')}>Печать</a>
            <a href="#templates" onClick={scrollTo('templates')}>Шаблоны</a>
            <a href="#pricing" onClick={scrollTo('pricing')}>Цены</a>
          </div>
          <div className="lp-nav-actions">
            {user || offline ? (
              <Link to={enterHref} className="lp-btn lp-btn-ghost">Открыть приложение</Link>
            ) : (
              <Link to="/login" className="lp-btn lp-btn-ghost">Войти</Link>
            )}
            <Link to={startHref} className="lp-btn lp-btn-primary">
              {user || offline ? 'В приложение' : 'Начать'}
            </Link>
          </div>
        </div>
      </nav>

      <header className="lp-hero">
        <div className="lp-container">
          <div className="lp-hero-grid">
            <div>
              <div className="lp-hero-eyebrow">
                <span className="lp-dot" />
                v11 · продакшен
              </div>
              <h1>
                Всё для печатных материалов.<br />
                <em>В одном редакторе.</em>
              </h1>
              <p className="lp-hero-sub">
                Билеты, каталоги, договоры, грамоты, афиши, штампы и QR-коды.
                <strong> Редактор + библиотека + API генерации.</strong> PDF/A на выходе.
              </p>
              <div className="lp-hero-ctas">
                <Link to={startHref} className="lp-btn lp-btn-accent lp-btn-xl">
                  {user || offline ? 'Открыть →' : 'Попробовать →'}
                </Link>
                <a href="#create" onClick={scrollTo('create')} className="lp-btn lp-btn-ghost lp-btn-xl">
                  Что можно создать
                </a>
              </div>
              <div className="lp-hero-meta">
                <span><span className="lp-check">✓</span> 100 документов бесплатно</span>
                <span><span className="lp-check">✓</span> Без карты</span>
                <span><span className="lp-check">✓</span> PDF/A-2b для типографии</span>
              </div>
            </div>

            <div className="lp-hero-visual">
              <div className="lp-editor-chrome">
                <div className="lp-dots">
                  <div className="lp-dot-btn" />
                  <div className="lp-dot-btn" />
                  <div className="lp-dot-btn" />
                </div>
                <div className="lp-editor-url">app.ticket-editor / templates / invoice-v3</div>
              </div>
              <div className="lp-editor-body">
                <div className="lp-editor-toolbar-mock">
                  <div className="lp-tool-btn active">T</div>
                  <div className="lp-tool-btn">▭</div>
                  <div className="lp-tool-btn">◯</div>
                  <div className="lp-tool-btn">╱</div>
                  <div className="lp-tool-btn">▦</div>
                  <div className="lp-tool-btn">⌘</div>
                </div>
                <div className="lp-template-canvas">
                  <div className="lp-tpl-line bold short" />
                  <div className="lp-tpl-line mid" />
                  <div className="lp-tpl-line short" />
                  <div className="lp-hero-stamp">
                    <StampPaid />
                  </div>
                  <div className="lp-tpl-table">
                    <div className="lp-tpl-table-row head">
                      <div>Позиция</div>
                      <div>Кол-во</div>
                      <div>Сумма</div>
                    </div>
                    <div className="lp-tpl-table-row">
                      <div>{'{{item.name}}'}</div>
                      <div>{'{{item.qty}}'}</div>
                      <div>{'{{item.price}}'}</div>
                    </div>
                    <div className="lp-tpl-table-row">
                      <div>Итого</div>
                      <div />
                      <div>{'{{total}}'}</div>
                    </div>
                  </div>
                </div>
                <div className="lp-tpl-float">⚡ PDF/A за 340 мс</div>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="lp-trust">
        <div className="lp-container">
          <div className="lp-trust-label">В продакшене</div>
          <div className="lp-trust-logos">
            <span className="lp-trust-logo">ROMAШКА</span>
            <span className="lp-trust-logo">fintech.io</span>
            <span className="lp-trust-logo">LogiTrans</span>
            <span className="lp-trust-logo">MAGNIT</span>
            <span className="lp-trust-logo">Estate.CRM</span>
          </div>
        </div>
      </div>

      {/* ============ ЧТО МОЖНО СОЗДАТЬ ============ */}
      <section className="lp-section lp-create" id="create">
        <div className="lp-container">
          <div className="lp-section-head">
            <div className="lp-section-label">Что можно создать</div>
            <h2>Не только билеты.</h2>
            <p>
              Хотя и билеты тоже. И ещё семь типов печатных материалов —
              из коробки, без плагинов.
            </p>
          </div>
          <div className="lp-create-grid">
            {CREATE_ITEMS.map((item) => (
              <div key={item.name} className="lp-create-card">
                <div className="lp-create-visual">{item.mock}</div>
                <div className="lp-create-name">{item.name}</div>
                <div className="lp-create-desc">{item.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ============ ШТАМПЫ ============ */}
      <section className="lp-section lp-stamps-section" id="stamps">
        <div className="lp-container">
          <div className="lp-section-head">
            <div className="lp-section-label">Библиотека штампов</div>
            <h2>Печати, которые выглядят как печати.</h2>
            <p>
              Круглые, прямоугольные, треугольные, угловые. С дуговым текстом,
              заливкой, датой и подписью. Банковские, медицинские, корпоративные —
              готовы к использованию.
            </p>
          </div>
          <div className="lp-stamps-grid">
            {STAMPS.map((s) => (
              <div key={s.name} className="lp-stamp-card">
                <div className="lp-stamp-visual">{s.svg}</div>
                <div className="lp-stamp-name">{s.name}</div>
                <div className="lp-stamp-desc">{s.desc}</div>
              </div>
            ))}
          </div>
          <div className="lp-stamps-more">
            Ещё: с логотипом, с QR, овальные, двойное кольцо, с пересечением зон заливки.
            Все редактируются — цвета, шрифты, размеры.
          </div>
        </div>
      </section>

      {/* ============ РЕДАКТОР ============ */}
      <section className="lp-section" id="features">
        <div className="lp-container">
          <div className="lp-section-head">
            <div className="lp-section-label">Возможности</div>
            <h2>Холст. Текст. Штампы. Данные.</h2>
            <p>Всё, что нужно для печатного документа. Ничего, что мешает.</p>
          </div>
          <div className="lp-features-grid">
            {FEATURES.map((f) => (
              <div key={f.title} className="lp-feature">
                <div className="lp-feature-icon">{f.icon}</div>
                <h3>{f.title}</h3>
                <p>{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ============ ПЕЧАТЬ ============ */}
      <section className="lp-section lp-print-section" id="print">
        <div className="lp-container">
          <div className="lp-section-head">
            <div className="lp-section-label">Готово к печати</div>
            <h2>Настоящий PDF/A. Не «PDF с расширением».</h2>
            <p>
              OutputIntent sRGB. XMP-метаданные. Шрифты и картинки вшиты.
              PDF/A-2b — для архива и типографии. SVG — для дизайнера.
            </p>
          </div>
          <div className="lp-print-grid">
            {PRINT_FEATURES.map((f) => (
              <div key={f.title} className="lp-print-item">
                <div className="lp-print-icon">{f.icon}</div>
                <div>
                  <h3>{f.title}</h3>
                  <p>{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ============ ШАБЛОНЫ ============ */}
      <section className="lp-section lp-templates-section" id="templates">
        <div className="lp-container">
          <div className="lp-section-head">
            <div className="lp-section-label">Шаблоны</div>
            <h2>Не с пустого листа.</h2>
            <p>
              Шесть готовых бандлов: билет в театр, билет Яндекс.Афиши,
              каталог «Магнит», договор найма, заявление, бланк заказа.
              Берите — и меняйте под себя.
            </p>
          </div>
          <div className="lp-templates-grid">
            {TEMPLATES.map((t) => (
              <div key={t.name} className="lp-template-card">
                <div className="lp-template-visual">{t.mock}</div>
                <div className="lp-template-meta">
                  <div className="lp-template-name">{t.name}</div>
                  <div className="lp-template-desc">{t.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ============ ДАННЫЕ И API ============ */}
      <section className="lp-section" id="data">
        <div className="lp-container">
          <div className="lp-section-head">
            <div className="lp-section-label">Данные и API</div>
            <h2>Один шаблон × N моделей = N документов.</h2>
            <p>Схемы, модели, батч-генерация. JSON на входе, ZIP на выходе.</p>
          </div>
          <div className="lp-data-grid">
            {DATA_FEATURES.map((d) => (
              <div key={d.title} className="lp-data-card">
                <h3>{d.title}</h3>
                <p>{d.desc}</p>
              </div>
            ))}
          </div>
          <div className="lp-code-window" style={{ marginTop: 40 }}>
            <div className="lp-code-head">
              <div className="lp-dots">
                <div className="lp-dot-btn" />
                <div className="lp-dot-btn" />
                <div className="lp-dot-btn" />
              </div>
              <span className="lp-code-tab active">POST /api/generate/sync</span>
            </div>
<pre className="lp-code">{`{
  "templateId": "t-1",
  "items": [
    { "dataModelId": "m-ivanov" },
    { "dataModelId": "m-petrov" }
  ],
  "format": "pdfa",
  "packAs": "zip"
}

# → application/zip
# → X-Generation-Count: 2`}</pre>
          </div>
        </div>
      </section>

      {/* ============ AI ============ */}
      <section className="lp-section" id="ai">
        <div className="lp-container">
          <div className="lp-ai-section">
            <div>
              <h2>Опишите. <em>Или дайте фото.</em></h2>
              <p>
                Не рисуйте макет руками. <strong>Опишите словами</strong> —
                «грамота с золотой рамкой» — или <strong>дайте скан</strong> готового
                документа. Получите черновик с полями.
              </p>
              <ul className="lp-ai-bullets">
                <li><span className="lp-check">✓</span> Open-source модели (Docling, dots.ocr) — <strong>без платных API</strong></li>
                <li><span className="lp-check">✓</span> Скан → разметка: шапка, таблица, реквизиты</li>
                <li><span className="lp-check">✓</span> Доработка — 2–3 минуты</li>
                <li><span className="lp-check">✓</span> Локально. Данные не уходят</li>
              </ul>
            </div>
            <div className="lp-ai-mock">
              <div className="lp-ai-mock-head">
                <div className="lp-dots">
                  <div className="lp-dot-btn" />
                  <div className="lp-dot-btn" />
                  <div className="lp-dot-btn" />
                </div>
                <span>template-generator · local model</span>
              </div>
              <div className="lp-ai-mock-body">
                <div className="lp-ai-input">
                  &gt; Грамота: золотая рамка, крупный «ГРАМОТА», имя, печать
                </div>
                <div className="lp-ai-arrow">↓</div>
                <div className="lp-ai-output">
                  <div className="lp-ai-output-row"><span className="lp-field">frame.border</span><span className="lp-type">rect · gold</span></div>
                  <div className="lp-ai-output-row"><span className="lp-field">title</span><span className="lp-type">text · 16px · bold</span></div>
                  <div className="lp-ai-output-row"><span className="lp-field">recipient.name</span><span className="lp-type">text · 12px</span></div>
                  <div className="lp-ai-output-row"><span className="lp-field">seal</span><span className="lp-type">stamp · circle</span></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ============ ИНТЕГРАЦИИ ============ */}
      <section className="lp-section" style={{ paddingTop: 0 }}>
        <div className="lp-container">
          <div className="lp-section-head">
            <div className="lp-section-label">Интеграции</div>
            <h2>С тем, что уже есть.</h2>
          </div>
          <div className="lp-integrations-grid">
            <div className="lp-integration">
              <div className="lp-integration-icon">1С</div>
              <div className="lp-integration-name">1С</div>
              <div className="lp-integration-desc">HTTP-сервис или OData. 1С сама шлёт POST после проведения.</div>
            </div>
            <div className="lp-integration">
              <div className="lp-integration-icon">Б</div>
              <div className="lp-integration-name">Битрикс24</div>
              <div className="lp-integration-desc">Webhook на сделку. PDF возвращается в карточку.</div>
            </div>
            <div className="lp-integration">
              <div className="lp-integration-icon">{'{ }'}</div>
              <div className="lp-integration-name">REST API</div>
              <div className="lp-integration-desc">OpenAPI. curl-примеры. SDK: TypeScript, Java.</div>
            </div>
            <div className="lp-integration">
              <div className="lp-integration-icon">🐳</div>
              <div className="lp-integration-name">Docker</div>
              <div className="lp-integration-desc">Один контейнер. Опросник. Offline-лицензия.</div>
            </div>
          </div>
        </div>
      </section>

      {/* ============ ЦЕНЫ ============ */}
      <section className="lp-section lp-pricing" id="pricing">
        <div className="lp-container">
          <div className="lp-section-head center">
            <div className="lp-section-label">Цены</div>
            <h2>Честные. Без «звоните».</h2>
            <p>Начните бесплатно. Платите, когда станет рутиной.</p>
          </div>
          <div className="lp-pricing-grid">
            <div className="lp-plan">
              <div className="lp-plan-name">Starter</div>
              <div className="lp-plan-price"><span className="lp-amount">0 ₽</span><span className="lp-period">/ навсегда</span></div>
              <p className="lp-plan-desc">Попробовать и понять.</p>
              <ul className="lp-plan-features">
                <li><span className="lp-check">✓</span> 100 документов/мес</li>
                <li><span className="lp-check">✓</span> 1 шаблон, 1 схема</li>
                <li><span className="lp-check">✓</span> PDF, PDF/A-2b, SVG</li>
                <li><span className="lp-check">✓</span> Штампы и QR</li>
                <li><span className="lp-check">✓</span> Community-поддержка</li>
              </ul>
              <Link to={startHref} className="lp-plan-cta">Начать</Link>
            </div>
            <div className="lp-plan featured">
              <div className="lp-plan-name">Pro</div>
              <div className="lp-plan-price"><span className="lp-amount">4 900 ₽</span><span className="lp-period">/ мес</span></div>
              <p className="lp-plan-desc">Генерация — часть продукта.</p>
              <ul className="lp-plan-features">
                <li><span className="lp-check">✓</span> 10 000 документов/мес</li>
                <li><span className="lp-check">✓</span> Без лимитов на шаблоны и схемы</li>
                <li><span className="lp-check">✓</span> Async с прогрессом</li>
                <li><span className="lp-check">✓</span> AI-шаблоны из описания и фото</li>
                <li><span className="lp-check">✓</span> Webhooks, приоритет</li>
              </ul>
              <Link to={startHref} className="lp-plan-cta">Оформить</Link>
            </div>
            <div className="lp-plan">
              <div className="lp-plan-name">Enterprise</div>
              <div className="lp-plan-price"><span className="lp-amount">договор</span></div>
              <p className="lp-plan-desc">Self-hosted. SSO. SLA. 1С под ключ.</p>
              <ul className="lp-plan-features">
                <li><span className="lp-check">✓</span> Всё из Pro, без лимитов</li>
                <li><span className="lp-check">✓</span> Self-hosted (Docker, on-prem)</li>
                <li><span className="lp-check">✓</span> Offline-лицензия</li>
                <li><span className="lp-check">✓</span> SSO, RBAC, аудит</li>
                <li><span className="lp-check">✓</span> Интеграция 1С / Битрикс24</li>
              </ul>
              <a href="mailto:hello@ticket-editor.ru" className="lp-plan-cta">Связаться</a>
            </div>
          </div>
        </div>
      </section>

      {/* ============ ОТЗЫВЫ ============ */}
      <section className="lp-section">
        <div className="lp-container">
          <div className="lp-section-head">
            <div className="lp-section-label">Отзывы</div>
            <h2>Внедрили. Не пожалели.</h2>
          </div>
          <div className="lp-testimonials-grid">
            <div className="lp-quote">
              <p className="lp-quote-text">Свой редактор инвойсов делали бы 3 месяца. Здесь — 2 дня, включая миграцию.</p>
              <div className="lp-quote-author">
                <div className="lp-quote-avatar">АК</div>
                <div>
                  <div className="lp-quote-name">Алексей К.</div>
                  <div className="lp-quote-role">CTO, fintech.io</div>
                </div>
              </div>
            </div>
            <div className="lp-quote">
              <p className="lp-quote-text">400 часов в месяц на ручную вёрстку — теперь ноль. Клиенты сами правят шаблон.</p>
              <div className="lp-quote-author">
                <div className="lp-quote-avatar">МС</div>
                <div>
                  <div className="lp-quote-name">Мария С.</div>
                  <div className="lp-quote-role">Операционный директор, LogiTrans</div>
                </div>
              </div>
            </div>
            <div className="lp-quote">
              <p className="lp-quote-text">Штампы и грамоты — это то, чего не было. Загрузили банк — закрыли 80% задач типографии.</p>
              <div className="lp-quote-author">
                <div className="lp-quote-avatar">ДП</div>
                <div>
                  <div className="lp-quote-name">Дмитрий П.</div>
                  <div className="lp-quote-role">Ведущий разработчик, Estate.CRM</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ============ FAQ ============ */}
      <section className="lp-section" id="faq" style={{ background: 'var(--lp-bg-alt)' }}>
        <div className="lp-container">
          <div className="lp-section-head center">
            <div className="lp-section-label">Вопросы</div>
            <h2>Отвечаем прямо.</h2>
          </div>
          <div className="lp-faq-list">
            {FAQ.map((item, i) => (
              <div key={i} className={`lp-faq-item ${openFaq === i ? 'open' : ''}`}>
                <button className="lp-faq-q" onClick={() => setOpenFaq((v) => (v === i ? null : i))}>
                  <span>{item.q}</span>
                  <span className="lp-faq-icon">+</span>
                </button>
                <div className="lp-faq-a">{item.a}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="lp-final-cta">
        <h2>Хватит тикетов. <em>Начните.</em></h2>
        <p>100 документов бесплатно. Первый шаблон — 10 минут. Интеграция — день.</p>
        <div className="lp-hero-ctas">
          <Link to={startHref} className="lp-btn lp-btn-primary lp-btn-xl">
            {user || offline ? 'Открыть приложение →' : 'Создать аккаунт →'}
          </Link>
          <a href="mailto:hello@ticket-editor.ru" className="lp-btn lp-btn-ghost lp-btn-xl">
            Задать вопрос
          </a>
        </div>
        <div className="lp-final-cta-meta">Бесплатно. Без карты. 100 документов/мес.</div>
      </section>

      <footer className="lp-footer">
        <div className="lp-container">
          <div className="lp-footer-grid">
            <div className="lp-footer-brand">
              <div className="lp-logo">
                <span className="lp-logo-mark">T</span>
                ticket-editor
              </div>
              <p>Встраиваемый редактор печатных материалов. JSON на входе, PDF/A на выходе.</p>
            </div>
            <div className="lp-footer-col">
              <h4>Продукт</h4>
              <ul>
                <li><a href="#create" onClick={scrollTo('create')}>Что создать</a></li>
                <li><a href="#stamps" onClick={scrollTo('stamps')}>Штампы</a></li>
                <li><a href="#templates" onClick={scrollTo('templates')}>Шаблоны</a></li>
                <li><a href="#pricing" onClick={scrollTo('pricing')}>Цены</a></li>
              </ul>
            </div>
            <div className="lp-footer-col">
              <h4>Разработчикам</h4>
              <ul>
                <li><a href="/">Документация</a></li>
                <li><a href="/">API</a></li>
                <li><a href="/">Embed</a></li>
              </ul>
            </div>
            <div className="lp-footer-col">
              <h4>Компания</h4>
              <ul>
                <li><a href="/">О нас</a></li>
                <li><a href="mailto:hello@ticket-editor.ru">Контакты</a></li>
                <li><a href="/">Приватность</a></li>
              </ul>
            </div>
          </div>
          <div className="lp-footer-bottom">
            <span>© 2026 ticket-editor.</span>
            <span>
              <a href="/">Условия</a> · <a href="/">Приватность</a> · <a href="/">Статус</a>
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
};