import sources from './remaining-source.json';
import { REMAINING_TRANSLATIONS } from './remaining-translations';

export const REMAINING_MESSAGES =
  REMAINING_TRANSLATIONS.trim()
    .split('\n')
    .map((row) => {
      const [id, english, ...translations] = row.split('|');
      const source = sources[Number(id)];
      if (!source || !english || translations.length !== 7)
        throw new Error(`Invalid translation ID: ${id}`);
      return [english, source, ...translations].join('|');
    })
    .join('\n') + '\n';
