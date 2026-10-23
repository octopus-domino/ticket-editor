import type { Slide, DataRoot, CanvasElement, DataField } from '@/shared/types';
import { uid, makeText, makeShape, makePh } from '../helpers';
import type { TemplateBundle } from './types';

/* ---------- Карточка товара ---------- */
function card(x: number, y: number, idx: number): CanvasElement[] {
  const CARD_W = 238;
  const CARD_H = 290;
  const RED = '#E30611';
  const DARK = '#111111';
  const MUTED = '#777777';
  const GRAY_BG = '#F5F5F5';
  const p = `items[${idx}]`;

  return [
    makeShape({
      x, y, width: CARD_W, height: CARD_H,
      fill: GRAY_BG, stroke: '#E5E5E5', strokeWidth: 1, radius: 10,
    }),
    makeShape({
      x: x + 10, y: y + 10, width: CARD_W - 20, height: 130,
      fill: '#FFFFFF', stroke: 'transparent', strokeWidth: 0, radius: 6,
    }),
    makePh({
      x: x + 20, y: y + 20, width: CARD_W - 40, height: 110,
      fieldPath: `${p}.image`, fieldType: 'image',
      sample: 'https://picsum.photos/seed/p' + idx + '/200/120',
    }),
    makeShape({
      x: x + 10, y: y + 10, width: 56, height: 26,
      fill: RED, stroke: 'transparent', strokeWidth: 0, radius: 6,
    }),
    makePh({
      x: x + 10, y: y + 15, width: 56, height: 20,
      fieldPath: `${p}.discount`, fieldType: 'string', sample: '-25%',
      fontSize: 13, fontStyle: 'bold', align: 'center', fill: '#FFFFFF',
    }),
    makePh({
      x: x + 14, y: y + 152, width: CARD_W - 28, height: 40,
      fieldPath: `${p}.name`, fieldType: 'string',
      sample: 'Колоко пастеризованное 3,2%',
      fontSize: 13, fontStyle: 'bold', lineHeight: 1.25, fill: DARK,
    }),
    makePh({
      x: x + 14, y: y + 200, width: CARD_W - 28, height: 32,
      fieldPath: `${p}.price`, fieldType: 'string', sample: '99 ₽',
      fontSize: 24, fontStyle: 'bold', fill: RED,
    }),
    makePh({
      x: x + 14, y: y + 240, width: CARD_W - 28, height: 20,
      fieldPath: `${p}.oldPrice`, fieldType: 'string', sample: '129 ₽',
      fontSize: 14, fill: MUTED, textDecoration: 'line-through',
    }),
    makePh({
      x: x + 14, y: y + 262, width: CARD_W - 28, height: 18,
      fieldPath: `${p}.unit`, fieldType: 'string', sample: 'за 1 л.',
      fontSize: 10, fill: MUTED,
    }),
  ];
}

/* ---------- Слайд ---------- */
function slide(): Slide {
  const W = 794;
  const H = 1123;
  const RED = '#E30611';
  const DARK = '#111111';

  const COL_X = [20, 268, 516];
  const ROW_Y = [170, 480, 790];

  const elements: CanvasElement[] = [
    makeShape({ x: 0, y: 0, width: W, height: 140, fill: RED, stroke: 'transparent', strokeWidth: 0, radius: 0 }),
    makeShape({ x: 20, y: 24, width: 42, height: 42, fill: '#FFFFFF', stroke: 'transparent', strokeWidth: 0, radius: 21 }),
    makeText({ x: 20, y: 34, width: 42, height: 26, text: 'М', fontSize: 24, fontStyle: 'bold', align: 'center', fill: RED }),
    makePh({
      x: 74, y: 30, width: 300, height: 30,
      fieldPath: 'catalog.brand', fieldType: 'string', sample: 'МАГНИТ',
      fontSize: 26, fontStyle: 'bold', fill: '#FFFFFF',
    }),
    makePh({
      x: 74, y: 60, width: 300, height: 20,
      fieldPath: 'catalog.subtitle', fieldType: 'string', sample: 'супермаркет',
      fontSize: 14, fill: '#FFDDDD',
    }),
    makeText({ x: 470, y: 30, width: 304, height: 24, text: 'Каталог акций', fontSize: 13, fill: '#FFDDDD', align: 'right' }),
    makePh({
      x: 470, y: 54, width: 304, height: 26,
      fieldPath: 'catalog.period', fieldType: 'string',
      sample: 'с 20 октября по 3 ноября',
      fontSize: 15, fontStyle: 'bold', fill: '#FFFFFF', align: 'right',
    }),
    makePh({
      x: 470, y: 82, width: 304, height: 20,
      fieldPath: 'catalog.maxDiscount', fieldType: 'string', sample: 'скидки до 50%',
      fontSize: 13, fill: '#FFDDDD', align: 'right',
    }),
    makePh({
      x: 20, y: 148, width: 500, height: 24,
      fieldPath: 'catalog.tagline', fieldType: 'string',
      sample: 'ВРЕМЯ ВЫГОДНЫХ ПОКУПОК',
      fontSize: 12, fontStyle: 'bold', fill: RED,
    }),
    ...card(COL_X[0], ROW_Y[0], 0),
    ...card(COL_X[1], ROW_Y[0], 1),
    ...card(COL_X[2], ROW_Y[0], 2),
    ...card(COL_X[0], ROW_Y[1], 3),
    ...card(COL_X[1], ROW_Y[1], 4),
    ...card(COL_X[2], ROW_Y[1], 5),
    ...card(COL_X[0], ROW_Y[2], 6),
    ...card(COL_X[1], ROW_Y[2], 7),
    ...card(COL_X[2], ROW_Y[2], 8),
    makeShape({ x: 0, y: 1090, width: W, height: 33, fill: DARK, stroke: 'transparent', strokeWidth: 0, radius: 0 }),
    makePh({
      x: 20, y: 1098, width: 500, height: 20,
      fieldPath: 'catalog.contacts', fieldType: 'string',
      sample: 'Магнит · 8 800 200-90-02 · magnit.ru',
      fontSize: 11, fill: '#FFFFFF',
    }),
    makePh({
      x: 474, y: 1098, width: 300, height: 20,
      fieldPath: 'catalog.footerNote', fieldType: 'string',
      sample: 'Цены действительны на момент акции',
      fontSize: 10, fill: '#AAAAAA', align: 'right',
    }),
  ];

  return {
    id: uid(), name: 'Каталог акций',
    format: 'custom', orientation: 'portrait',
    width: W, height: H, background: '#FFFFFF',
    padding: { top: 0, right: 0, bottom: 0, left: 0 },
    elements,
  };
}

/* ---------- Данные ---------- */
function data(): DataRoot[] {
  // ИСПОЛЬЗУЕМ ПРАВИЛЬНЫЙ ТИП DataField
  const items: DataField[] = [];
  const products = [
    { name: 'Колоко пастеризованное 3,2%', price: '99 ₽', oldPrice: '129 ₽', discount: '-25%', unit: 'за 1 л' },
    { name: 'Хлеб «Бородинский»', price: '45 ₽', oldPrice: '59 ₽', discount: '-20%', unit: 'за 400 г' },
    { name: 'Сыр «Российский» 45%', price: '389 ₽', oldPrice: '549 ₽', discount: '-30%', unit: 'за 1 кг' },
    { name: 'Куриное филе охлаждённое', price: '259 ₽', oldPrice: '329 ₽', discount: '-20%', unit: 'за 1 кг' },
    { name: 'Яблоки «Гала»', price: '89 ₽', oldPrice: '119 ₽', discount: '-25%', unit: 'за 1 кг' },
    { name: 'Кофе молотый Jardin', price: '599 ₽', oldPrice: '799 ₽', discount: '-25%', unit: 'за 250 г' },
    { name: 'Масло сливочное 82,5%', price: '169 ₽', oldPrice: '219 ₽', discount: '-25%', unit: 'за 180 г' },
    { name: 'Печенье «Юбилейное»', price: '79 ₽', oldPrice: '99 ₽', discount: '-20%', unit: 'за 300 г' },
    { name: 'Сок «Добрый» апельсин', price: '139 ₽', oldPrice: '179 ₽', discount: '-25%', unit: 'за 1 л' },
  ];

  products.forEach((p) => {
    items.push({
      id: uid(),
      name: p.name,
      type: 'string',
      sample: p.price,
    });
  });

  const itemsField: DataField = {
    id: uid(),
    name: 'items',
    type: 'array',
    sample: '',
    sampleCount: 9,
    children: [
      { id: uid(), name: 'name',     type: 'string', sample: 'Колоко пастеризованное 3,2%' },
      { id: uid(), name: 'price',    type: 'string', sample: '99 ₽' },
      { id: uid(), name: 'oldPrice', type: 'string', sample: '129 ₽' },
      { id: uid(), name: 'discount', type: 'string', sample: '-25%' },
      { id: uid(), name: 'unit',     type: 'string', sample: 'за 1 л' },
      { id: uid(), name: 'image',    type: 'image',  sample: 'https://picsum.photos/seed/p0/200/120' },
    ],
  };

  return [
    {
      id: uid(), name: 'catalog',
      fields: [
        { id: uid(), name: 'brand',       type: 'string', sample: 'МАГНИТ' },
        { id: uid(), name: 'subtitle',    type: 'string', sample: 'супермаркет' },
        { id: uid(), name: 'period',      type: 'string', sample: 'с 20 октября по 3 ноября' },
        { id: uid(), name: 'maxDiscount', type: 'string', sample: 'скидки до 50%' },
        { id: uid(), name: 'tagline',     type: 'string', sample: 'ВРЕМЯ ВЫГОДНЫХ ПОКУПОК' },
        { id: uid(), name: 'contacts',    type: 'string', sample: 'Магнит · 8 800 200-90-02 · magnit.ru' },
        { id: uid(), name: 'footerNote',  type: 'string', sample: 'Цены действительны на момент акции' },
      ],
    },
    {
      id: uid(), name: 'catalogRoot',
      fields: [itemsField],
    },
  ];
}

export const catalogBundle: TemplateBundle = {
  id: 'catalog',
  name: 'Каталог товаров',
  icon: '📰',
  description: 'Каталог акций и сетка цен — сетка 3×3',
  build: () => ({ slide: slide(), data: data() }),
};