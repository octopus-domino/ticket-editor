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

/* ============================================================
   Trust boundary between the untrusted OCR payload and the editor.

   Policy:
     • Security / correctness contracts — STRICT (throw):
         engine enum, image src scheme, page-bounds tolerance (1 px),
         ragged tables, path char-set, missing required props.
     • Adapter normalisation — LENIENT (map, never throw):
         color syntax, font-family aliases, bold/italic ordering,
         shape aliases (rectangle/ellipse), QR-format aliases.
   ============================================================ */

const MIN_PAGE_DIMENSION = 32;
const MAX_PAGE_DIMENSION = 16_384; // accommodate A4 scans @ 600 dpi
const MAX_ELEMENTS = 300;
const MAX_WARNINGS = 20;
const WARNING_LENGTH = 100;
const OVERFLOW_TOLERANCE_PX = 1;
const TARGET_MAX_SIDE = 1552;

const ENGINES: ReadonlySet<string> = new Set(['ocr', 'ollama', 'dual']);

/** Charset accepted by the editor's own SVG path parser. */
const PATH_D_RE = /^[MmZzLlHhVvCcSsQqTtAa\d\s.,+eE-]+$/;

/** Only inline raster images can be embedded in a generated document. */
const IMAGE_SRC_RE = /^data:image\/(png|jpeg);base64,[a-z\d+/=]+$/i;

export interface RecognizedSlideResult {
  slide: Slide;
  warnings: string[];
}

export function recognizedSlide(input: unknown, name: string): RecognizedSlideResult {
  const { width, height, engine, elements, warnings } = parseDraft(input);
  const scale = Math.min(1, TARGET_MAX_SIDE / Math.max(width, height));

  const slide: Slide = {
    id: crypto.randomUUID(),
    name,
    format: 'custom',
    orientation: width > height ? 'landscape' : 'portrait',
    width: Math.ceil(width * scale),
    height: Math.ceil(height * scale),
    padding: { top: 0, right: 0, bottom: 0, left: 0 },
    background: '#ffffff',
    elements: [],
  };

  for (const raw of elements) {
    const element = buildElement(raw, { width, height, engine, scale, slide });
    slide.elements.push(CanvasElementSchema.parse(element) as CanvasElement);
  }

  return { slide, warnings };
}

/* ---------- draft-level validation ---------- */

interface ParsedDraft {
  readonly width: number;
  readonly height: number;
  readonly engine: string;
  readonly elements: readonly unknown[];
  readonly warnings: string[];
}

function parseDraft(input: unknown): ParsedDraft {
  if (!isRecord(input)) throw invalid('draft is not an object');

  const width = numeric(input.width);
  const height = numeric(input.height);
  if (width < MIN_PAGE_DIMENSION || width > MAX_PAGE_DIMENSION)
    throw invalid('page width out of range');
  if (height < MIN_PAGE_DIMENSION || height > MAX_PAGE_DIMENSION)
    throw invalid('page height out of range');

  if (typeof input.engine !== 'string' || !ENGINES.has(input.engine))
    throw invalid('unknown engine');

  if (!Array.isArray(input.elements) || input.elements.length === 0) throw invalid('no elements');

  return {
    width,
    height,
    engine: input.engine,
    elements: input.elements.slice(0, MAX_ELEMENTS),
    warnings: parseWarnings(input.warnings),
  };
}

function parseWarnings(input: unknown): string[] {
  if (!Array.isArray(input)) return [];
  return input
    .filter((w): w is string => typeof w === 'string')
    .slice(0, MAX_WARNINGS)
    .map((w) => w.slice(0, WARNING_LENGTH));
}

/* ---------- per-element dispatch (registry for OCP) ---------- */

interface BuildContext {
  readonly width: number;
  readonly height: number;
  readonly engine: string;
  readonly scale: number;
  readonly slide: Slide;
  readonly rawX: number;
  readonly rawY: number;
  readonly bounds: {
    id: string;
    x: number;
    y: number;
    width: number;
    height: number;
    rotation: 0;
  };
}

type Builder = (ctx: BuildContext, p: Record<string, unknown>) => CanvasElement;

const BUILDERS: Record<string, Builder> = {
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

function buildElement(
  raw: unknown,
  base: Omit<BuildContext, 'bounds' | 'rawX' | 'rawY'>,
): CanvasElement {
  if (!isRecord(raw)) throw invalid('element is not an object');
  const type = typeof raw.type === 'string' ? raw.type : null;
  if (!type || !(type in BUILDERS)) throw invalid('unknown element type');

  const x = numeric(raw.x);
  const y = numeric(raw.y);
  const w = numeric(raw.width);
  const h = numeric(raw.height);
  if (w <= 0 || h <= 0) throw invalid('element bounds missing');

  if (x + w > base.width + OVERFLOW_TOLERANCE_PX) throw invalid('element overflows page (x)');
  if (y + h > base.height + OVERFLOW_TOLERANCE_PX) throw invalid('element overflows page (y)');

  const properties = isRecord(raw.properties) ? raw.properties : {};
  return BUILDERS[type](
    {
      ...base,
      rawX: x,
      rawY: y,
      bounds: {
        id: crypto.randomUUID(),
        x: x * base.scale,
        y: y * base.scale,
        width: w * base.scale,
        height: h * base.scale,
        rotation: 0,
      },
    },
    properties,
  );
}

/* ---------- per-type builders ---------- */

function buildText(ctx: BuildContext, p: Record<string, unknown>): CanvasElement {
  if (p.text === undefined) throw invalid('text missing');
  const text = String(p.text);

  // HTML is a best-effort enhancement — sanitisation errors never drop text.
  let html: string | undefined;
  if (typeof p.html === 'string' && p.html.trim()) {
    try {
      html = recognizedHtml(p.html, ctx.scale);
    } catch {
      html = undefined;
    }
  }

  const fontSize = numberInRange(p.fontSize, 1, 512, 16) * ctx.scale;
  const fontFamily = normalizeFontFamily(p.fontFamily);
  const fontStyle = normalizeFontStyle(p.fontStyle);
  const longest = longestLine(text, fontSize, fontFamily, fontStyle);
  const fitted = Math.min(
    fontSize,
    (fontSize * ctx.bounds.width) / Math.max(1, longest),
    ctx.bounds.height / Math.max(1, text.split('\n').length * 1.2),
  );

  return {
    ...newSimpleText(),
    ...ctx.bounds,
    text,
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
  const shape = normalizeShape(p.shape);
  return {
    ...newShape(shape === 'oval' ? 'circle' : (shape as never)),
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

function buildTable(ctx: BuildContext, p: Record<string, unknown>): CanvasElement {
  if (!Array.isArray(p.data) || p.data.length === 0) throw invalid('table data missing');
  const rows = p.data.filter(Array.isArray).map((row) => row.map((c) => String(c ?? '')));
  if (!rows.length) throw invalid('table empty');
  const cols = rows[0].length;
  if (rows.some((row) => row.length !== cols)) throw invalid('ragged table');
  return {
    ...newTable(),
    ...ctx.bounds,
    data: rows,
    rows: rows.length,
    cols,
    fontSize: numberInRange(p.fontSize, 1, 512, 16) * ctx.scale,
    borderColor: normalizeColor(p.borderColor, '#777777'),
    headerBg: normalizeColor(p.headerBg, '#ffffff'),
  };
}

function buildImage(ctx: BuildContext, p: Record<string, unknown>): CanvasElement {
  if (typeof p.src !== 'string' || !IMAGE_SRC_RE.test(p.src)) throw invalid('image src invalid');
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

function buildChart(ctx: BuildContext, p: Record<string, unknown>): CanvasElement {
  const values = normalizeNumberArray(p.values);
  if (!values.length) throw invalid('chart values missing');
  return {
    ...newChart(normalizeChartKind(p.kind)),
    ...ctx.bounds,
    values,
    palette: normalizePalette(p.palette),
  };
}

function buildQr(ctx: BuildContext, p: Record<string, unknown>): CanvasElement {
  if (typeof p.text !== 'string' || !p.text) throw invalid('qr text missing');
  return {
    ...newQr(),
    ...ctx.bounds,
    text: p.text,
    format: normalizeQrFormat(p.format),
  };
}

function buildPath(ctx: BuildContext, p: Record<string, unknown>): CanvasElement {
  if (typeof p.d !== 'string' || !p.d) throw invalid('path d missing');
  if (!PATH_D_RE.test(p.d)) throw invalid('path d contains forbidden characters');
  return {
    ...newPath(),
    ...ctx.bounds,
    d: scalePath(
      p.d,
      ctx.scale,
      // Dual engine returns page coordinates; single-engine returns local.
      ctx.engine === 'dual' ? ctx.rawX : 0,
      ctx.engine === 'dual' ? ctx.rawY : 0,
    ),
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

function invalid(detail: string): RecognitionError {
  return new RecognitionError('recognition.invalid_result', detail);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function numeric(value: unknown): number {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function longestLine(text: string, size: number, family: string, style: string): number {
  return Math.max(...text.split('\n').map((line) => measureText(line, size, family, style)));
}

/**
 * Walk an SVG path string, translating absolute coordinates by
 * (originX, originY) and scaling every coordinate parameter.
 *
 * - Arc radii (`rx`, `ry`) and the two arc flags (`large-arc`, `sweep`)
 *   are preserved verbatim to match the original scaling contract.
 * - Whitespace between tokens is preserved exactly — only numeric tokens
 *   are rewritten, so `M20 20` stays `M0 0`, not `M 0 0`.
 */
function scalePath(d: string, scale: number, originX = 0, originY = 0): string {
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
      // Arc radii + flags (params 2-4): pass through untouched.
      if (command === 'A' && [2, 3, 4].includes(arcPosition)) return token;
      const coordinate = command !== 'A' || arcPosition >= 5;
      const xAxis =
        command === 'H' ||
        (command !== 'V' && (command === 'A' ? arcPosition === 5 : position % 2 === 0));
      const translate = coordinate && (!relative || (initialRelativeMove && position < 2));
      return String((Number(token) - (translate ? (xAxis ? originX : originY) : 0)) * scale);
    },
  );
}
