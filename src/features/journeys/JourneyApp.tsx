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
import WorkflowRunner from '../workflows/WorkflowRunner';
import { localizeInvalidField, clearFieldValidation } from './ui/formValidation';
import { BackgroundSurface } from '@/shared/backgrounds/BackgroundSurface';
import { SolutionHeader } from '../../marketing/SolutionHeader';

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
    <BackgroundSurface id={definition.backgroundPreset}><JourneyWizard key={slug} definition={definition} custom /></BackgroundSurface>
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
      <SolutionHeader home={workspaceUrl('/')} workspace={workspaceUrl('/app/publications')} accountLabel={t('My sites and documents')}>
        {mode === 'public'
          ? <Link to="/solutions/">{t('Создать свой документ ↗')}</Link>
          : <Link to="/sites/new" aria-current={mode === 'builder' ? 'page' : undefined}>{t('Website builder')}</Link>}
      </SolutionHeader>
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
