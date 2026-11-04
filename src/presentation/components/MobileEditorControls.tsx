import { toggleMobilePanel, useMobilePanel } from '@/shared/mobile/panels';
import { t, useLocale } from '@/shared/i18n';

export function MobileEditorControls() {
  useLocale();
  const panel = useMobilePanel();
  return <nav className="mobile-editor-controls" aria-label={t('Editor panels')}>
    <button type="button" aria-pressed={panel === 'documents'} onClick={() => toggleMobilePanel('documents')}>☰ {t('Documents')}</button>
    <button type="button" aria-pressed={panel === 'tools'} onClick={() => toggleMobilePanel('tools')}>＋ {t('Tools')}</button>
    <button type="button" aria-pressed={panel === 'properties'} onClick={() => toggleMobilePanel('properties')}>⚙ {t('Properties and data')}</button>
  </nav>;
}
