import { BackgroundLibrary } from '@/shared/backgrounds/BackgroundLibrary';
import { backgroundUrl } from '@/shared/backgrounds/catalog';
import { mediaUrl } from '../api/media';
import { t } from '@/shared/i18n';
import { useState } from 'react';

/** The same library and stored asset are used by every ready document workflow. */
export function JourneyBackgroundPicker({ value, onChange, onBusyChange }: {
  value: Record<string,string>; onChange: (patch: Record<string,string>) => void | Promise<void>; onBusyChange?: (busy: boolean) => void;
}) {
  const [busy,setBusy]=useState(false);
  return <section>
    <BackgroundLibrary selectedId={value.background_preset} onBusyChange={value=>{setBusy(value);onBusyChange?.(value);}} onSelect={async preset => {
      await onChange({ background_preset: preset.id, background_media: '' });
    }} />
    {(value.background_preset || value.background_media) && <div className="journey-background-selected"><img src={backgroundUrl(value.background_preset,true) ?? mediaUrl(value.background_media)} alt={t('Background choices')} width={120} height={80} />
      <button type="button" disabled={busy} onClick={() => void onChange({ background_preset:'', background_media:'' })}>{t('Remove')}</button></div>}
  </section>;
}
