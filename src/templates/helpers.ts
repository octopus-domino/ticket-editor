// src/templates/helpers.ts
import type {
  TextElement, ShapeElement, PlaceholderElement,
  TableElement, LineElement, FooterElement, Padding,
} from '@/shared/types';
import { FORMATS } from '@/shared/constants';

export const uid = (): string => Math.random().toString(36).slice(2, 10);

export function makeText(o: Partial<TextElement> = {}): TextElement {
  const base: TextElement = {
    id: uid(), type: 'text', x: 0, y: 0, width: 200, height: 30, rotation: 0,
    text: '', richText: true, fontSize: 14, fontFamily: 'Arial', fill: '#111',
    fontStyle: 'normal', textDecoration: '',
    align: 'left', verticalAlign: 'top', lineHeight: 1.2,
    padding: { top: 4, right: 4, bottom: 4, left: 4 },
    background: 'transparent',
  };
  return Object.assign({}, base, o);
}

export function makeShape(o: Partial<ShapeElement> = {}): ShapeElement {
  const base: ShapeElement = {
    id: uid(), type: 'shape', shape: 'rect',
    x: 0, y: 0, width: 100, height: 100, rotation: 0,
    fill: 'transparent', stroke: 'transparent', strokeWidth: 0,
    text: '', fontSize: 16, textFill: '#111', radius: 0,
  };
  return Object.assign({}, base, o);
}

export function makePh(o: Partial<PlaceholderElement> = {}): PlaceholderElement {
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

export function makeTable(o: Partial<TableElement> = {}): TableElement {
  const base: TableElement = {
    id: uid(), type: 'table',
    x: 0, y: 0, width: 400, height: 120, rotation: 0,
    rows: 3, cols: 3,
    data: [['A', 'B', 'C'], ['', '', ''], ['', '', '']],
    borderColor: '#cbd5e1', headerBg: '#e2e8f0', fontSize: 13,
  };
  return Object.assign({}, base, o);
}

export function makeLine(o: Partial<LineElement> = {}): LineElement {
  const base: LineElement = {
    id: uid(), type: 'line',
    x: 0, y: 0, width: 300, height: 20, rotation: 0,
    points: [0, 10, 300, 10],
    stroke: '#1a1a1a', strokeWidth: 1, dash: 'solid', isArrow: false,
  };
  return Object.assign({}, base, o);
}

export function makeFooter(o: Partial<FooterElement> = {}): FooterElement {
  const base: FooterElement = {
    id: uid(), type: 'footer',
    x: 0, y: 1000, width: FORMATS.a4.portrait.w, height: 40, rotation: 0,
    text: 'ООО «Компания» · +7 (000) 000-00-00',
    fill: '#ffffff', bgColor: '#1e293b', fontSize: 12,
  };
  return Object.assign({}, base, o);
}

export function makeFooterInPrintArea(
  slideW: number, slideH: number,
  padding: Padding,
  o: Partial<FooterElement> = {},
): FooterElement {
  const height = o.height ?? 40;
  const { x: _x, y: _y, width: _w, ...rest } = o;
  return {
    id: uid(), type: 'footer',
    x: padding.left,
    y: slideH - padding.bottom - height,
    width: Math.max(0, slideW - padding.left - padding.right),
    height,
    rotation: 0,
    text: 'ООО «Компания» · www.example.com',
    fill: '#ffffff', bgColor: '#1e293b', fontSize: 12,
    ...rest,
  };
}