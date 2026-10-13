export type StampShape = 'circle' | 'oval' | 'rect' | 'triangle';
export type DashType = 'solid' | 'dashed' | 'dotted' | 'dashdot' | 'longdash';
export type BasicShape = 'rect' | 'roundRect' | 'circle' | 'triangle' | 'star' | 'arrow';
export type TextAlign = 'left' | 'center' | 'right' | 'justify';
export type TextVerticalAlign = 'top' | 'middle' | 'bottom';
export type Orientation = 'portrait' | 'landscape';
export type DocFormat = 'a4' | 'a5' | 'a6' | 'letter' | 'ticket' | 'card' | 'custom';

export interface Padding { top: number; right: number; bottom: number; left: number; }

export type DataFieldType = 'string' | 'number' | 'date' | 'boolean' | 'image' | 'object' | 'array';

export interface DataField {
  id: string;
  name: string;
  type: DataFieldType;
  sample: string;
  children?: DataField[];
  sampleCount?: number;
}

export interface DataRoot {
  id: string;
  name: string;
  fields: DataField[];
}

export interface BaseElement {
  id: string;
  x: number; y: number;
  width: number; height: number;
  rotation: number;
  locked?: boolean;
}

export interface StampElement extends BaseElement {
  type: 'stamp';
  shape: StampShape;
  stampColor: string;
  strokeWidth: number;
  strokeDash: DashType;
  innerStrokeWidth: number;
  innerStrokeDash: DashType;
  showInner: boolean;
  topText: string; topFontSize: number; topFontFamily: string;
  topFontStyle: string; topTextDecoration: string; topColor: string;
  centerText: string; centerFontSize: number; centerFontFamily: string;
  centerFontStyle: string; centerTextDecoration: string; centerColor: string;
  bottomText: string; bottomFontSize: number; bottomFontFamily: string;
  bottomFontStyle: string; bottomTextDecoration: string; bottomColor: string;
  centerImage?: string;
}

export interface TextElement extends BaseElement {
  type: 'text';
  text: string;
  fontSize: number;
  fontFamily: string;
  fill: string;
  fontStyle: string;
  textDecoration: string;
  align: TextAlign;
  verticalAlign: TextVerticalAlign;
  lineHeight: number;
  padding: Padding;
  background: string;
}

export interface ImageElement extends BaseElement {
  type: 'image';
  src: string;
}

export interface ShapeElement extends BaseElement {
  type: 'shape';
  shape: BasicShape;
  fill: string;
  stroke: string;
  strokeWidth: number;
  text: string;
  fontSize: number;
  textFill: string;
  radius?: number;
}

export interface LineElement extends BaseElement {
  type: 'line';
  points?: number[];
  stroke: string;
  strokeWidth: number;
  dash: DashType;
  isArrow: boolean;
}

export interface TableElement extends BaseElement {
  type: 'table';
  rows: number; cols: number;
  data: string[][];
  borderColor: string;
  headerBg: string;
  fontSize: number;
}

export interface FooterElement extends BaseElement {
  type: 'footer';
  text: string;
  fill: string;
  bgColor: string;
  fontSize: number;
}

export interface PlaceholderElement extends BaseElement {
  type: 'placeholder';
  fieldPath: string;
  fieldType: DataFieldType;
  sample: string;
  label: string;
  inline?: boolean;
  fontSize: number;
  fontFamily: string;
  fill: string;
  fontStyle: string;
  textDecoration: string;
  align: TextAlign;
  verticalAlign: TextVerticalAlign;
  lineHeight: number;
  padding: Padding;
  background: string;
  imageMode?: 'fit' | 'fill';
}

export interface FillElement extends BaseElement {
  type: 'fill';
  points: number[];
  fill: string;
  stroke: string;
  strokeWidth: number;
  opacity: number;
}

export type CanvasElement =
  | StampElement | TextElement | ImageElement
  | ShapeElement | LineElement | TableElement | FooterElement
  | PlaceholderElement | FillElement;

export interface Slide {
  id: string;
  name: string;
  format: DocFormat;
  orientation: Orientation;
  width: number;
  height: number;
  background: string;
  backgroundImage?: string;
  padding: Padding;
  elements: CanvasElement[];
}

export const FORMATS: Record<DocFormat, { label: string; portrait: { w: number; h: number } }> = {
  a4:     { label: 'A4 (210×297 мм)',    portrait: { w: 794,  h: 1123 } },
  a5:     { label: 'A5 (148×210 мм)',    portrait: { w: 559,  h: 794  } },
  a6:     { label: 'A6 (105×148 мм)',    portrait: { w: 397,  h: 559  } },
  letter: { label: 'Letter (216×279 мм)',portrait: { w: 816,  h: 1056 } },
  ticket: { label: 'Билет (200×80 мм)',  portrait: { w: 302,  h: 756  } },
  card:   { label: 'Визитка (90×50 мм)', portrait: { w: 189,  h: 340  } },
  custom: { label: 'Свой размер',        portrait: { w: 794,  h: 1123 } },
};

export const getFormatSize = (
  format: DocFormat,
  orientation: Orientation,
  custom?: { w: number; h: number },
): { w: number; h: number } => {
  let base = FORMATS[format].portrait;
  if (format === 'custom' && custom) base = custom;
  return orientation === 'portrait'
    ? { w: base.w, h: base.h }
    : { w: base.h, h: base.w };
};

export const A4 = { width: 794, height: 1123 };
export const GRID_SIZE = 20;
export const SNAP_THRESHOLD = 10;