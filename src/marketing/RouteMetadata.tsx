import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { trackPage } from '@/shared/analytics/metrika';
import { getPageMetadata, SITE_URL, structuredData } from './seo';

function setMeta(attribute: 'name' | 'property', key: string, content: string) {
  let element = document.querySelector<HTMLMetaElement>(`meta[${attribute}="${key}"]`);
  if (!element) {
    element = document.createElement('meta');
    element.setAttribute(attribute, key);
    document.head.append(element);
  }
  element.content = content;
}

export function RouteMetadata() {
  const { pathname } = useLocation();
  useEffect(() => {
    const meta = getPageMetadata(pathname);
    document.title = meta.title;
    setMeta('name', 'description', meta.description);
    setMeta('name', 'robots', meta.index ? 'index, follow' : 'noindex, nofollow');
    setMeta('property', 'og:title', meta.title);
    setMeta('property', 'og:description', meta.description);
    setMeta('property', 'og:url', meta.index ? SITE_URL + meta.path : SITE_URL + '/');
    setMeta('name', 'twitter:title', meta.title);
    setMeta('name', 'twitter:description', meta.description);
    let canonical = document.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    if (meta.index) {
      if (!canonical) {
        canonical = document.createElement('link');
        canonical.rel = 'canonical';
        document.head.append(canonical);
      }
      canonical.href = SITE_URL + meta.path;
    } else canonical?.remove();
    const data = structuredData(meta);
    let script = document.querySelector<HTMLScriptElement>('#codoc-structured-data');
    if (data) {
      if (!script) {
        script = document.createElement('script');
        script.id = 'codoc-structured-data';
        script.type = 'application/ld+json';
        document.head.append(script);
      }
      script.textContent = JSON.stringify(data);
    } else script?.remove();
    trackPage(pathname);
  }, [pathname]);
  return null;
}
