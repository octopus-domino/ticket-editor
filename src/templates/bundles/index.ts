// src/templates/bundles/index.ts
import type { TemplateBundle } from './types';
import { theaterTicketBundle } from './theaterTicket';
import { applicationBundle } from './application';
import { rentalBundle } from './rental';
import { orderBundle } from './order';
import { yandexTicketBundle } from './yandexTicket';
import { catalogBundle } from './catalog';

export type { TemplateBundle } from './types';

export const BUNDLES: TemplateBundle[] = [
  theaterTicketBundle,
  applicationBundle,
  rentalBundle,
  orderBundle,
  yandexTicketBundle,
  catalogBundle,
];