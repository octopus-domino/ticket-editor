import type { Slide, DataRoot, CanvasElement } from '@/shared/types';
import { uid, makeText, makeShape, makePh, makeLine } from '../helpers';
import type { TemplateBundle } from './types';

/** Жёлтая диагональная полоса */
function yellowStripe(x: number, y: number, w: number, rotation: number) {
  return makeShape({
    x, y, width: w, height: 46,
    fill: '#FFDD00', stroke: 'transparent', strokeWidth: 0,
    rotation, radius: 0,
  });
}

function slide(): Slide {
  const W = 700;
  const H = 500;
  const INK = '#000000';
  const MUTED = '#555555';
  const FAINT = '#888888';
  const YELLOW = '#FFDD00';

  const barcode = Array.from({ length: 40 }).map((_, i) =>
    makeShape({
      x: 24 + i * 3.4, y: 452,
      width: i % 3 === 0 ? 2 : 1, height: 26,
      fill: INK, stroke: 'transparent', strokeWidth: 0,
    }),
  );

  const icons = Array.from({ length: 6 }).map((_, i) =>
    makeShape({
      x: 452 + i * 30, y: 296,
      width: 22, height: 22,
      fill: 'transparent', stroke: MUTED, strokeWidth: 1, radius: 11,
    }),
  );

  const elements: CanvasElement[] = [
    /* Фон: жёлтые диагонали */
    yellowStripe(-180, 220, 1100, -34),
    yellowStripe(-180, 120, 1100, 42),

    /* Логотип */
    makeShape({ x: 24, y: 22, width: 34, height: 34, fill: YELLOW, stroke: 'transparent', strokeWidth: 0, radius: 17 }),
    makeText({ x: 24, y: 30, width: 34, height: 20, text: 'Я', fontSize: 18, fontStyle: 'bold', align: 'center', fill: INK }),
    makeText({ x: 66, y: 30, width: 200, height: 20, text: 'Яндекс Афиша', fontSize: 15, fontStyle: 'bold', fill: INK }),

    /* Категория / возраст */
    makeText({ x: 24, y: 82, width: 40, height: 20, text: '6+', fontSize: 12, fontStyle: 'bold', fill: INK }),
    makeText({ x: 60, y: 82, width: 120, height: 20, text: 'КОНЦЕРТ', fontSize: 11, fill: MUTED }),

    /* Заголовок события */
    makePh({
      x: 24, y: 118, width: 400, height: 70,
      fieldPath: 'event.title', fieldType: 'string',
      sample: 'RADIO TAPOK. Санкт-Петербург',
      fontSize: 28, fontStyle: 'bold', lineHeight: 1.1, fill: INK,
    }),

    /* Дата и время */
    makePh({
      x: 24, y: 200, width: 400, height: 24,
      fieldPath: 'event.datetime', fieldType: 'string',
      sample: '11 ноября 2023, 20:00',
      fontSize: 16, fill: INK,
    }),

    /* Площадка */
    makePh({
      x: 24, y: 262, width: 400, height: 22,
      fieldPath: 'venue.name', fieldType: 'string',
      sample: 'MTC Live Холл',
      fontSize: 15, fontStyle: 'bold', fill: INK,
    }),
    makePh({
      x: 24, y: 286, width: 400, height: 20,
      fieldPath: 'venue.address', fieldType: 'string',
      sample: 'Приморский просп., 80, стр. 1',
      fontSize: 11, fill: FAINT,
    }),

    /* Сектор / ряд / место */
    makeText({ x: 24,  y: 332, width: 120, height: 16, text: 'СЕКТОР', fontSize: 9, fill: FAINT }),
    makePh({
      x: 24, y: 350, width: 150, height: 20,
      fieldPath: 'tickets.sector', fieldType: 'string', sample: 'Трибуна 101',
      fontSize: 13, fill: INK,
    }),
    makeText({ x: 220, y: 332, width: 60, height: 16, text: 'РЯД', fontSize: 9, fill: FAINT }),
    makePh({
      x: 220, y: 350, width: 60, height: 20,
      fieldPath: 'tickets.row', fieldType: 'string', sample: '8',
      fontSize: 13, fill: INK,
    }),
    makeText({ x: 300, y: 332, width: 60, height: 16, text: 'МЕСТО', fontSize: 9, fill: FAINT }),
    makePh({
      x: 300, y: 350, width: 60, height: 20,
      fieldPath: 'tickets.seat', fieldType: 'string', sample: '14',
      fontSize: 13, fill: INK,
    }),

    /* Заказ / дата / цена / серийный */
    makeText({ x: 24,  y: 398, width: 120, height: 14, text: 'НОМЕР ЗАКАЗА', fontSize: 8, fill: FAINT }),
    makePh({
      x: 24, y: 414, width: 120, height: 18,
      fieldPath: 'order.number', fieldType: 'string', sample: '21915751',
      fontSize: 12, fill: INK,
    }),

    makeText({ x: 155, y: 398, width: 120, height: 14, text: 'ДАТА ЗАКАЗА', fontSize: 8, fill: FAINT }),
    makePh({
      x: 155, y: 414, width: 120, height: 18,
      fieldPath: 'order.datetime', fieldType: 'string', sample: '19 августа, 17:23',
      fontSize: 12, fill: INK,
    }),

    makeText({ x: 290, y: 398, width: 100, height: 14, text: 'ЦЕНА', fontSize: 8, fill: FAINT }),
    makePh({
      x: 290, y: 414, width: 100, height: 18,
      fieldPath: 'order.price', fieldType: 'string', sample: '1500.00 ₽',
      fontSize: 12, fill: INK,
    }),

    makeText({ x: 400, y: 398, width: 120, height: 14, text: 'СЕРИЙНЫЙ НОМЕР БИЛЕТА', fontSize: 8, fill: FAINT }),
    makePh({
      x: 400, y: 414, width: 120, height: 18,
      fieldPath: 'order.serial', fieldType: 'string', sample: '50306281',
      fontSize: 12, fill: INK,
    }),

    /* Штрих-код */
    ...barcode,
    makePh({
      x: 24, y: 484, width: 220, height: 14,
      fieldPath: 'ticket.barcode', fieldType: 'string', sample: '74207410420',
      fontSize: 10, fill: MUTED,
    }),

    /* Правая колонка */
    makeLine({
      x: 430, y: 20, width: 1, height: H - 40,
      points: [0, 0, 0, H - 40],
      stroke: '#cccccc', strokeWidth: 1, dash: 'dashed',
    }),

    makeText({ x: 452, y: 24, width: 220, height: 20, text: 'Электронный билет', fontSize: 12, fill: MUTED }),

    /* QR-заглушка */
    makeShape({ x: 610, y: 20, width: 70, height: 70, fill: '#f5f5f5', stroke: INK, strokeWidth: 1 }),
    makeText({ x: 610, y: 42, width: 70, height: 24, text: 'QR', fontSize: 18, fontStyle: 'bold', align: 'center', fill: INK }),

    /* Как работает билет */
    makeText({ x: 452, y: 100, width: 260, height: 18, text: 'Как работает билет', fontSize: 12, fontStyle: 'bold', fill: INK }),
    makeText({
      x: 452, y: 120, width: 240, height: 60,
      text: 'По билету можно пройти только один раз, его нельзя копировать и передавать. Не выкладывайте билет в соцсети: другой человек может использовать штрихкод и пройти вместо вас.',
      fontSize: 10, fill: MUTED, lineHeight: 1.35,
    }),

    /* Как вернуть */
    makeText({ x: 452, y: 190, width: 260, height: 18, text: 'Как вернуть', fontSize: 12, fontStyle: 'bold', fill: INK }),
    makeText({
      x: 452, y: 210, width: 240, height: 40,
      text: 'Если событие отменили, заменяли или переносили — решение о возврате принимает организатор. Подробнее о возврате: yandex.ru/afisha/refund',
      fontSize: 10, fill: MUTED, lineHeight: 1.35,
    }),

    /* Если только спросить */
    makeText({ x: 452, y: 258, width: 260, height: 18, text: 'Если только спросить', fontSize: 12, fontStyle: 'bold', fill: INK }),
    makeText({
      x: 452, y: 278, width: 240, height: 30,
      text: 'Пишите на aht@yandex-team.ru или в чат поддержки. Если звоните, сообщите номер заказа: 8 800 600-90-90',
      fontSize: 10, fill: MUTED, lineHeight: 1.35,
    }),

    ...icons,

    /* Юридический блок */
    makeText({ x: 452, y: 336, width: 240, height: 18, text: 'Это юридический текст, без него никак', fontSize: 11, fontStyle: 'bold', fill: INK }),
    makeText({
      x: 452, y: 356, width: 240, height: 24,
      text: 'Билет утверждён приказом Министерства культуры РФ от 29 июня 2020 года № 702',
      fontSize: 9, fill: MUTED, lineHeight: 1.3,
    }),

    /* Реквизиты */
    makeText({
      x: 452, y: 408, width: 80, height: 70,
      text: 'Продавец\nООО «Афиша»\nИНН: 7704624281',
      fontSize: 8, fill: MUTED, lineHeight: 1.35,
    }),
    makeText({
      x: 540, y: 408, width: 80, height: 70,
      text: 'Организатор\nИП Иванов И.\nИНН: 502711347104',
      fontSize: 8, fill: MUTED, lineHeight: 1.35,
    }),
    makeText({
      x: 630, y: 408, width: 60, height: 70,
      text: 'Агент:\n+7 495 123-45-67',
      fontSize: 8, fill: MUTED, lineHeight: 1.35,
    }),
  ];

  return {
    id: uid(), name: 'Билет Яндекс.Афиша',
    format: 'custom', orientation: 'landscape',
    width: W, height: H, background: '#ffffff',
    padding: { top: 0, right: 0, bottom: 0, left: 0 },
    elements,
  };
}

function data(): DataRoot[] {
  return [
    {
      id: uid(), name: 'event',
      fields: [
        { id: uid(), name: 'title',    type: 'string', sample: 'RADIO TAPOK. Санкт-Петербург' },
        { id: uid(), name: 'subtitle', type: 'string', sample: 'Электронный билет' },
        { id: uid(), name: 'category', type: 'string', sample: 'КОНЦЕРТ' },
        { id: uid(), name: 'ageLimit', type: 'string', sample: '6+' },
        { id: uid(), name: 'datetime', type: 'string', sample: '11 ноября 2023, 20:00' },
      ],
    },
    {
      id: uid(), name: 'venue',
      fields: [
        { id: uid(), name: 'name',    type: 'string', sample: 'MTC Live Холл' },
        { id: uid(), name: 'address', type: 'string', sample: 'Приморский просп., 80, стр. 1' },
      ],
    },
    {
      id: uid(), name: 'tickets',
      fields: [
        { id: uid(), name: 'sector', type: 'string', sample: 'Трибуна 101' },
        { id: uid(), name: 'row',    type: 'string', sample: '8' },
        { id: uid(), name: 'seat',   type: 'string', sample: '14' },
      ],
    },
    {
      id: uid(), name: 'order',
      fields: [
        { id: uid(), name: 'number',   type: 'string', sample: '21915751' },
        { id: uid(), name: 'datetime', type: 'string', sample: '19 августа, 17:23' },
        { id: uid(), name: 'price',    type: 'string', sample: '1500.00 ₽' },
        { id: uid(), name: 'serial',   type: 'string', sample: '50306281' },
      ],
    },
    {
      id: uid(), name: 'ticket',
      fields: [
        { id: uid(), name: 'barcode', type: 'string', sample: '74207410420' },
      ],
    },
  ];
}

export const yandexTicketBundle: TemplateBundle = {
  id: 'yandex-ticket',
  name: 'Билет: RADIO TAPOK',
  icon: '🎫',
  description: 'Заполненный электронный билет Яндекс.Афиша',
  build: () => ({ slide: slide(), data: data() }),
};