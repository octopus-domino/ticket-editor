import { useEffect, useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { t } from '@/shared/i18n';
import { JOURNEY_PAGES } from './journeyPages';
import './solutions-menu.css';

export const SOLUTION_GROUPS = [
  { label: () => t('Events and people'), kinds: ['courses', 'invite', 'tickets', 'certificates', 'badges', 'greetings', 'gifts', 'albums'] },
  { label: () => t('Work and business'), kinds: ['business', 'proposals', 'cards', 'labels', 'price-tags', 'menu', 'passes', 'properties'] },
  { label: () => t('Everyday plans'), kinds: ['tours', 'schedule', 'resume', 'poetry'] },
];
export function ReadySolutionsMenu() {
  const root = useRef<HTMLDetailsElement>(null);
  const { pathname } = useLocation();
  const close = () => { if (root.current) root.current.open = false; };
  useEffect(() => {
    const outside = (event: PointerEvent) => { if (!root.current?.contains(event.target as Node)) close(); };
    document.addEventListener('pointerdown', outside);
    return () => document.removeEventListener('pointerdown', outside);
  }, []);
  return <details ref={root} className="solutions-menu" onKeyDown={event => { if (event.key === 'Escape') { close(); root.current?.querySelector('summary')?.focus(); } }}>
    <summary>{t('Solutions')} <span aria-hidden="true">⌄</span></summary>
    <nav className="solutions-menu-panel" aria-label={t('Ready-to-use services')}>
      <Link className="solutions-menu-all" to="/solutions/" onClick={close}>{t('All solutions')}</Link>
      {SOLUTION_GROUPS.map(group => <section key={group.kinds[0]}><h3>{group.label()}</h3>
        {JOURNEY_PAGES.filter(page => group.kinds.includes(page.kind)).map(page =>
          <Link key={page.path} to={page.path} onClick={close} aria-current={pathname === page.path ? 'page' : undefined}>{page.label}</Link>)}
      </section>)}
      <Link className="solutions-menu-all" to="/sites/new" onClick={close}>{t('Create a website')} ↗</Link>
    </nav>
  </details>;
}
