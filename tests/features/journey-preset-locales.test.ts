import { afterEach, describe, expect, it } from 'vitest';
import { getLocale, setLocale, t } from '@/shared/i18n';
import { journeyPresets } from '@/features/journeys/domain/definitions';
import { localizePresetDraft } from '@/features/journeys/domain/localizePresetDraft';

const originalLocale = getLocale();
afterEach(() => setLocale(originalLocale));

describe('site preset text after a language change', () => {
  it('translates untouched fields while retaining the address and authored copy', () => {
    setLocale('ru');
    const preset = journeyPresets().tickets;
    const draft = {
      ...preset,
      slug: 'our-event',
      title: 'Our own event title',
      fields: preset.fields.map((field) =>
        field.name === 'location' ? { ...field, label: 'My custom venue question' } : field,
      ),
    };
    setLocale('en');
    const result = localizePresetDraft(draft);
    expect(result.title).toBe('Our own event title');
    expect(result.slug).toBe('our-event');
    expect(result.description).toBe(journeyPresets().tickets.description);
    expect(result.fields.find((field) => field.name === 'description')!.label).toBe(
      t('Мероприятие'),
    );
    expect(result.fields.find((field) => field.name === 'location')!.label).toBe(
      'My custom venue question',
    );
    setLocale('de');
    expect(
      localizePresetDraft(result).fields.find((field) => field.name === 'description')!.label,
    ).toBe(t('Мероприятие'));
  });
});
