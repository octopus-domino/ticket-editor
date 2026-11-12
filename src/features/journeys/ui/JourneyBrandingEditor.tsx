import { useState } from 'react';
import { t } from '@/shared/i18n';
import type { JourneyBranding, ImagePlacement } from '../domain/branding';
import { mediaUrl, uploadJourneyImage } from '../api/media';
import './branding.css';

export function JourneyBrandingEditor({
  value,
  onChange,
  onBusyChange,
}: {
  value: JourneyBranding;
  onChange(value: JourneyBranding): void;
  onBusyChange?(busy: boolean): void;
}) {
  const [busy, setBusy] = useState(false),
    [error, setError] = useState('');
  function patch(slot: 'logo' | 'picture', update: Partial<ImagePlacement>) {
    const current = value[slot];
    if (current) onChange({ ...value, [slot]: { ...current, ...update } });
  }
  return (
    <fieldset className="journey-branding">
      <legend>{t('Logo and image')}</legend>
      <p>{t('Choose a position and size. Changes appear in the document preview and PDF.')}</p>
      {(['logo', 'picture'] as const).map((slot) => (
        <section key={slot}>
          <label>
            {slot === 'logo' ? t('Company logo') : t('Document image')}
            <input
              type="file"
              accept="image/png,image/jpeg,image/webp"
              disabled={busy}
              onChange={async (event) => {
                const file = event.currentTarget.files?.[0];
                event.currentTarget.value = '';
                if (!file) return;
                setBusy(true);
                setError('');
                onBusyChange?.(true);
                try {
                  const asset = await uploadJourneyImage(file, slot === 'logo');
                  onChange({
                    ...value,
                    [slot]: {
                      mediaId: asset.id,
                      x: 1,
                      y: slot === 'logo' ? 0 : 0.7,
                      scale: slot === 'logo' ? 0.18 : 0.3,
                    },
                  });
                } catch (reason) {
                  setError((reason as Error).message);
                } finally {
                  setBusy(false);
                  onBusyChange?.(false);
                }
              }}
            />
          </label>
          {value[slot] && (
            <>
              <img
                className="journey-branding-thumb"
                src={mediaUrl(value[slot]!.mediaId)}
                alt={slot === 'logo' ? t('Company logo') : t('Document image')}
              />
              <div className="journey-branding-anchors" role="group" aria-label={t('Position')}>
                {[
                  [0, 0],
                  [0.5, 0],
                  [1, 0],
                  [0, 0.5],
                  [0.5, 0.5],
                  [1, 0.5],
                  [0, 1],
                  [0.5, 1],
                  [1, 1],
                ].map(([x, y], index) => (
                  <button
                    type="button"
                    disabled={busy}
                    key={index}
                    aria-label={t('Position {0}', index + 1)}
                    aria-pressed={value[slot]!.x === x && value[slot]!.y === y}
                    onClick={() => patch(slot, { x, y })}
                  >
                    {['↖', '↑', '↗', '←', '●', '→', '↙', '↓', '↘'][index]}
                  </button>
                ))}
              </div>
              {(['x', 'y', 'scale'] as const).map((field) => (
                <label key={field}>
                  {field === 'x'
                    ? t('Horizontal position')
                    : field === 'y'
                      ? t('Vertical position')
                      : t('Image size')}
                  <input
                    type="range"
                    disabled={busy}
                    min={field === 'scale' ? 5 : 0}
                    max={field === 'scale' ? 60 : 100}
                    value={Math.round(value[slot]![field] * 100)}
                    onChange={(event) => patch(slot, { [field]: Number(event.target.value) / 100 })}
                  />
                  <output>{Math.round(value[slot]![field] * 100)}%</output>
                </label>
              ))}
              <button
                type="button"
                disabled={busy}
                onClick={() => onChange({ ...value, [slot]: null })}
              >
                {t('Remove image')}
              </button>
            </>
          )}
        </section>
      ))}
      {busy && <p role="status">{t('Uploading image…')}</p>}
      {error && <p role="alert">{error}</p>}
    </fieldset>
  );
}
