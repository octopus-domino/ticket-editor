import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { getLocale, t } from '@/shared/i18n';
import './trip-experience.css';

export function tripDateLabel(value: string, dateStyle: 'short' | 'medium' | 'full' = 'medium') {
  const date = new Date(value);
  return Number.isFinite(date.getTime())
    ? new Intl.DateTimeFormat(getLocale(), { dateStyle, timeZone: 'UTC' }).format(date)
    : value;
}

export type TripDayChoice = { id: string; date?: string; title?: string };

export function TripExperienceLoading() {
  return <main className="trip-exp" aria-busy="true">
    <p role="status">{t('Loading…')}</p>
    <div className="trip-exp-workspace" aria-hidden="true">
      <div className="trip-exp-panel trip-exp-skeleton" />
      <div className="trip-exp-panel trip-exp-skeleton" />
    </div>
  </main>;
}

export function TripDayNavigator({ days, selected, onSelect, action }: {
  days: TripDayChoice[]; selected: string;
  onSelect: (id: string) => void; action?: ReactNode;
}) {
  const choices = [{ id: 'overview', title: t('Trip overview') }, ...days];
  return <div className="trip-exp-navigation">
    <nav aria-label={t('Trip overview')}>
      {choices.map(({ id, date, title }, index) => <button key={id} type="button" data-trip-day={id}
        aria-current={selected === id ? 'true' : undefined} onClick={() => onSelect(id)}
        onKeyDown={event => {
          const next = { ArrowRight: index + 1, ArrowLeft: index - 1, Home: 0, End: choices.length - 1 }[event.key];
          if (next === undefined || !choices[next]) return;
          event.preventDefault();
          const button = event.currentTarget.parentElement?.querySelectorAll('button')[next];
          button?.focus();
          onSelect(choices[next].id);
        }}>
        {date && <time dateTime={date}>{tripDateLabel(date)}</time>}
        <span>{title || t('Trip day')}</span>
      </button>)}
    </nav>
    {action}
  </div>;
}

export function TripExperienceShell({ mode, title, dateSpan, subtitle, actions, navigation, children }: {
  mode: 'owner' | 'shared' | 'planner'; title: string; dateSpan?: ReactNode; subtitle?: ReactNode;
  actions?: ReactNode; navigation?: ReactNode; children: ReactNode;
}) {
  const Tag = mode === 'planner' ? 'section' : 'main';
  return <Tag className="trip-exp" data-mode={mode}>
    <header className="trip-exp-header">
      <div>
        {mode === 'owner' && <Link className="trip-exp-back" to="/start/tours">{t('Travel planner')}</Link>}
        {dateSpan && <div className="trip-exp-dates">{dateSpan}</div>}
        <h1>{title}</h1>
        {subtitle && <p>{subtitle}</p>}
      </div>
      {actions && <div className="trip-exp-actions">{actions}</div>}
    </header>
    {navigation}
    {children}
  </Tag>;
}
