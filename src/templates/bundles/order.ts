import type { Slide, DataRoot, CanvasElement } from '@/shared/types';
import { uid, makeText, makeShape, makePh, makeTable, makeFooter } from '../helpers';
import type { TemplateBundle } from './types';

function slide(): Slide {
  const elements: CanvasElement[] = [
    makeShape({ x: 0, y: 0, width: 794, height: 90, fill: '#1e293b', radius: 0 }),
    makePh({
      x: 40, y: 26, width: 400, height: 40,
      fieldPath: 'company.name', fieldType: 'string', sample: 'ООО «Ромашка»',
      fontSize: 24, fontStyle: 'bold', fill: '#ffffff',
    }),
    makePh({
      x: 500, y: 32, width: 254, height: 30,
      fieldPath: 'company.phone', fieldType: 'string', sample: 'Тел.: +7 (495) 123-45-67',
      fontSize: 12, fill: '#cbd5e1', align: 'right',
    }),

    makeText({ x: 40, y: 130, width: 400, height: 40, text: 'БЛАНК ЗАКАЗА', fontSize: 22, fontStyle: 'bold' }),
    makePh({
      x: 40, y: 175, width: 400, height: 24,
      fieldPath: 'order.number', fieldType: 'string', sample: '№ ORD-2026-0123 от 15.03.2026',
      fontSize: 13, fill: '#666',
    }),

    makeShape({ x: 40, y: 220, width: 714, height: 90, fill: '#f8fafc', radius: 8 }),
    makeText({ x: 60, y: 235, width: 200, height: 20, text: 'ЗАКАЗЧИК', fontSize: 11, fill: '#888' }),
    makePh({
      x: 60, y: 258, width: 660, height: 24,
      fieldPath: 'customer.fio', fieldType: 'string', sample: 'Иванов Иван Иванович',
      fontSize: 16, fontStyle: 'bold',
    }),
    makePh({
      x: 60, y: 284, width: 660, height: 20,
      fieldPath: 'customer.phone', fieldType: 'string',
      sample: 'Телефон: +7 (999) 123-45-67    Email: ivanov@example.com',
      fontSize: 12, fill: '#666',
    }),

    makeText({ x: 40, y: 340, width: 400, height: 24, text: 'СОСТАВ ЗАКАЗА', fontSize: 13, fontStyle: 'bold' }),

    makeTable({
      x: 40, y: 370, width: 714, height: 240,
      rows: 6, cols: 4,
      data: [
        ['№', 'Наименование', 'Кол-во', 'Сумма'],
        ['1', '{{order.items[0].name}}', '{{order.items[0].qty}}', '{{order.items[0].price}}'],
        ['2', '{{order.items[1].name}}', '{{order.items[1].qty}}', '{{order.items[1].price}}'],
        ['3', '{{order.items[2].name}}', '{{order.items[2].qty}}', '{{order.items[2].price}}'],
        ['', '', '', ''],
        ['', '', 'Итого:', '{{order.total}}'],
      ],
      borderColor: '#cbd5e1', headerBg: '#e2e8f0', fontSize: 13,
    }),

    makeText({ x: 40, y: 640, width: 400, height: 24, text: 'УСЛОВИЯ ОПЛАТЫ', fontSize: 13, fontStyle: 'bold' }),
    makePh({
      x: 40, y: 670, width: 714, height: 60,
      fieldPath: 'order.paymentTerm', fieldType: 'string',
      sample: 'Оплата производится в течение 5 банковских дней с момента выставления счёта. Способ оплаты: безналичный расчёт.',
      fontSize: 12, lineHeight: 1.6,
    }),

    makeText({ x: 40, y: 780, width: 300, height: 24, text: 'Менеджер: _____________', fontSize: 13 }),
    makeText({ x: 400, y: 780, width: 354, height: 24, text: 'Заказчик: _____________', fontSize: 13 }),

    makeFooter({ y: 1060, height: 40, text: 'ООО «Ромашка» · г. Москва, ул. Ленина, 5' }),
  ];
  return {
    id: uid(), name: 'Бланк заказа',
    format: 'a4', orientation: 'portrait',
    width: 794, height: 1123, background: '#ffffff',
    padding: { top: 20, right: 20, bottom: 20, left: 20 },
    elements,
  };
}

function data(): DataRoot[] {
  return [
    {
      id: uid(), name: 'company',
      fields: [
        { id: uid(), name: 'name', type: 'string', sample: 'ООО «Ромашка»' },
        { id: uid(), name: 'phone', type: 'string', sample: 'Тел.: +7 (495) 123-45-67' },
        { id: uid(), name: 'address', type: 'string', sample: 'г. Москва, ул. Ленина, 5' },
      ],
    },
    {
      id: uid(), name: 'customer',
      fields: [
        { id: uid(), name: 'fio', type: 'string', sample: 'Иванов Иван Иванович' },
        { id: uid(), name: 'phone', type: 'string', sample: 'Телефон: +7 (999) 123-45-67    Email: ivanov@example.com' },
      ],
    },
    {
      id: uid(), name: 'order',
      fields: [
        { id: uid(), name: 'number', type: 'string', sample: '№ ORD-2026-0123 от 15.03.2026' },
        { id: uid(), name: 'date', type: 'date', sample: '15.03.2026' },
        { id: uid(), name: 'total', type: 'string', sample: '23 450 ₽' },
        { id: uid(), name: 'paymentTerm', type: 'string', sample: '5' },
        { id: uid(), name: 'paymentMethod', type: 'string', sample: 'безналичный расчёт' },
        {
          id: uid(), name: 'items', type: 'array', sample: '', sampleCount: 3,
          children: [
            { id: uid(), name: 'name', type: 'string', sample: 'Товар' },
            { id: uid(), name: 'qty', type: 'number', sample: '1' },
            { id: uid(), name: 'price', type: 'number', sample: '1 000 ₽' },
          ],
        },
      ],
    },
  ];
}

export const orderBundle: TemplateBundle = {
  id: 'order',
  name: 'Бланк заказа',
  icon: '🧾',
  description: 'Бланк заказа с таблицей позиций',
  build: () => ({ slide: slide(), data: data() }),
};