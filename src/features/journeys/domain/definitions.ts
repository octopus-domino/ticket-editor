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
export function journeyPresets(translate: typeof t = t): Record<string, JourneyDefinition> {
  return {
    tickets: {
      slug: 'tickets',
      kind: 'TICKET',
      title: translate('Именные билеты. Быстрая проверка на входе.'),
      description: translate(
        'Выпустите билеты, отправьте ссылки гостям и отмечайте проход в реестре. Повторно использовать билет нельзя.',
      ),
      theme: 'ink',
      fields: [
        field('description', translate('Мероприятие'), 'textarea'),
        field('date', translate('Дата мероприятия'), 'date'),
        field('time', translate('Время начала'), 'time'),
        field('location', translate('Место')),
        field('valid_until', translate('Действует по'), 'date'),
      ],
    },
    gifts: {
      slug: 'gifts',
      kind: 'GIFT',
      title: translate('Подарок, который легко подарить и проверить.'),
      description: translate(
        'Укажите номинал и получателей. Отправьте сертификаты, проверьте код и подтвердите погашение один раз.',
      ),
      theme: 'rose',
      fields: [
        field('issuer', translate('Кто выдаёт')),
        field('amount', translate('Номинал')),
        field('description', translate('Что входит в подарок'), 'textarea'),
        field('valid_until', translate('Действует по'), 'date'),
        field('contact', translate('Как воспользоваться')),
      ],
    },
    badges: {
      slug: 'badges',
      kind: 'BADGE',
      title: translate('Бейджи для всех участников — на одном листе.'),
      description: translate(
        'Добавьте имена, скачайте PDF с сеткой A4 и распечатайте. QR открывает карточку участника с контактом для сохранения.',
      ),
      theme: 'ink',
      fields: [
        field('issuer', translate('Организация')),
        field('role', translate('Должность или роль'), 'text', false),
        field('phone', translate('Телефон для контакта'), 'text', false),
        field('email', translate('Email для контакта'), 'text', false),
      ],
    },
    passes: {
      slug: 'passes',
      kind: 'PASS',
      title: translate('Пропуска с понятным сроком действия.'),
      description: translate(
        'Выдайте пропуск и отправьте его владельцу. Проверяющий увидит статус по QR; срок можно продлить, пропуск — отозвать.',
      ),
      theme: 'sage',
      fields: [
        field('issuer', translate('Кто выдаёт')),
        field('vehicle', translate('Автомобиль или объект доступа')),
        field('valid_until', translate('Действует по'), 'date'),
        field('contact', translate('Контакт администратора'), 'text', false),
      ],
    },
    resume: {
      slug: 'resume',
      kind: 'RESUME',
      title: translate('Ваше резюме. Всегда актуальное по одной ссылке.'),
      description: translate(
        'Расскажите об опыте, добавьте портфолио и контакты. Отправляйте ссылку или PDF и обновляйте резюме без повторной рассылки.',
      ),
      theme: 'ink',
      fields: [
        field('recipient', translate('Ваше имя')),
        field('role', translate('Желаемая должность')),
        field('description', translate('Опыт, навыки и образование'), 'textarea'),
        field('portfolio', translate('Ссылка на портфолио'), 'text', false),
        field('contact', translate('Как с вами связаться')),
      ],
    },
    schedule: {
      slug: 'schedule',
      kind: 'SCHEDULE',
      title: translate('Расписание по ссылке. Изменения видят все.'),
      description: translate(
        'Добавьте занятия и отправьте ссылку группе. Расписание можно скачать в календарь и обновлять по прежнему адресу.',
      ),
      theme: 'sage',
      fields: [
        field('issuer', translate('Группа или организация')),
        field('timezone', translate('Часовой пояс (например Europe/Moscow)')),
        field('contact', translate('Контакт'), 'text', false),
      ],
    },
    greetings: {
      slug: 'greetings',
      kind: 'GREETING',
      title: translate('Личное поздравление для каждого.'),
      description: translate(
        'Напишите поздравление, добавьте имена и получите персональные открытки. Отправьте ссылки или скачайте PDF для печати.',
      ),
      theme: 'rose',
      fields: [
        field('issuer', translate('От кого')),
        field('description', translate('Ваше поздравление'), 'textarea'),
      ],
    },
    proposals: {
      slug: 'proposals',
      kind: 'PROPOSAL',
      title: translate('Коммерческое предложение из Excel — готовое к отправке.'),
      description: translate(
        'Загрузите позиции, проверьте колонки и итог. Получите PDF с переносом таблицы на следующие страницы и ссылку для клиента.',
      ),
      theme: 'ink',
      fields: [
        field('issuer', translate('Ваша компания')),
        field('recipient', translate('Кому адресовано')),
        field('description', translate('Условия: сроки, доставка, оплата, НДС'), 'textarea', false),
        field('currency', translate('Валюта (например RUB)')),
        field('contact', translate('Как заказать или связаться')),
      ],
    },
    invite: {
      slug: 'invite',
      kind: 'INVITATION',
      title: translate('Красивое приглашение. И гости, которые точно придут.'),
      description: translate(
        'Расскажите о событии, отправьте одну ссылку и собирайте ответы гостей. PDF уже включён.',
      ),
      theme: 'rose',
      fields: [
        field('description', translate('Повод и приглашение'), 'textarea'),
        field('date', translate('Дата'), 'date'),
        field('time', translate('Время'), 'time'),
        field('location', translate('Место')),
        field('contact', translate('Как с вами связаться'), 'text', false),
      ],
    },
    certificates: {
      slug: 'certificates',
      kind: 'CERTIFICATE',
      title: translate('Не просто сертификат. Подтверждение достижения.'),
      description: translate(
        'Вставьте имена участников — получите персональные PDF и проверку каждого сертификата по QR.',
      ),
      theme: 'ink',
      fields: [
        field('issuer', translate('Кто выдаёт сертификат')),
        field('description', translate('За что выдан'), 'textarea'),
        field('date', translate('Дата выдачи'), 'date'),
      ],
    },
    menu: {
      slug: 'menu',
      kind: 'MENU',
      title: translate('Одно QR-меню. Всегда актуальные цены.'),
      description: translate(
        'Добавьте блюда и цены. Обновляйте меню по той же ссылке — QR на столике останется прежним.',
      ),
      theme: 'sage',
      fields: [
        field('items', translate('Блюда и цены — каждое с новой строки'), 'textarea'),
        field('location', translate('Адрес'), 'text', false),
        field('contact', translate('Телефон или контакты'), 'text', false),
      ],
    },
  };
}
export const JOURNEYS = journeyPresets();
export function defaultJourney(hostname: string): string | null {
  const prefix = hostname.split('.')[0];
  return Object.hasOwn(JOURNEYS, prefix) ? prefix : null;
}
