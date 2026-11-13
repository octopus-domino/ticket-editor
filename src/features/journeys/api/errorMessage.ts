import { t, getLocale } from '@/shared/i18n';
export function journeyError(status: number, raw?: string): string {
  if (raw?.startsWith('journey.')) {
    switch (raw) {
      case 'journey.poetry.location':
        return t('Choose a region or use your location.');
      case 'journey.poetry.preferences':
      case 'journey.poetry.language':
        return t('Check the language, age and mood for your cards.');
      case 'journey.poetry.weather-unavailable':
        return t('The local forecast is unavailable. Try again a little later.');
      case 'journey.poetry.sources-unavailable':
        return t('The poetry sources are unavailable. Try again a little later.');
      case 'journey.poetry.not-enough':
        return t('We could not find seven verified poems for these preferences. Try another mood or audience.');
      case 'journey.poetry.busy':
        return t('Another poetry selection is being prepared. Please try again shortly.');
      case 'journey.route.invalid-time':
        return t(
          'Check local dates and time zones. This time may not exist or may occur twice when clocks change.',
        );
      case 'journey.route.missed-flight':
        return t('You will not reach the airport in time. Leave earlier or change the connection.');
      case 'journey.route.too-long':
        return t('Split this ground transfer into sections of up to 1500 km.');
      case 'journey.route.walk-too-long':
        return t('Split this walk into sections of up to 400 km.');
      case 'journey.route.unavailable':
        return t('The road route could not be calculated. Try closer stops or retry later.');
      case 'journey.route.search-unavailable':
      case 'journey.route.places-unavailable':
        return t('Address search is unavailable. Please try again shortly.');
      case 'journey.route.invalid-route':
        return t('Check the stops, travel times and route settings.');
      case 'journey.media.invalid':
      case 'journey.media.too-large':
        return t('Could not prepare the image.');
      case 'journey.media.position':
        return t('Choose a position and size. Changes appear in the document preview and PDF.');
      case 'journey.print.too_long':
        return t('The text does not fit. Increase the print size or shorten the text.');
      case 'journey.print.size':
        return t('Enter a print size between 30 and 190 mm wide and 30 and 277 mm high.');
      case 'journey.price.invalid':
        return t('Enter a valid price and a three-letter currency code.');
      case 'journey.review.closed':
        return t('Reviews are closed for this document.');
      case 'journey.review.invalid':
        return t('Choose a rating from 1 to 5 and keep the review under 2000 characters.');
      case 'journey.media.full':
      case 'journey.route.storage-full':
        return t('Storage is full. Please contact support.');
      case 'journey.media.busy':
      case 'journey.route.busy':
      case 'journey.route.search-busy':
        return t('Too many requests. Please try again later.');
      default:
        return t('Check the form and try again.');
    }
  }
  if (status === 409) return t('The document has changed. Reload and try again.');
  if (status === 429) return t('Too many requests. Please try again later.');
  if (status === 401) return t('Sign in');
  if (status === 403) return t('Access denied');
  if (status === 404) return t('Not found');
  const translated = raw ? t(raw) : '';
  if (raw && translated !== raw) return translated;
  if (raw && getLocale() === 'ru' && /[А-Яа-я]/.test(raw)) return raw;
  return t('Check the form and try again.');
}
