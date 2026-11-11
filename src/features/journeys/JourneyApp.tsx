import { t } from '@/shared/i18n';
import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { defaultJourney, JOURNEYS } from './domain/definitions';
import type { JourneyDefinition } from './domain/definitions';
import { journeyApi, workspaceUrl } from './api/journeys';
import { JourneyWizard } from './ui/JourneyWizard';
import { JourneyPublic } from './ui/JourneyPublic';
import { JourneySiteBuilder } from './ui/JourneySiteBuilder';
import { JourneyBatch } from './ui/JourneyBatch';
import './journeys.css';
import { LanguageSwitcher } from '@/shared/i18n/LanguageSwitcher';
import WorkflowRunner from '../workflows/WorkflowRunner';
import { localizeInvalidField, clearFieldValidation } from './ui/formValidation';

function ConfiguredJourney() {
  const params = useParams();
  const slug = params.slug ?? window.location.hostname.split('.')[0];
  const [definition, setDefinition] = useState<JourneyDefinition | null>(null);
  const [error, setError] = useState('');
  const [professional, setProfessional] = useState(false);
  useEffect(() => {
    let active = true;
    setDefinition(null);
    setProfessional(false);
    void journeyApi
      .site(slug)
      .then((value) => {
        if (active) setDefinition(value);
      })
      .catch((reason) => {
        if (active && (reason as { status?: number }).status === 404) {
          setProfessional(true);
          return;
        }
        if (active) setError((reason as Error).message);
      });
    return () => {
      active = false;
    };
  }, [slug]);
  return professional ? (
    <WorkflowRunner slugOverride={slug} embedded />
  ) : definition ? (
    <JourneyWizard key={slug} definition={definition} custom />
  ) : (
    <main className="journey-public">
      {error ? <p role="alert">{error}</p> : <p role="status">{t('Загружаем сайт…')}</p>}
    </main>
  );
}
export default function JourneyApp({
  mode = 'wizard',
}: {
  mode?: 'wizard' | 'public' | 'manage' | 'builder' | 'custom' | 'batch';
}) {
  const { kind } = useParams();
  const selected = kind ?? defaultJourney(window.location.hostname) ?? 'invite';
  return (
    <div
      className="journey-app"
      onInvalidCapture={localizeInvalidField}
      onInputCapture={clearFieldValidation}
    >
      <header className="journey-header">
        <LanguageSwitcher />
        <Link to={workspaceUrl('/')} className="journey-logo">
          CoDoc<span> {t('/ для вашего события')}</span>
        </Link>
        <nav>
          <Link to={workspaceUrl('/app/publications')}>{t('My sites and documents')}</Link>
          {mode === 'public' ? (
            <Link to="/solutions/">{t('Создать свой документ ↗')}</Link>
          ) : (
            <>
              <Link to="/solutions/">{t('Все сценарии')}</Link>
              <Link to="/start/invite">{t('Приглашения')}</Link>
              <Link to="/start/certificates">{t('Сертификаты')}</Link>
              <Link to="/start/menu">{t('QR-меню')}</Link>
              <Link to="/sites/new">{t('Конструктор ↗')}</Link>
            </>
          )}
        </nav>
      </header>
      {mode === 'batch' ? (
        <JourneyBatch />
      ) : mode === 'public' ? (
        <JourneyPublic />
      ) : mode === 'manage' ? (
        <JourneyPublic manage />
      ) : mode === 'builder' ? (
        <JourneySiteBuilder />
      ) : mode === 'custom' ? (
        <ConfiguredJourney />
      ) : JOURNEYS[selected] ? (
        <JourneyWizard key={selected} definition={JOURNEYS[selected]} />
      ) : (
        <main>{t('Сценарий не найден.')}</main>
      )}
      <footer className="journey-footer">
        <Link to="/">CoDoc</Link>
        <span>{t('Создавайте поводы. Мы позаботимся о деталях.')}</span>
        <Link to="/app">{t('Открыть редактор ↗')}</Link>
      </footer>
    </div>
  );
}
