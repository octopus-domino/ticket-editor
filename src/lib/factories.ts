/* ============================================================
   lib/factories.ts
   ============================================================ */

import type {
  Slide, TextElement, ShapeElement, LineElement, TableElement, FooterElement,
  StampElement, PlaceholderElement, DocFormat, Orientation, DataFieldType,
  StampShape, BasicShape, PathElement, ChartElement, ChartKind, QrElement,
} from '@/shared/types';
import { FORMATS } from '@/shared/constants';
import { getFormatSize } from '@/shared/utils/formats';
import { uid } from './uid';
import { DEFAULT_PADDING, TEXT_PLACEHOLDER } from './constants';
import { CHART_PALETTE } from './graphics/charts';

const A4 = { width: FORMATS.a4.portrait.w, height: FORMATS.a4.portrait.h };

export function newSlide(
  n: number,
  format: DocFormat = 'a4',
  orientation: Orientation = 'portrait',
): Slide {
  const { w, h } = getFormatSize(format, orientation);
  return {
    id: uid(),
    name: `Страница ${n}`,
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
    topText: 'МАЗАВИЯ', topFontSize: 14, topFontFamily: 'Arial',
    topFontStyle: 'bold', topTextDecoration: '', topColor: '#1a1a1a',
    centerText: '2026', centerFontSize: 20, centerFontFamily: 'Arial',
    centerFontStyle: 'bold', centerTextDecoration: '', centerColor: '#1a1a1a',
    bottomText: 'ДОКУМЕНТ', bottomFontSize: 12, bottomFontFamily: 'Arial',
    bottomFontStyle: 'normal', bottomTextDecoration: '', bottomColor: '#1a1a1a',
  };
}

export function newText(x = 100, y = 100): TextElement {
  return {
    id: uid(), type: 'text', x, y, width: 300, height: 80, rotation: 0,
    text: TEXT_PLACEHOLDER,
    richText: true,
    fontSize: 18, fontFamily: 'Arial',
    fill: '#000000', fontStyle: 'normal', textDecoration: '',
    align: 'left', verticalAlign: 'top',
    lineHeight: 1.5,
    padding: { top: 8, right: 8, bottom: 8, left: 8 },
    background: 'transparent',
  };
}

export function newSimpleText(x = 100, y = 100): TextElement {
  return {
    id: uid(), type: 'text', x, y, width: 300, height: 40, rotation: 0,
    text: TEXT_PLACEHOLDER,
    richText: false,
    fontSize: 18, fontFamily: 'Arial',
    fill: '#000000', fontStyle: 'normal', textDecoration: '',
    align: 'left', verticalAlign: 'top',
    lineHeight: 1.4,
    padding: { top: 4, right: 4, bottom: 4, left: 4 },
    background: 'transparent',
  };
}

export function newShape(shape: BasicShape, x = 200, y = 200): ShapeElement {
  const base: ShapeElement = {
    id: uid(), type: 'shape', shape, x, y,
    width: 150, height: 150, rotation: 0,
    fill: '#ffffff', stroke: '#000000', strokeWidth: 2,
    text: '', fontSize: 16, textFill: '#111',
    textAlign: 'center',
    textVerticalAlign: 'middle',
    textPadding: { top: 8, right: 8, bottom: 8, left: 8 },
    textFontFamily: 'Arial',
    textLineHeight: 1.3,
    textFontStyle: 'normal',
    textDecoration: '',
    radius: shape === 'roundRect' ? 20 : 0,
  };
  if (shape === 'arc') {
    base.arcStartAngle = 0;
    base.arcEndAngle = 90;
    base.arcInnerRadius = 0.5;
    base.arcOuterRadius = 1;
    base.fill = '#eef2ff';
    base.stroke = '#6366f1';
  }
  if (shape === 'star') {
    base.innerRadiusRatio = 1 / 2.4;
  }
  if (shape === 'triangle') {
    base.polygonPoints = [75, 0, 150, 150, 0, 150];
  }
  return base;
}

export function newLine(x = 100, y = 100): LineElement {
  return {
    id: uid(), type: 'line', x, y, width: 300, height: 20, rotation: 0,
    points: [0, 10, 300, 10],
    stroke: '#000000', strokeWidth: 2, dash: 'solid', isArrow: false,
  };
}

export function newTable(x = 100, y = 100): TableElement {
  return {
    id: uid(), type: 'table', x, y, width: 400, height: 160, rotation: 0,
    rows: 3, cols: 3,
    data: [
      ['Колонка 1', 'Колонка 2', 'Колонка 3'],
      ['', '', ''],
      ['', '', ''],
    ],
    borderColor: '#94a3b8', headerBg: '#e2e8f0', fontSize: 14,
  };
}

export function newFooter(slide?: Slide, footerHeight = 60): FooterElement {
  const width = slide?.width ?? A4.width;
  const height = slide?.height ?? A4.height;
  const padding = slide?.padding ?? DEFAULT_PADDING;
  const printableWidth = Math.max(0, width - padding.left - padding.right);
  return {
    id: uid(), type: 'footer',
    x: padding.left,
    y: height - padding.bottom - footerHeight,
    width: printableWidth, height: footerHeight, rotation: 0,
    text: 'ООО «Компания» · www.example.com · +7 (495) 000-00-00',
    fill: '#ffffff', bgColor: '#1e293b', fontSize: 14,
  };
}

export function makePlaceholder(
  x: number, y: number, fieldPath: string, fieldType: DataFieldType, sample: string,
): PlaceholderElement {
  return {
    id: uid(), type: 'placeholder',
    x: Math.max(0, x - 100), y: Math.max(0, y - 20),
    width: 220,
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
    for (let i = 0; i < count; i++) row.push(`{{${payload.path}[${i}].${child.name}}}`);
    data.push(row);
  });
  const rows = data.length;
  const cols = 1 + count;
  return {
    id: uid(), type: 'table',
    x: Math.max(0, x - 100), y: Math.max(0, y - 20),
    width: 40 + cols * 120, height: 20 + rows * 32, rotation: 0,
    rows, cols, data,
    borderColor: '#cbd5e1', headerBg: '#eef2ff', fontSize: 13,
  };
}

export function newPath(x = 200, y = 200): PathElement {
  return {
    id: uid(), type: 'path',
    x, y, width: 120, height: 120, rotation: 0,
    d: 'M 0 0 L 120 0 L 120 120 L 0 120 Z',
    fill: '#eef2ff',
    stroke: '#6366f1',
    strokeWidth: 2,
  };
}

export function newChart(kind: ChartKind, x = 200, y = 200): ChartElement {
  return {
    id: uid(), type: 'chart',
    x, y, width: 320, height: 240, rotation: 0,
    chartKind: kind,
    dataPath: null,
    values: [10, 20, 15, 30, 25],
    palette: CHART_PALETTE.slice(),
    barWidth: 40,
    gap: 12,
    donutInnerRatio: 0.5,
  };
}

export function newQr(x = 100, y = 100, size = 200): QrElement {
  return {
    id: uid(),
    type: 'qr',
    x, y,
    width: size, height: size,
    rotation: 0,
    text: 'https://example.com',
    format: 'QR',
    fgColor: '#000000',
    bgColor: '#ffffff',
    margin: 4,
    ecc: 'M',
  };
}