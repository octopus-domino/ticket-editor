import { t } from '@/shared/i18n';
import type { JourneyKind } from '../domain/definitions';

export function JourneyPrintSize({
  kind,
  data,
  onChange,
}: {
  kind: JourneyKind;
  data: Record<string, string>;
  onChange: (patch: Record<string, string>) => void;
}) {
  return (
    <fieldset className="journey-print-size">
      <legend>{t('Print size, mm')}</legend>
      <div className="journey-print-dimensions">
        <label>
          {t('Width')}
          <input
            type="number"
            min="30"
            max="190"
            step="0.1"
            required
            value={data.print_width ?? (kind === 'VCARD' ? '90' : '70')}
            onChange={(event) => onChange({ print_width: event.target.value })}
          />
        </label>
        <label>
          {t('Height')}
          <input
            type="number"
            min="30"
            max="277"
            step="0.1"
            required
            value={data.print_height ?? (kind === 'LABEL' ? '40' : '50')}
            onChange={(event) => onChange({ print_height: event.target.value })}
          />
        </label>
      </div>
      <small>
        {t('Batch PDFs place the cards on A4 at their original size. Print at 100% scale.')}
      </small>
    </fieldset>
  );
}
