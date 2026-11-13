import { BackgroundLibrary } from '@/shared/backgrounds/BackgroundLibrary';
import { loadBackground } from '@/shared/backgrounds/loadBackground';
import { journeyRequest } from '../api/journeys';
import { mediaUrl } from '../api/media';
import { t } from '@/shared/i18n';
import { useState } from 'react';
const preparedAssets = new Map<string,string>();

/** The same library and stored asset are used by every ready document workflow. */
export function JourneyBackgroundPicker({ value, onChange, onBusyChange }: {
  value: Record<string,string>; onChange: (patch: Record<string,string>) => void | Promise<void>; onBusyChange?: (busy: boolean) => void;
}) {
  const [busy,setBusy]=useState(false);
  return <section>
    <BackgroundLibrary selectedId={value.background_preset} onBusyChange={value=>{setBusy(value);onBusyChange?.(value);}} onSelect={async preset => {
      const cached=preparedAssets.get(preset.id);
      if(cached){await onChange({background_preset:preset.id,background_media:cached});return;}
      const image = await loadBackground(preset.id);
      const asset = await journeyRequest<{id:string}>('/api/journeys/media/background', { method: 'POST', body: JSON.stringify({ image }) });
      preparedAssets.set(preset.id,asset.id);
      await onChange({ background_preset: preset.id, background_media: asset.id });
    }} />
    {value.background_media && <div className="journey-background-selected"><img src={mediaUrl(value.background_media)} alt={t('Background choices')} width={120} height={80} />
      <button type="button" disabled={busy} onClick={() => void onChange({ background_preset:'', background_media:'' })}>{t('Remove')}</button></div>}
  </section>;
}
