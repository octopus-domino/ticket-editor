import type { Slide, DataRoot, CanvasElement } from '@/shared/types';
import { uid, makeText, makeShape, makePh, makeLine } from '../helpers';
import type { TemplateBundle } from './types';

function slide(): Slide {
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
    elements,
  };
}

function data(): DataRoot[] {
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

export const theaterTicketBundle: TemplateBundle = {
  id: 'ticket',
  name: 'Билет в театр',
  icon: '🎭',
  description: 'Горизонтальный билет в стиле Яндекс.Афиши',
  build: () => ({ slide: slide(), data: data() }),
};