import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { trackPage } from '@/shared/analytics/metrika';

export function RouteMetadata() {
  const { pathname } = useLocation();
  useEffect(() => {
    const isPublic = pathname === '/';
    document.title = isPublic
      ? 'CoDoc — редактор шаблонов и генератор PDF онлайн'
      : 'CoDoc — рабочая область';
    document
      .querySelector('meta[name="robots"]')
      ?.setAttribute('content', isPublic ? 'index, follow' : 'noindex, nofollow');
    const canonical = document.querySelector('link[rel="canonical"]');
    if (isPublic) canonical?.setAttribute('href', 'https://codoc.site/');
    else canonical?.removeAttribute('href');
    trackPage(pathname);
  }, [pathname]);
  return null;
}
