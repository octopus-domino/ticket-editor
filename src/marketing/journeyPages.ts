import { t } from '@/shared/i18n';

/** Public discovery content; independent from editor and publication state. */
export const JOURNEY_PAGES = [
  {
    path: '/solutions/',
    label: t('Ready-to-use services'),
    heading: t('From an idea to a page, PDF and QR'),
    description: t(
      'Choose an invitation, certificates or a QR menu. Fill in a form and get a page, PDF and a link to share.',
    ),
    action: '/sites/new',
    actionLabel: t('Create a website'),
    kind: 'hub',
  },
  {
    path: '/invitations-online/',
    label: t('Invitations with RSVP'),
    heading: t('Invite your guests. Collect their replies.'),
    description: t(
      'Create an invitation for a birthday, wedding or celebration. Share one link, offer a printable PDF and see who is coming.',
    ),
    action: '/start/invite',
    actionLabel: t('Create an invitation'),
    kind: 'invite',
  },
  {
    path: '/certificates-with-qr/',
    label: t('Certificates with QR'),
    heading: t('Personal certificates. One simple release.'),
    description: t(
      'Paste participant names, prepare personal certificates and share PDF links. Each QR opens the publication record.',
    ),
    action: '/start/certificates',
    actionLabel: t('Create certificates'),
    kind: 'certificates',
  },
  {
    path: '/qr-menu/',
    label: t('QR menu'),
    heading: t('New prices. The same QR on the table.'),
    description: t(
      'Add dishes and prices, publish your menu and print its QR. Update the menu through your management link without replacing the QR.',
    ),
    action: '/start/menu',
    actionLabel: t('Create a QR menu'),
    kind: 'menu',
  },
  {
    path: '/website-builder/',
    label: t('Website builder'),
    heading: t('Your own service. Without a separate website project.'),
    description: t(
      'Choose a ready workflow, customize the form and design, and publish a website at your own CoDoc address. PDF, QR and sharing are included.',
    ),
    action: '/sites/new',
    actionLabel: t('Open the website builder'),
    kind: 'builder',
  },
  {
    path: '/commercial-proposal/',
    label: t('Commercial proposals'),
    heading: t('From Excel to a proposal ready to share.'),
    description: t(
      'Import products and prices, check totals and share a proposal. Long tables continue on new PDF pages with repeated headings.',
    ),
    action: '/start/proposals',
    actionLabel: t('Create a proposal'),
    kind: 'proposals',
  },
  {
    path: '/tickets-with-qr/',
    label: t('Tickets with entry checks'),
    heading: t('Tickets with entry checks'),
    description: t(
      'Issue personal tickets and confirm entry once in the private release registry.',
    ),
    action: '/start/tickets',
    actionLabel: t('Fill in the form'),
    kind: 'tickets',
  },
  {
    path: '/gift-certificates/',
    label: t('Gift certificates'),
    heading: t('Gift certificates'),
    description: t('Create gift certificates with a value, expiry date and one-time redemption.'),
    action: '/start/gifts',
    actionLabel: t('Fill in the form'),
    kind: 'gifts',
  },
  {
    path: '/conference-badges/',
    label: t('Conference badges'),
    heading: t('Conference badges'),
    description: t('Print six personal badges per A4 sheet and share contact cards by QR.'),
    action: '/start/badges',
    actionLabel: t('Fill in the form'),
    kind: 'badges',
  },
  {
    path: '/access-passes/',
    label: t('Access passes'),
    heading: t('Access passes'),
    description: t('Issue passes, check their validity by QR, renew them or revoke access.'),
    action: '/start/passes',
    actionLabel: t('Fill in the form'),
    kind: 'passes',
  },
  {
    path: '/resume-online/',
    label: t('Resume with a stable link'),
    heading: t('Resume with a stable link'),
    description: t(
      'Publish your experience and portfolio, download a PDF and update the same link.',
    ),
    action: '/start/resume',
    actionLabel: t('Fill in the form'),
    kind: 'resume',
  },
  {
    path: '/shared-schedule/',
    label: t('Shared schedules'),
    heading: t('Shared schedules'),
    description: t('Share your group schedule, update it in place and download calendar events.'),
    action: '/start/schedule',
    actionLabel: t('Fill in the form'),
    kind: 'schedule',
  },
  {
    path: '/personal-greetings/',
    label: t('Personal greeting cards'),
    heading: t('Personal greeting cards'),
    description: t(
      'Write a greeting, add names and share personal cards as links or printable PDFs.',
    ),
    action: '/start/greetings',
    actionLabel: t('Fill in the form'),
    kind: 'greetings',
  },
] as const;

export const JOURNEY_STEPS = [
  [t('Fill in the form'), t('Add your event, participant names or dishes and prices.')],
  [t('Check the result'), t('Choose a design and preview the page before publishing.')],
  [t('Publish and share'), t('Get a PDF, a public link and a private link for updates.')],
];
export const JOURNEY_FAQ = [
  [
    t('Can I update a published page?'),
    t('Yes. Use the private management link. Your public link and QR stay the same.'),
  ],
  [
    t('Who can see the page?'),
    t(
      'Anyone with its public link. Keep the management link private; it allows changes and withdrawal.',
    ),
  ],
  [
    t('Does a QR certify the issuer?'),
    t(
      'A certificate QR confirms its publication record in CoDoc. It does not certify the organization or its qualifications.',
    ),
  ],
];
