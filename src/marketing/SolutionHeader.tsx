import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { t } from '@/shared/i18n';
import { LanguageSwitcher } from '@/shared/i18n/LanguageSwitcher';
import { ReadySolutionsMenu } from './ReadySolutionsMenu';
import './solution-header.css';

export function SolutionHeader({ home = '/', workspace = '/app', accountLabel = t('Workspace'), children }: {
  home?: string;
  workspace?: string;
  accountLabel?: string;
  children?: ReactNode;
}) {
  return <header className="solution-header">
    <div className="solution-header-inner">
      <Link to={home} className="solution-header-brand" aria-label={t('CoDoc — главная')}>
        <span aria-hidden="true">co</span>CoDoc
      </Link>
      <nav className="solution-header-navigation" aria-label={t('Main navigation')}>
        <ReadySolutionsMenu workspace={workspace} accountLabel={accountLabel} />
        {children}
      </nav>
      <div className="solution-header-actions">
        <LanguageSwitcher compact />
        <Link className="solution-header-account" to={workspace}>{accountLabel}</Link>
      </div>
    </div>
  </header>;
}
