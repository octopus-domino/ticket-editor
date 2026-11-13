import { t } from '@/shared/i18n';

/** These explain shipped workflows; they must not promise payments or automatic delivery. */
export function solutionBenefit(kind: string): string {
  const benefits: Record<string, string> = {
    business:t('For sales: import positions from Excel and check calculated totals. Clients receive one readable proposal with a PDF that handles long tables.'),
    courses:t('For courses and awards: issue personal certificates together. Recipients can print their PDF and open its publication record by QR.'),
    poetry: t('A little warmth for each day. Choose a language, age and mood; we will find real poems for seven personal cards.'),
    albums: t('Invite family and friends to add photos and handwritten captions. Keep one shared album and print it as a PDF.'),
    invite: t('For celebrations: collect guest replies in one registry. Guests get the date, venue and reply form through one link.'),
    certificates: t('For courses and awards: issue personal certificates together. Recipients can print their PDF and open its publication record by QR.'),
    menu: t('For cafes: change dishes and prices without reprinting the table QR. Visitors open the current menu on their phones.'),
    tickets: t('For events: track issued tickets and record entry once. Guests present their personal QR at the entrance.'),
    gifts: t('For gifts: track value, expiry and redemption in one place. The recipient gets a printable certificate with a code for one-time use.'),
    badges: t('For conferences: prepare names together and print six badges per A4 sheet. Participants can save contact details from the QR.'),
    passes: t('For access control: renew or revoke passes without replacing the public link. The checker can see current validity by QR.'),
    resume: t('For job seekers: update experience and portfolio at the same address. Recruiters can read the page or download the PDF.'),
    schedule: t('For classes and groups: keep one current timetable. Participants can download events to their calendars with times and durations.'),
    greetings: t('For personal messages: create named greeting cards from one form. Recipients can open their card by link or print it.'),
    cards: t('For networking: share contact details without manual retyping. People can scan the printed QR and save the contact card.'),
    labels: t('For products: prepare labels from a product list and print them on A4. Buyers can scan each product QR to open its page.'),
    'price-tags': t('For retail: keep prices and product information together. Buyers can leave ratings through the QR, and you can review their feedback.'),
    properties: t('For property viewings: collect a photo and key details on one page. Clients can keep the PDF or reopen the listing by QR.'),
    proposals: t('For sales: import positions from Excel and check calculated totals. Clients receive one readable proposal with a PDF that handles long tables.'),
    tours: t('For travel: combine stops, flights, transfers and notes. Companions get local arrival times and a printable map with roads and dashed flights.'),
    builder: t('For your own service: customize a ready form and publish it at your CoDoc address. Visitors fill in the form and receive the configured document.'),
  };
  return benefits[kind] ?? '';
}
