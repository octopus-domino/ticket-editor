import type { StampShapeItem, StampTextItem } from '@/shared/types';
import type { StampTemplate } from './types';
import { t } from '@/shared/i18n';

const id = () => crypto.randomUUID();
const shape = (
  kind: StampShapeItem['kind'],
  x: number,
  y: number,
  width: number,
  height: number,
): StampShapeItem => ({
  id: id(),
  kind,
  x,
  y,
  width,
  height,
  stroke: '#244f91',
  strokeWidth: 2,
  fill: 'transparent',
  dash: 'solid',
  cornerRadius: 0,
});
const label = (
  value: string,
  x: number,
  y: number,
  width: number,
  fontSize: number,
): StampTextItem => ({
  id: id(),
  text: t(value),
  mode: 'straight',
  x,
  y,
  width,
  align: 'center',
  arcCx: 100,
  arcCy: 100,
  arcRadius: 70,
  arcStartDeg: -150,
  arcEndDeg: -30,
  arcFlip: false,
  fontSize,
  fontFamily: 'Arial',
  fontStyle: 'bold',
  textDecoration: '',
  fill: '#244f91',
});
export function essentialStamps(): StampTemplate[] {
  const round: StampTemplate = {
    id: 'essential-round',
    name: t('Round seal'),
    icon: '◎',
    width: 240,
    height: 240,
    shapes: [shape('ellipse', 6, 6, 228, 228), shape('ellipse', 22, 22, 196, 196)],
    texts: [
      {
        ...label('YOUR COMPANY', 0, 0, 240, 15),
        mode: 'arc',
        arcCx: 120,
        arcCy: 120,
        arcRadius: 85,
      },
      label('YOUR TEXT', 35, 100, 170, 22),
    ],
  };
  const oval: StampTemplate = {
    id: 'essential-oval',
    name: t('Oval seal'),
    icon: '⬭',
    width: 300,
    height: 170,
    shapes: [shape('ellipse', 5, 5, 290, 160)],
    texts: [label('YOUR COMPANY', 30, 55, 240, 23), label('Date __________', 40, 95, 220, 15)],
  };
  const triangle: StampTemplate = {
    id: 'essential-triangle',
    name: t('Triangular stamp'),
    icon: '△',
    width: 260,
    height: 240,
    shapes: [shape('triangle', 6, 6, 248, 226), shape('triangle', 27, 40, 206, 174)],
    texts: [
      label('QUALITY', 72, 105, 116, 18),
      label('CHECKED', 60, 138, 140, 21),
      label('2026', 86, 175, 88, 14),
    ],
  };
  const complexRound: StampTemplate = {
    ...round,
    id: 'essential-round-detailed',
    name: t('Detailed round seal'),
    shapes: [
      shape('ellipse', 6, 6, 228, 228),
      shape('ellipse', 13, 13, 214, 214),
      shape('ellipse', 44, 44, 152, 152),
      ...Array.from({ length: 12 }, (_, i) => {
        const angle = (i * Math.PI) / 6;
        return {
          ...shape('circle', 116 + Math.cos(angle) * 82, 116 + Math.sin(angle) * 82, 8, 8),
          fill: '#244f91',
          strokeWidth: 0,
        };
      }),
    ],
    texts: [
      { ...round.texts[0], arcRadius: 98, fontSize: 13 },
      {
        ...round.texts[0],
        id: id(),
        text: t('HANDMADE WITH CARE'),
        arcRadius: 98,
        arcStartDeg: 155,
        arcEndDeg: 25,
        arcDirection: 'ccw',
        arcFlip: true,
        fontSize: 12,
      },
      label('YOUR\nCOMPANY', 65, 88, 110, 22),
      label('2026', 90, 145, 60, 14),
    ],
  };
  const detailedOval: StampTemplate = {
    ...oval,
    id: 'essential-oval-detailed',
    name: t('Detailed oval seal'),
    width: 320,
    height: 210,
    shapes: [
      shape('ellipse', 6, 6, 308, 198),
      shape('ellipse', 14, 14, 292, 182),
      shape('ellipse', 46, 46, 228, 118),
    ],
    texts: [
      {
        ...label('YOUR COMPANY', 0, 0, 320, 14),
        mode: 'arc',
        arcCx: 160,
        arcCy: 105,
        arcRadius: 85,
        arcRx: 132,
        arcRy: 78,
        arcStartDeg: -155,
        arcEndDeg: -25,
      },
      label('QUALITY\nCHECKED', 80, 77, 160, 20),
      label('Date __________', 70, 143, 180, 12),
    ],
  };
  return [
    round,
    complexRound,
    oval,
    detailedOval,
    triangle,
    ...[
      ['rectangle', 'Rectangular stamp', 'YOUR TEXT'],
      ['approved', 'Approved', 'APPROVED'],
    ].map(([key, name, value]): StampTemplate => ({
      id: `essential-${key}`,
      name: t(name),
      icon: '▭',
      width: 300,
      height: 110,
      shapes: [shape('rect', 5, 5, 290, 100)],
      texts: [label(value, 15, 22, 270, 23), label('Date __________', 20, 67, 260, 14)],
    })),
  ];
}
