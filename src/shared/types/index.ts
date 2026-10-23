/* ============================================================
   shared/types/index.ts
   v8: + arc, path, chart, clipPathId, sampleValues
   ============================================================ */

export type StampShape = 'circle' | 'oval' | 'rect' | 'triangle';
export type DashType = 'solid' | 'dashed' | 'dotted' | 'dashdot' | 'longdash';
export type BasicShape =
  | 'rect' | 'roundRect' | 'circle' | 'triangle' | 'star' | 'arrow'
  | 'polygon' | 'arc';
export type TextAlign = 'left' | 'center' | 'right' | 'justify';
export type TextVerticalAlign = 'top' | 'middle' | 'bottom';
export type Orientation = 'portrait' | 'landscape';
export type DocFormat = 'a4' | 'a5' | 'a6' | 'letter' | 'ticket' | 'card' | 'custom';
export type DataFieldType = 'string' | 'number' | 'date' | 'boolean' | 'image' | 'object' | 'array';
export type AnchorSide = 'top' | 'right' | 'bottom' | 'left';
export type ConnectorRouting = 'straight' | 'orthogonal';
export type StampShapeKind = 'circle' | 'ellipse' | 'rect' | 'triangle' | 'line' | 'fill';
export type StampFillMode = 'subtract' | 'intersect';
export type ImageFit = 'contain' | 'cover' | 'fill';
export type ChartKind = 'bar' | 'donut';

export type AppearanceFillType = 'solid' | 'linear' | 'radial';
export type StrokeAlign = 'center' | 'inside' | 'outside';

export interface GradientStop { offset: number; color: string; }

export interface AppearanceFill {
  id: string;
  type: AppearanceFillType;
  color?: string;
  stops?: GradientStop[];
  angle?: number;
  opacity?: number;
}

export interface AppearanceStroke {
  id: string;
  color: string;
  width: number;
  dash?: DashType;
  align?: StrokeAlign;
}

export interface Appearance {
  fills?: AppearanceFill[];
  strokes?: AppearanceStroke[];
}

export interface GraphicStyle {
  id: string;
  name: string;
  fills: AppearanceFill[];
  strokes: AppearanceStroke[];
}

export interface SymbolDef {
  id: string;
  name: string;
  prototype: CanvasElement;
}

export interface Padding { top: number; right: number; bottom: number; left: number }
export interface Position { x: number; y: number }
export interface Size { width: number; height: number }
export interface Bounds extends Position, Size {}

export interface DataField {
  id: string;
  name: string;
  type: DataFieldType;
  sample: string;
  children?: DataField[];
  sampleCount?: number;
  /** v8: явные числовые значения — используется ChartElement для data binding */
  sampleValues?: number[];
}

export interface DataRoot {
  id: string;
  name: string;
  fields: DataField[];
}

export interface BaseElement extends Bounds {
  id: string;
  rotation: number;
  locked?: boolean;
  appearance?: Appearance;
  styleId?: string | null;
  symbolId?: string | null;
  /** v8: id элемента-клиппера */
  clipPathId?: string | null;
}

export interface TextElement extends BaseElement {
  type: 'text';
  text: string;
  html?: string;
  richText: boolean;
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
  textMode?: 'straight' | 'arc';
  arcRadius?: number;
  arcStartAngle?: number;
  arcEndAngle?: number;
  arcFlip?: boolean;
}

export interface GroupElement extends BaseElement {
  type: 'group';
  children: string[];
}

export interface ImageElement extends BaseElement {
  type: 'image';
  src: string;
  isFillRaster?: boolean;
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
  textAlign?: TextAlign;
  textVerticalAlign?: TextVerticalAlign;
  textPadding?: Padding;
  textFontFamily?: string;
  textLineHeight?: number;
  textFontStyle?: string;
  textDecoration?: string;
  rasterFill?: { src: string; relX: number; relY: number; relW: number; relH: number };
  polygonPoints?: number[];
  polygonSubpaths?: number[][];
  // v8: arc geometry (angles — градусы, radiuses — доли от 0 до 1 от min(w,h)/2)
  arcStartAngle?: number;
  arcEndAngle?: number;
  arcInnerRadius?: number;
  arcOuterRadius?: number;
}

export interface PathElement extends BaseElement {
  type: 'path';
  d: string;
  fill: string;
  stroke: string;
  strokeWidth: number;
}

export interface ChartElement extends BaseElement {
  type: 'chart';
  chartKind: ChartKind;
  dataPath: string | null;
  valueField?: string; // <-- ДОБАВЛЕНО
  values: number[];
  palette: string[];
  barWidth: number;
  gap: number;
  donutInnerRatio: number;
}

export interface LineElement extends BaseElement {
  type: 'line';
  points: number[];
  stroke: string;
  strokeWidth: number;
  dash: DashType;
  isArrow: boolean;
}

export interface TableElement extends BaseElement {
  type: 'table';
  rows: number;
  cols: number;
  data: string[][];
  borderColor: string;
  headerBg: string;
  fontSize: number;
}

export interface FooterElement extends BaseElement {
  type: 'footer';
  text: string;
  html?: string;
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
  html?: string;
}

export interface FillElement extends BaseElement {
  type: 'fill';
  points: number[];
  fill: string;
  stroke: string;
  strokeWidth: number;
  opacity: number;
}

export interface DiagramElement extends BaseElement {
  type: 'diagram';
  svg: string;
  xml: string;
}

export interface ConnectorElement extends BaseElement {
  type: 'connector';
  fromId: string;
  fromAnchor: AnchorSide;
  toId: string;
  toAnchor: AnchorSide;
  stroke: string;
  strokeWidth: number;
  dash: DashType;
  isArrow: boolean;
  routing: ConnectorRouting;
  label?: string;
  labelFontSize?: number;
  labelFill?: string;
  labelOffsetX?: number;
  labelOffsetY?: number;
}

export interface StampShapeItem {
  id: string;
  kind: StampShapeKind;
  x: number; y: number; width: number; height: number;
  rotation?: number;
  cornerRadius: number;
  points?: number[];
  stroke: string;
  strokeWidth: number;
  dash: DashType;
  isArrow?: boolean;
  fill?: string;
  fillMode?: StampFillMode;
  fillOuterId?: string;
  fillHoleIds?: string[];
  fillTargetShapeId?: string;
  fillAnchorLocal?: Position;
  name?: string;
  locked?: boolean;
  hidden?: boolean;
}

export interface StampTextItem {
  id: string;
  text: string;
  mode: 'straight' | 'arc';
  x: number; y: number; width: number;
  align: TextAlign;
  arcCx: number; arcCy: number; arcRadius: number;
  arcRx?: number; arcRy?: number;
  arcStartDeg: number; arcEndDeg: number;
  arcFlip: boolean;
  arcDirection?: 'cw' | 'ccw';
  arcHostId?: string;
  arcOutside?: boolean;
  arcOffset?: number;
  arcSpanDeg?: number;
  fontSize: number;
  fontFamily: string;
  fontStyle: string;
  textDecoration: string;
  fill: string;
  name?: string; locked?: boolean; hidden?: boolean;
}

export interface StampImageItem {
  id: string;
  src: string;
  x: number; y: number; width: number; height: number;
  rotation?: number;
  fit?: ImageFit;
  name?: string; locked?: boolean; hidden?: boolean;
}

export interface StampElement extends BaseElement {
  type: 'stamp';
  name?: string;
  shapes?: StampShapeItem[];
  texts?: StampTextItem[];
  images?: StampImageItem[];
  libraryId?: string;
  shape?: StampShape;
  stampColor?: string;
  strokeWidth?: number;
  strokeDash?: DashType;
  innerStrokeWidth?: number;
  innerStrokeDash?: DashType;
  showInner?: boolean;
  topText?: string; topFontSize?: number; topFontFamily?: string;
  topFontStyle?: string; topTextDecoration?: string; topColor?: string;
  centerText?: string; centerFontSize?: number; centerFontFamily?: string;
  centerFontStyle?: string; centerTextDecoration?: string; centerColor?: string;
  bottomText?: string; bottomFontSize?: number; bottomFontFamily?: string;
  bottomFontStyle?: string; bottomTextDecoration?: string; bottomColor?: string;
  centerImage?: string;
}

export type CanvasElement =
  | TextElement | ImageElement | ShapeElement | PathElement | ChartElement
  | LineElement | TableElement | FooterElement | PlaceholderElement
  | FillElement | DiagramElement | ConnectorElement | StampElement | GroupElement;

export const isTextElement = (el: CanvasElement): el is TextElement => el.type === 'text';
export const isShapeElement = (el: CanvasElement): el is ShapeElement => el.type === 'shape';
export const isPathElement = (el: CanvasElement): el is PathElement => el.type === 'path';
export const isChartElement = (el: CanvasElement): el is ChartElement => el.type === 'chart';
export const isLineElement = (el: CanvasElement): el is LineElement => el.type === 'line';
export const isTableElement = (el: CanvasElement): el is TableElement => el.type === 'table';
export const isFooterElement = (el: CanvasElement): el is FooterElement => el.type === 'footer';
export const isPlaceholderElement = (el: CanvasElement): el is PlaceholderElement => el.type === 'placeholder';
export const isFillElement = (el: CanvasElement): el is FillElement => el.type === 'fill';
export const isConnectorElement = (el: CanvasElement): el is ConnectorElement => el.type === 'connector';
export const isStampElement = (el: CanvasElement): el is StampElement => el.type === 'stamp';
export const isImageElement = (el: CanvasElement): el is ImageElement => el.type === 'image';
export const isDiagramElement = (el: CanvasElement): el is DiagramElement => el.type === 'diagram';
export const isGroupElement = (el: CanvasElement): el is GroupElement => el.type === 'group';

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

export interface Document {
  version: string;
  slides: Slide[];
  data: DataRoot[];
  activeSlideId: string;
}