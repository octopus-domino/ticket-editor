import type { Slide, DataRoot, CanvasElement } from '@/shared/types';
import { uid, makeText, makePh, makeLine, makeFooter } from '../helpers';
import type { TemplateBundle } from './types';

function slide(): Slide {
  const elements: CanvasElement[] = [
    makeText({ x: 440, y: 60, width: 280, height: 24, text: 'В Дирекцию', fontSize: 12, fill: '#666', align: 'right' }),
    makePh({
      x: 440, y: 82, width: 280, height: 24,
      fieldPath: 'org.name', fieldType: 'string', sample: 'ООО «Пример»',
      fontSize: 12, align: 'right', fontStyle: 'bold',
    }),
    makePh({
      x: 440, y: 104, width: 280, height: 24,
      fieldPath: 'applicant.fio', fieldType: 'string', sample: 'Иванов Иван Иванович',
      fontSize: 12, align: 'right',
    }),
    makePh({
      x: 440, y: 126, width: 280, height: 24,
      fieldPath: 'applicant.address', fieldType: 'string', sample: 'г. Москва, ул. Пушкина, д. 1, кв. 1',
      fontSize: 12, align: 'right', fill: '#666',
    }),
    makePh({
      x: 440, y: 148, width: 280, height: 24,
      fieldPath: 'applicant.phone', fieldType: 'string', sample: '+7 (999) 123-45-67',
      fontSize: 12, align: 'right', fill: '#666',
    }),

    makeText({ x: 200, y: 220, width: 400, height: 40, text: 'ЗАЯВЛЕНИЕ',
      fontSize: 22, fontStyle: 'bold', align: 'center' }),

    makeText({
      x: 80, y: 300, width: 640, height: 300,
      text: 'Прошу предоставить копию договора в связи с личной необходимостью.\n\nВсе необходимые документы прилагаю. Ответ прошу направить по адресу: г. Москва, ул. Пушкина, д. 1, кв. 1.\n\nО себе сообщаю: гражданство Российская Федерация, паспорт 45 12 № 345678.',
      fontSize: 14, lineHeight: 1.7, align: 'justify',
    }),

    makePh({
      x: 80, y: 700, width: 300, height: 30,
      fieldPath: 'request.date', fieldType: 'date', sample: 'Дата: 15.03.2026',
      fontSize: 14,
    }),
    makeText({ x: 500, y: 700, width: 220, height: 30, text: 'Подпись: _______', fontSize: 14 }),

    makeLine({ x: 80, y: 760, width: 640, height: 1, points: [0, 0, 640, 0], stroke: '#333', strokeWidth: 1 }),

    makeText({ x: 80, y: 780, width: 640, height: 40, text: 'Отметка о приёме документов: _______________________',
      fontSize: 12, fill: '#666' }),

    makeFooter({ text: 'документ сгенерирован автоматически' }),
  ];
  return {
    id: uid(), name: 'Заявление',
    format: 'a4', orientation: 'portrait',
    width: 794, height: 1123, background: '#ffffff',
    padding: { top: 20, right: 20, bottom: 20, left: 20 },
    elements,
  };
}

function data(): DataRoot[] {
  return [
    {
      id: uid(), name: 'applicant',
      fields: [
        { id: uid(), name: 'fio', type: 'string', sample: 'Иванов Иван Иванович' },
        { id: uid(), name: 'address', type: 'string', sample: 'г. Москва, ул. Пушкина, д. 1, кв. 1' },
        { id: uid(), name: 'phone', type: 'string', sample: '+7 (999) 123-45-67' },
        { id: uid(), name: 'citizenship', type: 'string', sample: 'Российская Федерация' },
        { id: uid(), name: 'passport', type: 'string', sample: '45 12 № 345678, выдан ОВД Хамовники' },
      ],
    },
    {
      id: uid(), name: 'org',
      fields: [{ id: uid(), name: 'name', type: 'string', sample: 'ООО «Пример»' }],
    },
    {
      id: uid(), name: 'request',
      fields: [
        { id: uid(), name: 'action', type: 'string', sample: 'предоставить копию договора' },
        { id: uid(), name: 'reason', type: 'string', sample: 'личной необходимостью' },
        { id: uid(), name: 'date', type: 'date', sample: 'Дата: 15.03.2026' },
      ],
    },
  ];
}

export const applicationBundle: TemplateBundle = {
  id: 'application',
  name: 'Заявление физлица',
  icon: '📄',
  description: 'Стандартное заявление на А4',
  build: () => ({ slide: slide(), data: data() }),
};