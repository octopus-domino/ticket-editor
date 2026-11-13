import { useState } from 'react';
import { getLocale, t } from '@/shared/i18n';
import { BACKGROUND_CATALOG, backgroundUrl, type BackgroundPreset } from './catalog';
import './background-library.css';

export function BackgroundLibrary({ onSelect, selectedId, disabled, onBusyChange }: {
  onSelect: (preset: BackgroundPreset) => void | Promise<void>;
  selectedId?: string; disabled?: boolean; onBusyChange?: (busy: boolean) => void;
}) {
  const [category, setCategory] = useState('all');
  const [pending, setPending] = useState(''), [chosen, setChosen] = useState(selectedId ?? ''), [error, setError] = useState('');
  const categories: Record<string, string> = {
    all: t('All backgrounds'), botanical: t('Botanical'), abstract: t('Abstract'), texture: t('Textures'),
    celebration: t('Celebrations'), travel: t('Travel'), business: t('Business'),
  };
  const select = async (preset: BackgroundPreset) => {
    if (disabled || pending) return;
    setPending(preset.id); setError(''); onBusyChange?.(true);
    try { await onSelect(preset); setChosen(preset.id); }
    catch { setError(t('Could not load the background. Please try again.')); }
    finally { setPending(''); onBusyChange?.(false); }
  };
  return <details className="background-library">
    <summary>{t('Background library')} <span>{BACKGROUND_CATALOG.length}</span></summary>
    <p>{t('Choose a background. Existing text and objects stay in place.')}</p>
    <label>{t('Background category')}<select disabled={Boolean(pending) || disabled} value={category} onChange={event => setCategory(event.target.value)}>
      {Object.entries(categories).map(([id, label]) => <option key={id} value={id}>{label}</option>)}
    </select></label>
    <div className="background-library-grid" role="group" aria-label={t('Background choices')}>
      {BACKGROUND_CATALOG.filter(preset => category === 'all' || preset.category === category).map(preset => {
        const label = preset.names[getLocale()];
        return <button key={preset.id} type="button" className="background-library-item" title={label}
          aria-pressed={(selectedId ?? chosen) === preset.id} disabled={Boolean(pending) || disabled} onClick={() => void select(preset)}>
          <img src={backgroundUrl(preset.id, true)} alt="" loading="lazy" decoding="async" width={120} height={120} />
          <span>{label}</span>
        </button>;
      })}
    </div>
    {pending && <p role="status">{t('Loading background…')}</p>}
    {error && <p role="alert">{error}</p>}
  </details>;
}
