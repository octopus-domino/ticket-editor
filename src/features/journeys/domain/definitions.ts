import { t } from '@/shared/i18n';
export type JourneyKind =
  | 'INVITATION'
  | 'CERTIFICATE'
  | 'MENU'
  | 'PROPOSAL'
  | 'TICKET'
  | 'GIFT'
  | 'BADGE'
  | 'PASS'
  | 'RESUME'
  | 'SCHEDULE'
  | 'GREETING';
export interface JourneyField {
  name: string;
  label: string;
  type: 'text' | 'textarea' | 'date' | 'time';
  required: boolean;
}
export interface JourneyDefinition {
  slug: string;
  kind: JourneyKind;
  title: string;
  description: string;
  theme: 'sage' | 'rose' | 'ink';
  fields: JourneyField[];
}
export interface JourneyDocument {
  id: string;
  kind: JourneyKind;
  title: string;
  data: Record<string, string>;
  updatedAt: string;
}
export interface CreatedJourney {
  document: JourneyDocument;
  managementKey: string;
  batchId?: string;
}
export interface JourneyStatus {
  state: 'ACTIVE' | 'USED' | 'EXPIRED' | 'REVOKED';
  usedAt: string | null;
  validUntil: string;
  consumable: boolean;
}
export interface JourneyBatch {
  id: string;
  title: string;
  documents: { document: JourneyDocument; status: JourneyStatus }[];
}
export const JOURNEY_CAPABILITIES: Record<JourneyKind, { label: string; batch: boolean }> = {
  INVITATION: { label: t('Приглашение + RSVP'), batch: false },
  CERTIFICATE: { label: t('Сертификат + проверка'), batch: true },
  MENU: { label: t('QR-меню'), batch: false },
  PROPOSAL: { label: t('Коммерческое предложение'), batch: false },
  TICKET: { label: t('Билеты с проверкой входа'), batch: true },
  GIFT: { label: t('Подарочные сертификаты'), batch: true },
  BADGE: { label: t('Бейджи для мероприятия'), batch: true },
  PASS: { label: t('Пропуска'), batch: true },
  RESUME: { label: t('Резюме'), batch: false },
  SCHEDULE: { label: t('Расписание'), batch: false },
  GREETING: { label: t('Именные открытки'), batch: true },
};
export interface GuestReply {
  name: string;
  attending: boolean;
  updatedAt: string;
}
const field = (
  name: string,
  label: string,
  type: JourneyField['type'] = 'text',
  required = true,
): JourneyField => ({ name, label, type, required });
export const JOURNEYS: Record<string, JourneyDefinition> = {
  tickets: {
    slug: 'tickets',
    kind: 'TICKET',
    title: t('Именные билеты. Быстрая проверка на входе.'),
    description: t(
      'Выпустите билеты, отправьте ссылки гостям и отмечайте проход в реестре. Повторно использовать билет нельзя.',
    ),
    theme: 'ink',
    fields: [
      field('description', t('Мероприятие'), 'textarea'),
      field('date', t('Дата мероприятия'), 'date'),
      field('time', t('Время начала'), 'time'),
      field('location', t('Место')),
      field('valid_until', t('Действует по'), 'date'),
    ],
  },
  gifts: {
    slug: 'gifts',
    kind: 'GIFT',
    title: t('Подарок, который легко подарить и проверить.'),
    description: t(
      'Укажите номинал и получателей. Отправьте сертификаты, проверьте код и подтвердите погашение один раз.',
    ),
    theme: 'rose',
    fields: [
      field('issuer', t('Кто выдаёт')),
      field('amount', t('Номинал')),
      field('description', t('Что входит в подарок'), 'textarea'),
      field('valid_until', t('Действует по'), 'date'),
      field('contact', t('Как воспользоваться')),
    ],
  },
  badges: {
    slug: 'badges',
    kind: 'BADGE',
    title: t('Бейджи для всех участников — на одном листе.'),
    description: t(
      'Добавьте имена, скачайте PDF с сеткой A4 и распечатайте. QR открывает карточку участника с контактом для сохранения.',
    ),
    theme: 'ink',
    fields: [
      field('issuer', t('Организация')),
      field('role', t('Должность или роль'), 'text', false),
      field('phone', t('Телефон для контакта'), 'text', false),
      field('email', t('Email для контакта'), 'text', false),
    ],
  },
  passes: {
    slug: 'passes',
    kind: 'PASS',
    title: t('Пропуска с понятным сроком действия.'),
    description: t(
      'Выдайте пропуск и отправьте его владельцу. Проверяющий увидит статус по QR; срок можно продлить, пропуск — отозвать.',
    ),
    theme: 'sage',
    fields: [
      field('issuer', t('Кто выдаёт')),
      field('vehicle', t('Автомобиль или объект доступа')),
      field('valid_until', t('Действует по'), 'date'),
      field('contact', t('Контакт администратора'), 'text', false),
    ],
  },
  resume: {
    slug: 'resume',
    kind: 'RESUME',
    title: t('Ваше резюме. Всегда актуальное по одной ссылке.'),
    description: t(
      'Расскажите об опыте, добавьте портфолио и контакты. Отправляйте ссылку или PDF и обновляйте резюме без повторной рассылки.',
    ),
    theme: 'ink',
    fields: [
      field('recipient', t('Ваше имя')),
      field('role', t('Желаемая должность')),
      field('description', t('Опыт, навыки и образование'), 'textarea'),
      field('portfolio', t('Ссылка на портфолио'), 'text', false),
      field('contact', t('Как с вами связаться')),
    ],
  },
  schedule: {
    slug: 'schedule',
    kind: 'SCHEDULE',
    title: t('Расписание по ссылке. Изменения видят все.'),
    description: t(
      'Добавьте занятия и отправьте ссылку группе. Расписание можно скачать в календарь и обновлять по прежнему адресу.',
    ),
    theme: 'sage',
    fields: [
      field('issuer', t('Группа или организация')),
      field('timezone', t('Часовой пояс (например Europe/Moscow)')),
      field('contact', t('Контакт'), 'text', false),
    ],
  },
  greetings: {
    slug: 'greetings',
    kind: 'GREETING',
    title: t('Личное поздравление для каждого.'),
    description: t(
      'Напишите поздравление, добавьте имена и получите персональные открытки. Отправьте ссылки или скачайте PDF для печати.',
    ),
    theme: 'rose',
    fields: [
      field('issuer', t('От кого')),
      field('description', t('Ваше поздравление'), 'textarea'),
    ],
  },
  proposals: {
    slug: 'proposals',
    kind: 'PROPOSAL',
    title: t('Коммерческое предложение из Excel — готовое к отправке.'),
    description: t(
      'Загрузите позиции, проверьте колонки и итог. Получите PDF с переносом таблицы на следующие страницы и ссылку для клиента.',
    ),
    theme: 'ink',
    fields: [
      field('issuer', t('Ваша компания')),
      field('recipient', t('Кому адресовано')),
      field('description', t('Условия: сроки, доставка, оплата, НДС'), 'textarea', false),
      field('currency', t('Валюта (например RUB)')),
      field('contact', t('Как заказать или связаться')),
    ],
  },
  invite: {
    slug: 'invite',
    kind: 'INVITATION',
    title: t('Красивое приглашение. И гости, которые точно придут.'),
    description: t(
      'Расскажите о событии, отправьте одну ссылку и собирайте ответы гостей. PDF уже включён.',
    ),
    theme: 'rose',
    fields: [
      field('description', t('Повод и приглашение'), 'textarea'),
      field('date', t('Дата'), 'date'),
      field('time', t('Время'), 'time'),
      field('location', t('Место')),
      field('contact', t('Как с вами связаться'), 'text', false),
    ],
  },
  certificates: {
    slug: 'certificates',
    kind: 'CERTIFICATE',
    title: t('Не просто сертификат. Подтверждение достижения.'),
    description: t(
      'Вставьте имена участников — получите персональные PDF и проверку каждого сертификата по QR.',
    ),
    theme: 'ink',
    fields: [
      field('issuer', t('Кто выдаёт сертификат')),
      field('description', t('За что выдан'), 'textarea'),
      field('date', t('Дата выдачи'), 'date'),
    ],
  },
  menu: {
    slug: 'menu',
    kind: 'MENU',
    title: t('Одно QR-меню. Всегда актуальные цены.'),
    description: t(
      'Добавьте блюда и цены. Обновляйте меню по той же ссылке — QR на столике останется прежним.',
    ),
    theme: 'sage',
    fields: [
      field('items', t('Блюда и цены — каждое с новой строки'), 'textarea'),
      field('location', t('Адрес'), 'text', false),
      field('contact', t('Телефон или контакты'), 'text', false),
    ],
  },
};
export function defaultJourney(hostname: string): string | null {
  const prefix = hostname.split('.')[0];
  return Object.hasOwn(JOURNEYS, prefix) ? prefix : null;
}
