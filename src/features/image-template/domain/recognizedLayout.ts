import type { CanvasElement, Slide } from '@/shared/types';
import { CanvasElementSchema } from '@/shared/schemas/document';
import {
  newSimpleText,
  newShape,
  newLine,
  newTable,
  newStamp,
  newChart,
  newQr,
  newPath,
  newFooter,
} from '@/lib/factories';
import { measureText } from '@/lib/richText/measure';
import { recognizedHtml } from './recognizedHtml';
import { RecognitionError } from './RecognitionError';
import {
  clampBounds,
  normalizeAlign,
  normalizeChartKind,
  normalizeColor,
  normalizeFontFamily,
  normalizeFontStyle,
  normalizeNumberArray,
  normalizePalette,
  normalizeQrFormat,
  normalizeShape,
  normalizeStampShape,
  normalizeTextDecoration,
  numberInRange,
} from './normalize';
import {
  ELEMENT_TYPES,
  MAX_PAGE_DIMENSION,
  draftSchema,
  type ElementType,
  type RecognizedDraft,
  type RecognizedElement,
} from './recognizedDraft';

export type { RecognizedDraft } from './recognizedDraft';

export interface BuildResult {
  slide: Slide;
  warnings: string[];
}

/* ---------- public boundary ---------- */

export function recognizedSlide(input: unknown, name: string): BuildResult {
  const draft = normalizeDraft(input);
  return buildSlide(draft, name);
}

/* ---------- normalisation (raw → contract) ---------- */

function normalizeDraft(input: unknown): RecognizedDraft {
  if (!isRecord(input)) {
    throw new RecognitionError('recognition.invalid_result', 'draft is not an object');
  }
  const width = clampPageDimension(input.width);
  const height = clampPageDimension(input.height);
  if (!width || !height) {
    throw new RecognitionError('recognition.invalid_result', 'draft size missing');
  }
  const rawElements = Array.isArray(input.elements) ? input.elements : [];
  const elements = rawElements
    .slice(0, 300)
    .map(normalizeElement)
    .filter((e): e is RecognizedElement => e !== null);
  if (!elements.length) {
    throw new RecognitionError('recognition.invalid_result', 'no usable elements');
  }
  const warnings = Array.isArray(input.warnings)
    ? input.warnings
        .filter((w): w is string => typeof w === 'string')
        .slice(0, 20)
        .map((w) => w.slice(0, 100))
    : [];
  const engine =
    input.engine === 'ollama' || input.engine === 'dual' ? input.engine : 'ocr';
  return draftSchema.parse({ width, height, elements, warnings, engine });
}

function normalizeElement(raw: unknown): RecognizedElement | null {
  if (!isRecord(raw)) return null;
  if (typeof raw.type !== 'string') return null;
  if (!(ELEMENT_TYPES as readonly string[]).includes(raw.type)) return null;
  const x = finite(raw.x);
  const y = finite(raw.y);
  const width = positive(raw.width);
  const height = positive(raw.height);
  if (x === null || y === null || width === null || height === null) return null;
  return {
    type: raw.type as ElementType,
    x,
    y,
    width,
    height,
    properties: isRecord(raw.properties) ? raw.properties : {},
  };
}

function clampPageDimension(value: unknown): number | null {
  const n = finite(value);
  if (n === null || n <= 0) return null;
  return Math.min(MAX_PAGE_DIMENSION, Math.max(32, n));
}

/* ---------- build (contract → Slide) ---------- */

const TARGET_MAX_SIDE = 1552;

function buildSlide(draft: RecognizedDraft, name: string): BuildResult {
  const scale = Math.min(1, TARGET_MAX_SIDE / Math.max(draft.width, draft.height));
  const slide: Slide = {
    id: crypto.randomUUID(),
    name,
    format: 'custom',
    orientation: draft.width > draft.height ? 'landscape' : 'portrait',
    width: Math.ceil(draft.width * scale),
    height: Math.ceil(draft.height * scale),
    padding: { top: 0, right: 0, bottom: 0, left: 0 },
    background: '#ffffff',
    elements: [],
  };
  const warnings = new Set<string>(draft.warnings);
  for (const item of draft.elements) {
    const element = safeBuildElement(item, draft, scale, slide);
    if (element) slide.elements.push(element);
    else warnings.add('recognition.element_skipped');
  }
  if (slide.elements.length === 0) {
    throw new RecognitionError('recognition.invalid_result', 'no elements survived');
  }
  return { slide, warnings: [...warnings] };
}

interface BuildContext {
  readonly draft: RecognizedDraft;
  readonly scale: number;
  readonly slide: Slide;
  readonly bounds: {
    id: string;
    x: number;
    y: number;
    width: number;
    height: number;
    rotation: number;
  };
}

/**
 * Per-element fail-soft: one bad element (e.g. broken SVG path) is logged
 * and skipped, never aborts the whole image.
 */
function safeBuildElement(
  item: RecognizedElement,
  draft: RecognizedDraft,
  scale: number,
  slide: Slide,
): CanvasElement | null {
  const bbox = clampBounds(item, draft.width, draft.height);
  if (!bbox) {
    warn(item, 'element outside page');
    return null;
  }
  const ctx: BuildContext = {
    draft,
    scale,
    slide,
    bounds: {
      id: crypto.randomUUID(),
      x: bbox.x * scale,
      y: bbox.y * scale,
      width: bbox.width * scale,
      height: bbox.height * scale,
      rotation: 0,
    },
  };
  try {
    const element = BUILDERS[item.type](ctx, item.properties);
    if (!element) return null;
    return CanvasElementSchema.parse(element) as CanvasElement;
  } catch (err) {
    warn(item, err);
    return null;
  }
}

function warn(item: RecognizedElement, reason: unknown): void {
  // eslint-disable-next-line no-console -- Diagnostics for a recoverable path.
  console.warn('[recognition] element skipped', { type: item.type, reason });
}

/* ---------- per-type builders (Registry pattern for OCP) ---------- */

type Builder = (
  ctx: BuildContext,
  p: Readonly<Record<string, unknown>>,
) => CanvasElement | null;

const BUILDERS: Record<ElementType, Builder> = {
  text: buildText,
  shape: buildShape,
  line: buildLine,
  table: buildTable,
  image: buildImage,
  stamp: buildStamp,
  chart: buildChart,
  qr: buildQr,
  path: buildPath,
  footer: buildFooter,
};

function buildText(ctx: BuildContext, p: Record<string, unknown>): CanvasElement | null {
  if (typeof p.text !== 'string') return null;
  const fontSize = numberInRange(p.fontSize, 1, 512, 16) * ctx.scale;
  const fontFamily = normalizeFontFamily(p.fontFamily);
  const fontStyle = normalizeFontStyle(p.fontStyle);

  let html: string | undefined;
  if (typeof p.html === 'string' && p.html.trim()) {
    try {
      html = recognizedHtml(p.html, ctx.scale);
    } catch (err) {
      // Keep the text content even if the markup was rejected.
      warn({ type: 'text', x: 0, y: 0, width: 1, height: 1, properties: {} } as RecognizedElement, err);
      html = undefined;
    }
  }

  const longest = longestLine(p.text, fontSize, fontFamily, fontStyle);
  const fitted = Math.min(
    fontSize,
    (fontSize * ctx.bounds.width) / Math.max(1, longest),
    ctx.bounds.height / Math.max(1, p.text.split('\n').length * 1.2),
  );
  return {
    ...newSimpleText(),
    ...ctx.bounds,
    text: p.text,
    html,
    richText: Boolean(html),
    autoHeight: false,
    fontSize: html ? fontSize : Math.max(4, fitted),
    fontFamily,
    fontStyle,
    textDecoration: normalizeTextDecoration(p.textDecoration),
    align: normalizeAlign(p.align),
    fill: normalizeColor(p.fill),
    lineHeight: 1.2,
    padding: { top: 0, right: 0, bottom: 0, left: 0 },
  };
}

function buildShape(ctx: BuildContext, p: Record<string, unknown>): CanvasElement {
  return {
    ...newShape(normalizeShape(p.shape) === 'oval' ? 'circle' : (normalizeShape(p.shape) as never)),
    ...ctx.bounds,
    fill: normalizeColor(p.fill, 'transparent'),
    stroke: normalizeColor(p.stroke, 'none'),
    strokeWidth: numberInRange(p.strokeWidth, 0, 100, 0) * ctx.scale,
    radius: numberInRange(p.radius, 0, 1000, 0) * ctx.scale,
  };
}

function buildLine(ctx: BuildContext, p: Record<string, unknown>): CanvasElement {
  const points =
    Array.isArray(p.points) && p.points.length >= 4
      ? p.points.map((n) => Number(n)).map((n) => (Number.isFinite(n) ? n : 0))
      : [
          0,
          0,
          ctx.bounds.width > ctx.bounds.height ? ctx.bounds.width : 0,
          ctx.bounds.height > ctx.bounds.width ? ctx.bounds.height : 0,
        ];
  return {
    ...newLine(),
    ...ctx.bounds,
    points,
    stroke: normalizeColor(p.stroke, '#555555'),
    strokeWidth: numberInRange(p.strokeWidth, 0, 100, 1) * ctx.scale,
  };
}

function buildTable(ctx: BuildContext, p: Record<string, unknown>): CanvasElement | null {
  if (!Array.isArray(p.data)) return null;
  const rows = p.data.filter(Array.isArray).map((row) => row.map((c) => String(c ?? '')));
  if (!rows.length) return null;
  const cols = Math.max(...rows.map((r) => r.length));
  const data = rows.map((r) => [...r, ...Array(cols - r.length).fill('')]);
  return {
    ...newTable(),
    ...ctx.bounds,
    data,
    rows: data.length,
    cols,
    fontSize: numberInRange(p.fontSize, 1, 512, 16) * ctx.scale,
    borderColor: normalizeColor(p.borderColor, '#777777'),
    headerBg: normalizeColor(p.headerBg, '#ffffff'),
  };
}

function buildImage(ctx: BuildContext, p: Record<string, unknown>): CanvasElement | null {
  if (typeof p.src !== 'string' || !p.src) return null;
  return { type: 'image', ...ctx.bounds, src: p.src };
}

function buildStamp(ctx: BuildContext, p: Record<string, unknown>): CanvasElement {
  return {
    ...newStamp(normalizeStampShape(p.shape)),
    ...ctx.bounds,
    topText: typeof p.topText === 'string' ? p.topText : '',
    centerText: typeof p.centerText === 'string' ? p.centerText : '',
    bottomText: typeof p.bottomText === 'string' ? p.bottomText : '',
    stampColor: normalizeColor(p.stampColor, '#244f91'),
  };
}

function buildChart(ctx: BuildContext, p: Record<string, unknown>): CanvasElement | null {
  const values = normalizeNumberArray(p.values);
  if (!values.length) return null;
  return {
    ...newChart(normalizeChartKind(p.kind)),
    ...ctx.bounds,
    values,
    palette: normalizePalette(p.palette),
  };
}

function buildQr(ctx: BuildContext, p: Record<string, unknown>): CanvasElement | null {
  if (typeof p.text !== 'string' || !p.text) return null;
  return {
    ...newQr(),
    ...ctx.bounds,
    text: p.text,
    format: normalizeQrFormat(p.format),
  };
}

function buildPath(ctx: BuildContext, p: Record<string, unknown>): CanvasElement | null {
  if (typeof p.d !== 'string' || !p.d) return null;
  return {
    ...newPath(),
    ...ctx.bounds,
    d: scalePath(p.d, ctx.scale, 0, 0),
    fill: normalizeColor(p.fill, 'none'),
    stroke: normalizeColor(p.stroke, '#202020'),
    strokeWidth: numberInRange(p.strokeWidth, 0, 100, 1) * ctx.scale,
  };
}

function buildFooter(ctx: BuildContext, p: Record<string, unknown>): CanvasElement {
  return {
    ...newFooter(ctx.slide),
    ...ctx.bounds,
    text: typeof p.text === 'string' ? p.text : '',
    fontSize: numberInRange(p.fontSize, 1, 512, 16) * ctx.scale,
    fill: normalizeColor(p.fill),
    bgColor: normalizeColor(p.bgColor, '#ffffff'),
  };
}

/* ---------- helpers ---------- */

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function finite(value: unknown): number | null {
  const n = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(n) ? n : null;
}

function positive(value: unknown): number | null {
  const n = finite(value);
  return n !== null && n > 0 ? n : null;
}

function longestLine(text: string, size: number, family: string, style: string): number {
  return Math.max(
    ...text.split('\n').map((line) => measureText(line, size, family, style)),
  );
}

/** Path coords are local; multiply every coordinate but leave arc radii / angles. */
function scalePath(d: string, scale: number, originX = 0, originY = 0): string {
  if (scale === 1 && !originX && !originY) return d;
  let command = '';
  let index = 0;
  let relative = false;
  let firstCommand = true;
  let initialRelativeMove = false;
  return d.replace(
    /[MmZzLlHhVvCcSsQqTtAa]|[-+]?(?:\d*\.\d+|\d+\.?\d*)(?:[eE][-+]?\d+)?/g,
    (token) => {
      if (/^[a-z]$/i.test(token)) {
        command = token.toUpperCase();
        relative = token !== command;
        initialRelativeMove = firstCommand && token === 'm';
        firstCommand = false;
        index = 0;
        return token;
      }
      const position = index++;
      const arcPosition = position % 7;
      if (command === 'A' && [2, 3, 4].includes(arcPosition)) return token;
      const coordinate = command !== 'A' || arcPosition >= 5;
      const xAxis =
        command === 'H' ||
        (command !== 'V' &&
          (command === 'A' ? arcPosition === 5 : position % 2 === 0));
      const translate = coordinate && (!relative || (initialRelativeMove && position < 2));
      return String(
        (Number(token) - (translate ? (xAxis ? originX : originY) : 0)) * scale,
      );
    },
  );
}