import type {
  Slide, TextElement, ShapeElement, LineElement, TableElement, FooterElement,
  StampElement, PlaceholderElement, DocFormat, Orientation, DataFieldType, StampShape, BasicShape,
} from '../types';
import { A4, getFormatSize } from '../types';
import { uid } from './uid';
import { DEFAULT_PADDING } from './constants';

export function newSlide(n: number, format: DocFormat = 'a4', orientation: Orientation = 'portrait'): Slide {
  const { w, h } = getFormatSize(format, orientation);
  return {
    id: uid(), name: `Страница ${n}`,
    format, orientation, width: w, height: h,
    background: '#ffffff',
    padding: { ...DEFAULT_PADDING },
    elements: [],
  };
}

export function newStamp(shape: StampShape, x = 200, y = 200): StampElement {
  return {
    id: uid(), type: 'stamp', shape, x, y,
    width: shape === 'rect' ? 260 : shape === 'oval' ? 240 : 200,
    height: shape === 'rect' ? 120 : shape === 'oval' ? 150 : shape === 'triangle' ? 173 : 200,
    rotation: 0, stampColor: '#1a1a1a',
    strokeWidth: 3, strokeDash: 'solid',
    innerStrokeWidth: 1, innerStrokeDash: 'solid', showInner: true,
    topText: 'ТЕАТР', topFontSize: 14, topFontFamily: 'Arial',
    topFontStyle: 'bold', topTextDecoration: '', topColor: '#1a1a1a',
    centerText: '2026', centerFontSize: 20, centerFontFamily: 'Arial',
    centerFontStyle: 'bold', centerTextDecoration: '', centerColor: '#1a1a1a',
    bottomText: 'МОСКВА', bottomFontSize: 12, bottomFontFamily: 'Arial',
    bottomFontStyle: 'normal', bottomTextDecoration: '', bottomColor: '#1a1a1a',
  };
}

export function newText(x = 100, y = 100): TextElement {
  return {
    id: uid(), type: 'text', x, y, width: 300, height: 80, rotation: 0,
    text: 'Введите текст',
    fontSize: 18, fontFamily: 'Arial',
    fill: '#1a1a1a', fontStyle: 'normal', textDecoration: '',
    align: 'left', verticalAlign: 'top', lineHeight: 1.2,
    padding: { top: 4, right: 4, bottom: 4, left: 4 },
    background: 'transparent',
  };
}

export function newShape(shape: BasicShape, x = 200, y = 200): ShapeElement {
  return {
    id: uid(), type: 'shape', shape, x, y,
    width: 150, height: 150, rotation: 0,
    fill: 'transparent', stroke: '#1e40af', strokeWidth: 2,
    text: '', fontSize: 16, textFill: '#111',
    radius: shape === 'roundRect' ? 20 : 0,
  };
}

export function newLine(x = 100, y = 100): LineElement {
  return {
    id: uid(), type: 'line', x, y, width: 300, height: 20, rotation: 0,
    points: [0, 10, 300, 10],
    stroke: '#1a1a1a', strokeWidth: 2, dash: 'solid', isArrow: false,
  };
}

export function newTable(x = 100, y = 100): TableElement {
  return {
    id: uid(), type: 'table', x, y, width: 400, height: 160, rotation: 0,
    rows: 3, cols: 3,
    data: [['Заголовок 1', 'Заголовок 2', 'Заголовок 3'], ['', '', ''], ['', '', '']],
    borderColor: '#94a3b8', headerBg: '#e2e8f0', fontSize: 14,
  };
}

export function newFooter(): FooterElement {
  return {
    id: uid(), type: 'footer',
    x: 0, y: 900, width: 794, height: 60, rotation: 0,
    text: 'ООО «Театр» · www.example.com · +7 (495) 000-00-00',
    fill: '#ffffff', bgColor: '#1e293b', fontSize: 14,
  };
}

export function makePlaceholder(
  x: number, y: number, fieldPath: string, fieldType: DataFieldType, sample: string,
): PlaceholderElement {
  return {
    id: uid(), type: 'placeholder',
    x: Math.max(0, x - 100), y: Math.max(0, y - 20),
    width: fieldType === 'image' ? 220 : 220,
    height: fieldType === 'image' ? 200 : 60,
    rotation: 0, fieldPath, fieldType, sample, label: fieldPath,
    fontSize: 16, fontFamily: 'Arial', fill: '#1a1a1a',
    fontStyle: 'normal', textDecoration: '',
    align: 'left', verticalAlign: 'top', lineHeight: 1.2,
    padding: { top: 4, right: 4, bottom: 4, left: 4 },
    background: 'transparent', imageMode: 'fit',
  };
}

export function makeArrayTable(
  x: number, y: number,
  payload: {
    path: string;
    arrayName: string;
    sampleCount?: number;
    arrayChildren: { name: string; type: string }[];
  },
): TableElement {
  const children = payload.arrayChildren || [];
  const count = Math.max(1, payload.sampleCount ?? 3);
  const header: string[] = ['Атрибут'];
  for (let i = 0; i < count; i++) header.push(`#${i + 1}`);

  const data: string[][] = [header];
  children.forEach((child) => {
    const row: string[] = [child.name];
    for (let i = 0; i < count; i++) {
      row.push(`{{${payload.path}[${i}].${child.name}}}`);
    }
    data.push(row);
  });

  const rows = data.length;
  const cols = 1 + count;

  return {
    id: uid(), type: 'table',
    x: Math.max(0, x - 100), y: Math.max(0, y - 20),
    width: 40 + cols * 120,
    height: 20 + rows * 32,
    rotation: 0,
    rows, cols, data,
    borderColor: '#cbd5e1', headerBg: '#eef2ff', fontSize: 13,
  };
}