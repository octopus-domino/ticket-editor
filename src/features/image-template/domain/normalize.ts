/**
 * recognition/normalize.ts
 *
 * Pure, side-effect-free adapters between the loose OCR payload and the
 * editor's strict domain types.
 *
 * SRP: one normalizer per field family.
 * LSP: every function returns a value satisfying its declared return type —
 *      never throws on malformed input; falls back to a documented default.
 * OCP: new synonyms are added to the alias tables, not to distant switches.
 *
 * Rationale: a single bad field (e.g. `"italic bold"` word order) must not
 * reject an otherwise usable document. Preserving strictness in the Zod
 * schema would be correct for internal data, but backend OCR is an
 * untrusted adapter boundary — that is what this module exists to normalise.
 */

export const DEFAULT_TEXT_COLOR = '#202020';
export const DEFAULT_FONT = 'Arial' as const;
export type AllowedFont = 'Arial' | 'Times New Roman' | 'Georgia' | 'Verdana' | 'Courier New';

/* ---------- primitives ---------- */

function finite(value: unknown): number | null {
  const n = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(n) ? n : null;
}

export function numberInRange(
  value: unknown,
  min: number,
  max: number,
  fallback: number,
): number {
  const n = finite(value);
  if (n === null) return fallback;
  return Math.max(min, Math.min(max, n));
}

export function positiveNumber(value: unknown, fallback = 0): number {
  const n = finite(value);
  return n !== null && n > 0 ? n : fallback;
}

/* ---------- color ---------- */

const NAMED_COLORS: Readonly<Record<string, string>> = {
  black: '#000000',
  white: '#ffffff',
  red: '#ff0000',
  green: '#008000',
  blue: '#0000ff',
  yellow: '#ffff00',
  gray: '#808080',
  grey: '#808080',
  transparent: 'transparent',
  none: 'none',
};

/**
 * Any CSS color form OCR might emit → `#RRGGBB`, `transparent` or `none`.
 * Hex, 8-hex (alpha dropped), `rgb()/rgba()`, and a small named-color table.
 */
export function normalizeColor(input: unknown, fallback = DEFAULT_TEXT_COLOR): string {
  if (typeof input !== 'string') return fallback;
  const v = input.trim().toLowerCase();
  if (!v) return fallback;
  if (v === 'transparent' || v === 'none') return v;
  if (/^#[a-f\d]{3}$/.test(v)) return v;
  if (/^#[a-f\d]{6}$/.test(v)) return v;
  if (/^#[a-f\d]{8}$/.test(v)) return v.slice(0, 7);
  const rgb = /^rgba?\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})/i.exec(v);
  if (rgb) {
    const hex = [rgb[1], rgb[2], rgb[3]]
      .map((n) => Math.max(0, Math.min(255, Number(n))))
      .map((n) => n.toString(16).padStart(2, '0'))
      .join('');
    return `#${hex}`;
  }
  return NAMED_COLORS[v] ?? fallback;
}

/* ---------- fonts ---------- */

const FONT_WHITELIST: readonly AllowedFont[] = [
  'Arial',
  'Times New Roman',
  'Georgia',
  'Verdana',
  'Courier New',
];

const FONT_FAMILY_HINTS: readonly [RegExp, AllowedFont][] = [
  [/times|georgia|garamond|palatino|(^|[^-])serif/i, 'Georgia'],
  [/courier|mono|consolas|menlo/i, 'Courier New'],
  [/verdana|tahoma/i, 'Verdana'],
  [/arial|helvetica|sans/i, 'Arial'],
];

export function normalizeFontFamily(input: unknown): AllowedFont {
  if (typeof input !== 'string') return DEFAULT_FONT;
  const raw = input.trim().replace(/["']/g, '');
  if (!raw) return DEFAULT_FONT;
  const direct = FONT_WHITELIST.find((f) => f.toLowerCase() === raw.toLowerCase());
  if (direct) return direct;
  const first = raw.split(',')[0].trim();
  const exact = FONT_WHITELIST.find((f) => f.toLowerCase() === first.toLowerCase());
  if (exact) return exact;
  for (const [pattern, font] of FONT_FAMILY_HINTS) if (pattern.test(raw)) return font;
  return DEFAULT_FONT;
}

export type FontStyle = 'normal' | 'bold' | 'italic' | 'bold italic';

/** Order-insensitive: `"italic bold"` and `"bold italic"` both yield `bold italic`. */
export function normalizeFontStyle(input: unknown): FontStyle {
  if (typeof input !== 'string') return 'normal';
  const tokens = new Set(input.toLowerCase().split(/\s+/).filter(Boolean));
  const bold =
    tokens.has('bold') || tokens.has('700') || tokens.has('800') || tokens.has('900');
  const italic = tokens.has('italic') || tokens.has('oblique');
  if (bold && italic) return 'bold italic';
  if (bold) return 'bold';
  if (italic) return 'italic';
  return 'normal';
}

export function normalizeTextDecoration(input: unknown): string {
  if (typeof input !== 'string') return '';
  const tokens = input.toLowerCase().split(/\s+/);
  const out: string[] = [];
  if (tokens.includes('underline')) out.push('underline');
  if (tokens.includes('line-through') || tokens.includes('strikethrough'))
    out.push('line-through');
  return out.join(' ');
}

export type NormalizedAlign = 'left' | 'center' | 'right' | 'justify';

export function normalizeAlign(input: unknown): NormalizedAlign {
  if (typeof input !== 'string') return 'left';
  const v = input.toLowerCase();
  if (v === 'center' || v === 'right' || v === 'justify') return v;
  return 'left';
}

/* ---------- shapes ---------- */

export type NormalizedShape =
  | 'rect'
  | 'roundRect'
  | 'circle'
  | 'oval'
  | 'triangle'
  | 'star'
  | 'arrow';

const SHAPE_ALIASES: Readonly<Record<string, NormalizedShape>> = {
  rect: 'rect',
  rectangle: 'rect',
  square: 'rect',
  roundrect: 'roundRect',
  round_rect: 'roundRect',
  rounded: 'roundRect',
  circle: 'circle',
  round: 'circle',
  ellipse: 'oval',
  oval: 'oval',
  ellipsis: 'oval',
  triangle: 'triangle',
  star: 'star',
  arrow: 'arrow',
};

export function normalizeShape(input: unknown): NormalizedShape {
  if (typeof input !== 'string') return 'rect';
  const key = input.trim().toLowerCase().replace(/[\s-]/g, '_');
  return SHAPE_ALIASES[key] ?? 'rect';
}

export type StampShape = 'circle' | 'oval' | 'rect' | 'triangle';

export function normalizeStampShape(input: unknown): StampShape {
  const s = normalizeShape(input);
  return s === 'roundRect' || s === 'rect'
    ? 'rect'
    : s === 'circle' || s === 'oval' || s === 'triangle'
      ? s
      : 'circle';
}

/* ---------- QR ---------- */

export type NormalizedQrFormat = 'QR' | 'DATA_MATRIX' | 'AZTEC' | 'PDF_417';

export function normalizeQrFormat(input: unknown): NormalizedQrFormat {
  if (typeof input !== 'string') return 'QR';
  const key = input.trim().toUpperCase().replace(/[\s-]/g, '_');
  if (key === 'PDF417') return 'PDF_417';
  if (key === 'QR' || key === 'QR_CODE' || key === 'QRCODE') return 'QR';
  if (key === 'DATAMATRIX') return 'DATA_MATRIX';
  if (key === 'AZTEC') return 'AZTEC';
  return 'QR';
}

export function normalizeChartKind(input: unknown): 'bar' | 'donut' {
  return input === 'donut' ? 'donut' : 'bar';
}

/* ---------- collections & bounds ---------- */

export function normalizeNumberArray(input: unknown, maxLen = 100): number[] {
  if (!Array.isArray(input)) return [];
  return input
    .map(Number)
    .filter(Number.isFinite)
    .slice(0, maxLen);
}

export function normalizePalette(input: unknown): string[] {
  const fallback = ['#244f91', '#e76837'];
  if (!Array.isArray(input)) return fallback;
  const out = input
    .map((c) => normalizeColor(c, ''))
    .filter((c): c is string => Boolean(c))
    .slice(0, 100);
  return out.length ? out : fallback;
}

/**
 * Overhang is normalised, not rejected: OCR floats can exceed the page by a
 * pixel due to rounding. Anything that produces a zero-area element is
 * signalled by returning `null` so the caller can warn-and-skip.
 */
export function clampBounds(
  item: { x: number; y: number; width: number; height: number },
  pageWidth: number,
  pageHeight: number,
): { x: number; y: number; width: number; height: number } | null {
  const x = Math.max(0, Math.min(item.x, pageWidth));
  const y = Math.max(0, Math.min(item.y, pageHeight));
  const width = Math.min(item.width, pageWidth - x);
  const height = Math.min(item.height, pageHeight - y);
  if (width <= 0 || height <= 0) return null;
  return { x, y, width, height };
}