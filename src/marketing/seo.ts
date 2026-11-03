import { SEARCH_PAGES } from './searchPages';

export const SITE_URL = 'https://codoc.site';
export interface PageMetadata {
  path: string;
  title: string;
  description: string;
  index: boolean;
}
export const HOME_METADATA: PageMetadata = {
  path: '/',
  title: 'CoDoc — редактор шаблонов и генератор PDF онлайн',
  description:
    'Создавайте шаблоны документов, билеты и сертификаты в визуальном редакторе CoDoc. Подставляйте данные и скачивайте PDF, PDF/A и SVG, в том числе пакетами.',
  index: true,
};

export function getPageMetadata(pathname: string): PageMetadata {
  const path = pathname.replace(/\/+$/, '') || '/';
  if (path === '/') return HOME_METADATA;
  const page = SEARCH_PAGES.find((item) => item.path.replace(/\/$/, '') === path);
  if (page)
    return { path: page.path, title: page.title, description: page.description, index: true };
  const privateRoute = /^\/(app(?:\/|$)|login(?:\/|$)|register(?:\/|$)|auth(?:\/|$))/.test(path);
  return {
    path,
    title: privateRoute ? 'CoDoc — рабочая область' : 'Страница не найдена — CoDoc',
    description: 'CoDoc — создание шаблонов и документов из данных.',
    index: false,
  };
}

export function structuredData(meta: PageMetadata) {
  if (!meta.index) return null;
  const website = {
    '@type': 'WebSite',
    '@id': `${SITE_URL}/#website`,
    name: 'CoDoc',
    url: `${SITE_URL}/`,
    inLanguage: 'ru',
  };
  return {
    '@context': 'https://schema.org',
    '@graph':
      meta.path === '/'
        ? [
            website,
            {
              '@type': 'WebApplication',
              name: 'CoDoc',
              url: `${SITE_URL}/`,
              description: meta.description,
              applicationCategory: 'BusinessApplication',
              operatingSystem: 'Web',
              inLanguage: 'ru',
              featureList: [
                'Визуальное создание шаблонов',
                'Персонализация документов',
                'Пакетная генерация PDF',
                'Экспорт PDF, PDF/A и SVG',
              ],
            },
          ]
        : [
            website,
            {
              '@type': 'WebPage',
              name: meta.title,
              description: meta.description,
              url: SITE_URL + meta.path,
              inLanguage: 'ru',
              isPartOf: { '@id': `${SITE_URL}/#website` },
            },
            {
              '@type': 'BreadcrumbList',
              itemListElement: [
                { '@type': 'ListItem', position: 1, name: 'CoDoc', item: `${SITE_URL}/` },
                {
                  '@type': 'ListItem',
                  position: 2,
                  name: SEARCH_PAGES.find((page) => page.path === meta.path)?.label ?? meta.title,
                  item: SITE_URL + meta.path,
                },
              ],
            },
          ],
  };
}

const escapeHtml = (value: string) =>
  value.replace(
    /[&<>"']/g,
    (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]!,
  );

/** Used by prerendering; all public pages share one metadata source with the SPA. */
export function renderSeoHead(meta: PageMetadata): string {
  const title = escapeHtml(meta.title),
    description = escapeHtml(meta.description);
  const url = escapeHtml(SITE_URL + meta.path);
  const data = structuredData(meta);
  const verification = [
    ['yandex-verification', import.meta.env.VITE_YANDEX_VERIFICATION],
    ['google-site-verification', import.meta.env.VITE_GOOGLE_SITE_VERIFICATION],
  ]
    .filter(([, value]) => typeof value === 'string' && value.trim())
    .map(([name, value]) => `<meta name="${name}" content="${escapeHtml(String(value).trim())}" />`)
    .join('\n');
  return `<title>${title}</title>
<meta name="description" content="${description}" />
<meta name="robots" content="${meta.index ? 'index, follow' : 'noindex, nofollow'}" />
${meta.index ? `<link rel="canonical" href="${url}" />` : ''}
<meta property="og:type" content="website" />
<meta property="og:locale" content="ru_RU" />
<meta property="og:site_name" content="CoDoc" />
<meta property="og:title" content="${title}" />
<meta property="og:description" content="${description}" />
<meta property="og:url" content="${url}" />
<meta property="og:image" content="${SITE_URL}/images/document-studio.webp" />
<meta property="og:image:width" content="1536" />
<meta property="og:image:height" content="1024" />
<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:title" content="${title}" />
<meta name="twitter:description" content="${description}" />
<meta name="twitter:image" content="${SITE_URL}/images/document-studio.webp" />
${verification}
${data ? `<script id="codoc-structured-data" type="application/ld+json">${JSON.stringify(data).replace(/</g, '\\u003c')}</script>` : ''}`;
}
