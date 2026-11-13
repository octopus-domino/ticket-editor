import { BackgroundLibrary } from '@/shared/backgrounds/BackgroundLibrary';
import { loadBackground } from '@/shared/backgrounds/loadBackground';
import { journeyRequest } from '../api/journeys';
import { mediaUrl } from '../api/media';
import { t } from '@/shared/i18n';

/** The same library and stored asset are used by every ready document workflow. */
export function JourneyBackgroundPicker({ value, onChange, onBusyChange }: {
  value: Record<string,string>; onChange: (patch: Record<string,string>) => void; onBusyChange?: (busy: boolean) => void;
}) {
  return <section>
    <BackgroundLibrary selectedId={value.background_preset} onBusyChange={onBusyChange} onSelect={async preset => {
      const image = await loadBackground(preset.id);
      const asset = await journeyRequest<{id:string}>('/api/journeys/media/background', { method: 'POST', body: JSON.stringify({ image }) });
      onChange({ background_preset: preset.id, background_media: asset.id });
    }} />
    {value.background_media && <div><img src={mediaUrl(value.background_media)} alt={t('Background choices')} style={{maxWidth:160,maxHeight:100}} />
      <button type="button" onClick={() => onChange({ background_preset:'', background_media:'' })}>{t('Remove')}</button></div>}
  </section>;
}
