import { isTranslation, t } from '@/shared/i18n';
import { journeyPresets, type JourneyDefinition } from './definitions';

/** Rebase untouched preset copy after a language reload, preserving authored text. */
export function localizePresetDraft(draft: JourneyDefinition): JourneyDefinition {
  const source = Object.values(journeyPresets((message) => message)).find(
    (preset) => preset.kind === draft.kind,
  );
  if (!source) return draft;
  const translateDefault = (value: string, original: string) =>
    isTranslation(original, value) ? t(original) : value;
  return {
    ...draft,
    title: translateDefault(draft.title, source.title),
    description: translateDefault(draft.description, source.description),
    fields: draft.fields.map((field) => {
      const original = source.fields.find((item) => item.name === field.name);
      return original ? { ...field, label: translateDefault(field.label, original.label) } : field;
    }),
  };
}
