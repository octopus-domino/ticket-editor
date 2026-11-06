/**
 * recognition/normalize.ts
 *
 * Pure, side-effect-free adapters between the loose OCR payload and the
 * editor's strict domain types.
 *
 * Scope:
 *   • Only lossless syntax normalisation lives here.
 *   • Security / correctness contracts (engine enum, image src scheme,
 *     page-bounds tolerance, path char-set, ragged tables) are enforced
 *     inside `recognizedLayout.ts` and MUST throw — they do not belong
 *     to this lenient layer.
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

/**
 * A missing/unknown stamp shape falls back to `circle` (the most common
 * seal shape) — unlike `normalizeShape`, which defaults to `rect`.
 * Both defaults are contract with the caller and are asserted by tests.
 */
export function normalizeStampShape(input: unknown): StampShape {
  if (typeof input !== 'string') return 'circle';
  const s = normalizeShape(input);
  if (s === 'rect' || s === 'roundRect') return 'rect';
  if (s === 'circle' || s === 'oval' || s === 'triangle') return s;
  return 'circle';
}

/* ---------- QR ---------- */

export type NormalizedQrFormat = 'QR' | 'DATA_MATRIX' | 'AZTEC' | 'PDF_417';

/**
 * Canonicalise format aliases: strip `_`, `-` and whitespace, then uppercase.
 * This makes `pdf-417`, `PDF_417`, `pdf417` and `PDF 417` all resolve.
 */
export function normalizeQrFormat(input: unknown): NormalizedQrFormat {
  if (typeof input !== 'string') return 'QR';
  const key = input.trim().toUpperCase().replace(/[\s_-]/g, '');
  if (key === 'PDF417') return 'PDF_417';
  if (key === 'QR' || key === 'QRCODE') return 'QR';
  if (key === 'DATAMATRIX') return 'DATA_MATRIX';
  if (key === 'AZTEC') return 'AZTEC';
  return 'QR';
}

export function normalizeChartKind(input: unknown): 'bar' | 'donut' {
  return input === 'donut' ? 'donut' : 'bar';
}

/* ---------- collections ---------- */

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