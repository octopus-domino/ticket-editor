import type { StampShapeItem, StampTextItem } from '@/shared/types';
import type { StampTemplate } from './types';
import { t } from '@/shared/i18n';

const id = () => crypto.randomUUID();
const shape = (kind: StampShapeItem['kind'], x: number, y: number, width: number, height: number): StampShapeItem => ({ id: id(), kind, x, y, width, height, stroke: '#244f91', strokeWidth: 2, fill: 'transparent', dash: 'solid', cornerRadius: 0 });
const label = (value: string, x: number, y: number, width: number, fontSize: number): StampTextItem => ({ id: id(), text: t(value), mode: 'straight', x, y, width, align: 'center', arcCx: 100, arcCy: 100, arcRadius: 70, arcStartDeg: -150, arcEndDeg: -30, arcFlip: false, fontSize, fontFamily: 'Arial', fontStyle: 'bold', textDecoration: '', fill: '#244f91' });
export function essentialStamps(): StampTemplate[] {
  const round: StampTemplate = { id: 'essential-round', name: t('Round seal'), icon: '◎', width: 240, height: 240,
    shapes: [shape('ellipse', 6, 6, 228, 228), shape('ellipse', 22, 22, 196, 196)],
    texts: [{ ...label('YOUR COMPANY', 0, 0, 240, 15), mode: 'arc', arcCx: 120, arcCy: 120, arcRadius: 85 }, label('YOUR TEXT', 35, 100, 170, 22)] };
  const oval: StampTemplate = { id: 'essential-oval', name: t('Oval seal'), icon: '⬭', width: 300, height: 170,
    shapes: [shape('ellipse', 5, 5, 290, 160)], texts: [label('YOUR COMPANY', 30, 55, 240, 23), label('Date __________', 40, 95, 220, 15)] };
  return [round, oval, ...[
    ['rectangle', 'Rectangular stamp', 'YOUR TEXT'], ['approved', 'Approved', 'APPROVED'],
    ['paid', 'Paid', 'PAID'], ['received', 'Received', 'RECEIVED'], ['copy', 'Copy', 'COPY'],
    ['confidential', 'Confidential', 'CONFIDENTIAL'], ['draft', 'Draft', 'DRAFT'], ['certified', 'Certified copy', 'CERTIFIED COPY'],
  ].map(([key, name, value]): StampTemplate => ({ id: `essential-${key}`, name: t(name), icon: '▭', width: 300, height: 110,
    shapes: [shape('rect', 5, 5, 290, 100)], texts: [label(value, 15, 22, 270, 23), label('Date __________', 20, 67, 260, 14)] }))];
}
