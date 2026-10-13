import type {
  Slide, DataRoot, TextElement, ShapeElement, PlaceholderElement,
  TableElement, LineElement, FooterElement, CanvasElement,
} from './types';

const uid = () => Math.random().toString(36).slice(2, 10);

function makeText(o: Partial<TextElement>): TextElement {
  const base: TextElement = {
    id: uid(), type: 'text', x: 0, y: 0, width: 200, height: 30, rotation: 0,
    text: '', fontSize: 14, fontFamily: 'Arial', fill: '#111',
    fontStyle: 'normal', textDecoration: '',
    align: 'left', verticalAlign: 'top', lineHeight: 1.2,
    padding: { top: 4, right: 4, bottom: 4, left: 4 },
    background: 'transparent',
  };
  return Object.assign({}, base, o);
}

function makeShape(o: Partial<ShapeElement>): ShapeElement {
  const base: ShapeElement = {
    id: uid(), type: 'shape', shape: 'rect',
    x: 0, y: 0, width: 100, height: 100, rotation: 0,
    fill: 'transparent', stroke: 'transparent', strokeWidth: 0,
    text: '', fontSize: 16, textFill: '#111', radius: 0,
  };
  return Object.assign({}, base, o);
}

function makePh(o: Partial<PlaceholderElement>): PlaceholderElement {
  const base: PlaceholderElement = {
    id: uid(), type: 'placeholder',
    x: 0, y: 0, width: 200, height: 30, rotation: 0,
    fieldPath: '', fieldType: 'string', sample: '', label: '',
    inline: true,
    fontSize: 14, fontFamily: 'Arial', fill: '#111',
    fontStyle: 'normal', textDecoration: '',
    align: 'left', verticalAlign: 'top', lineHeight: 1.2,
    padding: { top: 4, right: 4, bottom: 4, left: 4 },
    background: 'transparent',
  };
  return Object.assign({}, base, o);
}

function makeTable(o: Partial<TableElement>): TableElement {
  const base: TableElement = {
    id: uid(), type: 'table',
    x: 0, y: 0, width: 400, height: 120, rotation: 0,
    rows: 3, cols: 3,
    data: [['A', 'B', 'C'], ['', '', ''], ['', '', '']],
    borderColor: '#cbd5e1', headerBg: '#e2e8f0', fontSize: 13,
  };
  return Object.assign({}, base, o);
}

function makeLine(o: Partial<LineElement>): LineElement {
  const base: LineElement = {
    id: uid(), type: 'line',
    x: 0, y: 0, width: 300, height: 20, rotation: 0,
    points: [0, 10, 300, 10],
    stroke: '#1a1a1a', strokeWidth: 1, dash: 'solid', isArrow: false,
  };
  return Object.assign({}, base, o);
}

function makeFooter(o: Partial<FooterElement>): FooterElement {
  const base: FooterElement = {
    id: uid(), type: 'footer',
    x: 0, y: 1000, width: 794, height: 40, rotation: 0,
    text: 'ООО «Компания» · +7 (000) 000-00-00',
    fill: '#ffffff', bgColor: '#1e293b', fontSize: 12,
  };
  return Object.assign({}, base, o);
}

/* =========================================================
   1. БИЛЕТ В ТЕАТР
   ========================================================= */
function ticketSlide(): Slide {
  const W = 900;
  const H = 340;
  const elements: CanvasElement[] = [
    makeShape({ x: 0, y: 0, width: 240, height: H, fill: '#fc3f1d', radius: 0 }),
    makeText({ x: 24, y: 24, width: 200, height: 30, text: 'ЯНДЕКС', fontSize: 22, fill: '#ffffff', fontStyle: 'bold' }),
    makeText({ x: 24, y: 54, width: 200, height: 24, text: 'АФИША', fontSize: 18, fill: '#ffffff', fontStyle: 'bold', textDecoration: 'underline' }),
    makeText({ x: 24, y: 130, width: 200, height: 30, text: 'ПРЕМЬЕРА', fontSize: 20, fill: '#ffffff', fontStyle: 'bold' }),
    makeText({ x: 24, y: 156, width: 200, height: 24, text: '16+', fontSize: 14, fill: '#ffdddd' }),

    makePh({
      x: 24, y: 210, width: 200, height: 50,
      fieldPath: 'event.day', fieldType: 'string', sample: '15',
      fontSize: 44, fontStyle: 'bold', fill: '#ffffff',
    }),
    makePh({
      x: 24, y: 270, width: 200, height: 26,
      fieldPath: 'event.month', fieldType: 'string', sample: 'марта, сб · 19:00',
      fontSize: 15, fill: '#ffffff',
    }),

    makeLine({ x: 240, y: 20, width: 0, height: 300, points: [0, 0, 0, 300], stroke: '#fc3f1d', dash: 'dashed' }),

    makePh({
      x: 280, y: 40, width: 580, height: 80,
      fieldPath: 'event.title', fieldType: 'string', sample: 'ГАМЛЕТ',
      fontSize: 40, fontStyle: 'bold', fill: '#111', lineHeight: 1.1,
    }),
    makePh({
      x: 280, y: 130, width: 580, height: 30,
      fieldPath: 'event.subtitle', fieldType: 'string', sample: 'Трагедия в пяти действиях',
      fontSize: 18, fill: '#555',
    }),

    makeLine({ x: 280, y: 175, width: 560, height: 1, points: [0, 0, 560, 0], stroke: '#e5e7eb', strokeWidth: 1 }),

    makeText({ x: 280, y: 190, width: 200, height: 22, text: 'ВРЕМЯ', fontSize: 11, fill: '#888' }),
    makePh({
      x: 280, y: 210, width: 200, height: 28,
      fieldPath: 'event.time', fieldType: 'string', sample: '19:00',
      fontSize: 20, fontStyle: 'bold',
    }),
    makePh({
      x: 280, y: 240, width: 200, height: 20,
      fieldPath: 'event.duration', fieldType: 'string', sample: '3 ч 20 мин с антрактом',
      fontSize: 12, fill: '#666',
    }),

    makeText({ x: 500, y: 190, width: 220, height: 22, text: 'МЕСТО', fontSize: 11, fill: '#888' }),
    makePh({
      x: 500, y: 210, width: 220, height: 26,
      fieldPath: 'event.venue', fieldType: 'string', sample: 'Большой театр',
      fontSize: 16, fontStyle: 'bold',
    }),
    makePh({
      x: 500, y: 236, width: 220, height: 20,
      fieldPath: 'event.address', fieldType: 'string', sample: 'Театральная пл., 1',
      fontSize: 12, fill: '#666',
    }),

    makeText({ x: 280, y: 280, width: 130, height: 22, text: 'РЯД', fontSize: 11, fill: '#888' }),
    makePh({
      x: 280, y: 300, width: 130, height: 24,
      fieldPath: 'ticket.row', fieldType: 'string', sample: '12',
      fontSize: 18, fontStyle: 'bold',
    }),
    makeText({ x: 430, y: 280, width: 130, height: 22, text: 'МЕСТО', fontSize: 11, fill: '#888' }),
    makePh({
      x: 430, y: 300, width: 130, height: 24,
      fieldPath: 'ticket.seat', fieldType: 'string', sample: '8',
      fontSize: 18, fontStyle: 'bold',
    }),
    makeText({ x: 580, y: 280, width: 130, height: 22, text: 'СЕКТОР', fontSize: 11, fill: '#888' }),
    makePh({
      x: 580, y: 300, width: 130, height: 24,
      fieldPath: 'ticket.sector', fieldType: 'string', sample: 'Партер',
      fontSize: 18, fontStyle: 'bold',
    }),

    makePh({
      x: 760, y: 240, width: 110, height: 80,
      fieldPath: 'event.qrCode', fieldType: 'image',
      sample: 'https://picsum.photos/200/200',
    }),
  ];
  return {
    id: uid(), name: 'Билет в театр',
    format: 'custom', orientation: 'landscape',
    width: W, height: H, background: '#ffffff',
    padding: { top: 0, right: 0, bottom: 0, left: 0 },
    elements: elements,
  };
}

function ticketData(): DataRoot[] {
  return [
    {
      id: uid(), name: 'event',
      fields: [
        { id: uid(), name: 'title', type: 'string', sample: 'ГАМЛЕТ' },
        { id: uid(), name: 'subtitle', type: 'string', sample: 'Трагедия в пяти действиях' },
        { id: uid(), name: 'day', type: 'string', sample: '15' },
        { id: uid(), name: 'month', type: 'string', sample: 'марта, сб · 19:00' },
        { id: uid(), name: 'time', type: 'string', sample: '19:00' },
        { id: uid(), name: 'duration', type: 'string', sample: '3 ч 20 мин с антрактом' },
        { id: uid(), name: 'venue', type: 'string', sample: 'Большой театр' },
        { id: uid(), name: 'address', type: 'string', sample: 'Театральная пл., 1' },
        { id: uid(), name: 'qrCode', type: 'image', sample: 'https://picsum.photos/200/200' },
      ],
    },
    {
      id: uid(), name: 'ticket',
      fields: [
        { id: uid(), name: 'sector', type: 'string', sample: 'Партер' },
        { id: uid(), name: 'row', type: 'string', sample: '12' },
        { id: uid(), name: 'seat', type: 'string', sample: '8' },
        { id: uid(), name: 'price', type: 'number', sample: '4500' },
        { id: uid(), name: 'number', type: 'string', sample: 'TKT-2026-0042' },
      ],
    },
  ];
}

/* =========================================================
   2. ЗАЯВЛЕНИЕ ФИЗЛИЦА
   ========================================================= */
function applicationSlide(): Slide {
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
    elements: elements,
  };
}

function applicationData(): DataRoot[] {
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
      fields: [
        { id: uid(), name: 'name', type: 'string', sample: 'ООО «Пример»' },
      ],
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

/* =========================================================
   3. ДОГОВОР НАЙМА
   ========================================================= */
function rentalSlide(): Slide {
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
    elements: elements,
  };
}

function rentalData(): DataRoot[] {
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
      fields: [
        { id: uid(), name: 'fio', type: 'string', sample: 'Петров Пётр Петрович' },
      ],
    },
    {
      id: uid(), name: 'tenant',
      fields: [
        { id: uid(), name: 'fio', type: 'string', sample: 'Иванов Иван Иванович' },
      ],
    },
  ];
}

/* =========================================================
   4. БЛАНК ЗАКАЗА
   ========================================================= */
function orderSlide(): Slide {
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
    elements: elements,
  };
}

function orderData(): DataRoot[] {
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
          id: uid(),
          name: 'items',
          type: 'array',
          sample: '',
          sampleCount: 3,
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

export interface TemplateBundle {
  id: string;
  name: string;
  icon: string;
  description: string;
  build: () => { slide: Slide; data: DataRoot[] };
}

export const BUNDLES: TemplateBundle[] = [
  {
    id: 'ticket',
    name: 'Билет в театр',
    icon: '🎭',
    description: 'Горизонтальный билет в стиле Яндекс.Афиши',
    build: function () { return { slide: ticketSlide(), data: ticketData() }; },
  },
  {
    id: 'application',
    name: 'Заявление физлица',
    icon: '📄',
    description: 'Стандартное заявление на А4',
    build: function () { return { slide: applicationSlide(), data: applicationData() }; },
  },
  {
    id: 'rental',
    name: 'Договор найма',
    icon: '🏠',
    description: 'Договор найма жилого помещения',
    build: function () { return { slide: rentalSlide(), data: rentalData() }; },
  },
  {
    id: 'order',
    name: 'Бланк заказа',
    icon: '🧾',
    description: 'Бланк заказа с таблицей позиций',
    build: function () { return { slide: orderSlide(), data: orderData() }; },
  },
];