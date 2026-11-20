import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authStore } from '@/auth/store';
import { templateStore } from '@/features/templates/state/TemplateStore';
import { t } from '@/shared/i18n';
import { useStore } from '@/shared/store/store';
import type { AccountTrip } from '../api/tripDraft';
import { tripTemplateSlides } from '../domain/tripTemplateSlides';

export function TripTemplateAction({ getTrip }: { getTrip: () => AccountTrip | undefined }) {
  const navigate = useNavigate();
  const booting = useStore(authStore, state => state.booting);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);

  async function openTemplate() {
    const trip = getTrip();
    if (!trip) return;
    setBusy(true);
    setError(false);
    try {
      if (!authStore.getState().user) authStore.enterGuest();
      const template = await templateStore.create({
        name: trip.title.slice(0, 180), schemaId: null, slides: tripTemplateSlides(trip), bindings: [],
      });
      navigate(`/app/templates/${encodeURIComponent(template.id)}/edit`);
    } catch {
      setError(true);
    } finally {
      setBusy(false);
    }
  }

  return <>
    <button type="button" disabled={busy || booting} onClick={() => void openTemplate()}>
      {t('Create a trip template')}
    </button>
    {error && <p role="alert">{t('Could not create a trip template.')}</p>}
  </>;
}
