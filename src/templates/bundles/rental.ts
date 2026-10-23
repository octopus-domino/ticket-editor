import type { Slide, DataRoot, CanvasElement } from '@/shared/types';
import { uid, makeText, makePh, makeFooter } from '../helpers';
import type { TemplateBundle } from './types';

function slide(): Slide {
  const elements: CanvasElement[] = [
    makeText({ x: 80, y: 60, width: 640, height: 40,
      text: 'ДОГОВОР НАЙМА ЖИЛОГО ПОМЕЩЕНИЯ',
      fontSize: 20, fontStyle: 'bold', align: 'center' }),

    makePh({
      x: 80, y: 120, width: 640, height: 24,
      fieldPath: 'contract.city', fieldType: 'string', sample: 'г. Москва',
      fontSize: 13,
    }),
    makePh({
      x: 500, y: 120, width: 220, height: 24,
      fieldPath: 'contract.date', fieldType: 'date', sample: '01.03.2026',
      fontSize: 13, align: 'right',
    }),

    makePh({
      x: 80, y: 180, width: 640, height: 40,
      fieldPath: 'landlord.fio', fieldType: 'string', sample: 'Петров Пётр Петрович',
      fontSize: 13, lineHeight: 1.5,
    }),

    makePh({
      x: 80, y: 230, width: 640, height: 40,
      fieldPath: 'tenant.fio', fieldType: 'string', sample: 'Иванов Иван Иванович',
      fontSize: 13, lineHeight: 1.5,
    }),

    makeText({ x: 80, y: 300, width: 640, height: 24, text: '1. ПРЕДМЕТ ДОГОВОРА', fontSize: 14, fontStyle: 'bold' }),

    makePh({
      x: 80, y: 330, width: 640, height: 60,
      fieldPath: 'property.address', fieldType: 'string', sample: 'г. Москва, ул. Тверская, д. 10, кв. 25',
      fontSize: 13, lineHeight: 1.5,
    }),

    makeText({ x: 80, y: 410, width: 640, height: 24, text: '2. СРОК ДОГОВОРА', fontSize: 14, fontStyle: 'bold' }),

    makePh({
      x: 80, y: 440, width: 640, height: 30,
      fieldPath: 'contract.startDate', fieldType: 'date', sample: 'с 01.04.2026',
      fontSize: 13,
    }),

    makeText({ x: 80, y: 500, width: 640, height: 24, text: '3. ПЛАТА ЗА НАЙМ', fontSize: 14, fontStyle: 'bold' }),

    makePh({
      x: 80, y: 530, width: 640, height: 30,
      fieldPath: 'contract.price', fieldType: 'number', sample: '75 000',
      fontSize: 13,
    }),

    makeText({ x: 80, y: 640, width: 640, height: 24, text: '4. ПОДПИСИ СТОРОН', fontSize: 14, fontStyle: 'bold' }),

    makeText({ x: 80, y: 680, width: 300, height: 24, text: 'Наймодатель:', fontSize: 13, fontStyle: 'bold' }),
    makePh({
      x: 80, y: 710, width: 300, height: 24,
      fieldPath: 'landlord.fio', fieldType: 'string', sample: 'Петров Пётр Петрович',
      fontSize: 13,
    }),
    makeText({ x: 80, y: 740, width: 300, height: 24, text: 'Подпись: _______', fontSize: 13 }),

    makeText({ x: 420, y: 680, width: 300, height: 24, text: 'Наниматель:', fontSize: 13, fontStyle: 'bold' }),
    makePh({
      x: 420, y: 710, width: 300, height: 24,
      fieldPath: 'tenant.fio', fieldType: 'string', sample: 'Иванов Иван Иванович',
      fontSize: 13,
    }),
    makeText({ x: 420, y: 740, width: 300, height: 24, text: 'Подпись: _______', fontSize: 13 }),

    makeFooter({ text: 'Договор составлен в двух экземплярах' }),
  ];
  return {
    id: uid(), name: 'Договор найма',
    format: 'a4', orientation: 'portrait',
    width: 794, height: 1123, background: '#ffffff',
    padding: { top: 20, right: 20, bottom: 20, left: 20 },
    elements,
  };
}

function data(): DataRoot[] {
  return [
    {
      id: uid(), name: 'contract',
      fields: [
        { id: uid(), name: 'city', type: 'string', sample: 'г. Москва' },
        { id: uid(), name: 'date', type: 'date', sample: '01.03.2026' },
        { id: uid(), name: 'startDate', type: 'date', sample: 'с 01.04.2026' },
        { id: uid(), name: 'endDate', type: 'date', sample: 'по 31.03.2027' },
        { id: uid(), name: 'price', type: 'number', sample: '75 000' },
        { id: uid(), name: 'paymentDay', type: 'string', sample: '5' },
      ],
    },
    {
      id: uid(), name: 'property',
      fields: [
        { id: uid(), name: 'address', type: 'string', sample: 'г. Москва, ул. Тверская, д. 10, кв. 25' },
        { id: uid(), name: 'area', type: 'number', sample: '58' },
      ],
    },
    {
      id: uid(), name: 'landlord',
      fields: [{ id: uid(), name: 'fio', type: 'string', sample: 'Петров Пётр Петрович' }],
    },
    {
      id: uid(), name: 'tenant',
      fields: [{ id: uid(), name: 'fio', type: 'string', sample: 'Иванов Иван Иванович' }],
    },
  ];
}

export const rentalBundle: TemplateBundle = {
  id: 'rental',
  name: 'Договор найма',
  icon: '🏠',
  description: 'Договор найма жилого помещения',
  build: () => ({ slide: slide(), data: data() }),
};