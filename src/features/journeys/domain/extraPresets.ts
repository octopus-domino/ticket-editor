import { t } from '@/shared/i18n';
import type { JourneyDefinition, JourneyField } from './types';

export function extraJourneyPresets(translate: typeof t): Record<string, JourneyDefinition> {
  const field = (
    name: string,
    label: string,
    type: JourneyField['type'] = 'text',
    required = true,
  ): JourneyField => ({ name, label: translate(label), type, required });
  return {
    poetry: { slug: 'poetry', kind: 'POETRY', theme: 'sage', title: translate('Seven days of poetry'),
      description: translate('A little warmth for each day. Choose a language, age and mood; we will find real poems for seven personal cards.'),
      fields: [field('description', 'A personal message', 'textarea', false)] },
    albums: {
      slug: 'albums', kind: 'ALBUM', theme: 'sage', title: translate('An album made together'),
      description: translate('Invite family and friends to add photos and handwritten captions. Keep one shared album and print it as a PDF.'),
      fields: [field('description', 'A few words about the album', 'textarea', false)],
    },
    cards: {
      slug: 'cards',
      kind: 'VCARD',
      theme: 'ink',
      title: translate('QR business cards'),
      description: translate(
        'Create a business card, print it and let people save your contact by QR.',
      ),
      fields: [
        field('recipient', 'Name'),
        field('issuer', 'Company', 'text', false),
        field('role', 'Job title', 'text', false),
        field('phone', 'Phone'),
        field('email', 'Email', 'text', false),
        field('website', 'Website', 'text', false),
      ],
    },
    labels: {
      slug: 'labels',
      kind: 'LABEL',
      theme: 'sage',
      title: translate('Product labels'),
      description: translate(
        'Import products, add batch details and print labels on A4 with a QR for each product.',
      ),
      fields: [
        field('recipient', 'Product name'),
        field('issuer', 'Manufacturer'),
        field('batch', 'Batch number'),
        field('weight', 'Weight or volume', 'text', false),
        field('date', 'Manufactured on', 'date'),
        field('valid_until', 'Best before', 'date'),
        field('description', 'Description', 'textarea', false),
      ],
    },
    'price-tags': {
      slug: 'price-tags',
      kind: 'PRICETAG',
      theme: 'rose',
      title: translate('Price tags with reviews'),
      description: translate(
        'Make printable price tags. Customers scan the QR, leave a rating and you see the feedback.',
      ),
      fields: [
        field('recipient', 'Product name'),
        field('issuer', 'Store'),
        field('price', 'Price'),
        field('currency', 'Currency'),
        field('description', 'Description', 'textarea', false),
      ],
    },
    properties: {
      slug: 'properties',
      kind: 'PROPERTY',
      theme: 'sage',
      title: translate('Property cards'),
      description: translate(
        'Add a property photo and details. Share one page, a PDF and a QR for viewings.',
      ),
      fields: [
        field('location', 'Address'),
        field('area', 'Area, m²'),
        field('rooms', 'Rooms'),
        field('price', 'Price'),
        field('currency', 'Currency'),
        field('description', 'Description', 'textarea'),
        field('contact', 'Contacts'),
      ],
    },
    tours: {
      slug: 'tours',
      kind: 'TOUR',
      theme: 'ink',
      title: translate('Travel itineraries'),
      description: translate(
        'Choose stops by address, add a travel program and share a personal PDF with a route map.',
      ),
      fields: [
        field('issuer', 'Organizer', 'text', false),
        field('date', 'Start date', 'date'),
        field('return_date', 'End date', 'date', false),
        field('location', 'Destination', 'text', false),
        field('description', 'Travel program', 'textarea', false),
        field('contact', 'Contacts', 'text', false),
      ],
    },
  };
}
