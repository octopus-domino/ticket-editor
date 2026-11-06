import { describe, expect, it } from 'vitest';
import {
  DEFAULT_FONT,
  DEFAULT_TEXT_COLOR,
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
} from '@/features/image-template/domain/normalize';

describe('normalizeColor', () => {
  it('keeps canonical 3- and 6-digit hex, lowercases', () => {
    expect(normalizeColor('#abc')).toBe('#abc');
    expect(normalizeColor('#ABCDEF')).toBe('#abcdef');
    expect(normalizeColor('  #112233  ')).toBe('#112233');
  });

  it('drops the alpha channel from 8-digit hex', () => {
    expect(normalizeColor('#11223344')).toBe('#112233');
    expect(normalizeColor('#AABBCCDD')).toBe('#aabbcc');
  });

  it('converts rgb() and rgba() to hex', () => {
    expect(normalizeColor('rgb(32, 40, 62)')).toBe('#20283e');
    expect(normalizeColor('rgba(32, 40, 62, 0.8)')).toBe('#20283e');
    expect(normalizeColor('rgba(255, 0, 0, 0)')).toBe('#ff0000');
  });

  it('maps common named colors', () => {
    expect(normalizeColor('black')).toBe('#000000');
    expect(normalizeColor('WHITE')).toBe('#ffffff');
    expect(normalizeColor('gray')).toBe('#808080');
    expect(normalizeColor('transparent')).toBe('transparent');
    expect(normalizeColor('none')).toBe('none');
  });

  it('falls back to the default for unknown input', () => {
    expect(normalizeColor(undefined)).toBe(DEFAULT_TEXT_COLOR);
    expect(normalizeColor('definitely-not-a-color')).toBe(DEFAULT_TEXT_COLOR);
    expect(normalizeColor('')).toBe(DEFAULT_TEXT_COLOR);
    expect(normalizeColor(123)).toBe(DEFAULT_TEXT_COLOR);
    expect(normalizeColor(null)).toBe(DEFAULT_TEXT_COLOR);
  });

  it('honours an explicit fallback', () => {
    expect(normalizeColor('nope', 'transparent')).toBe('transparent');
    expect(normalizeColor(undefined, '#123456')).toBe('#123456');
  });
});

describe('normalizeFontFamily', () => {
  it('passes through whitelisted families case-insensitively', () => {
    expect(normalizeFontFamily('Arial')).toBe('Arial');
    expect(normalizeFontFamily('times new roman')).toBe('Times New Roman');
    expect(normalizeFontFamily('VERDANA')).toBe('Verdana');
    expect(normalizeFontFamily('"Courier New"')).toBe('Courier New');
  });

  it('picks the first family from a CSS font stack', () => {
    expect(normalizeFontFamily('Arial, sans-serif')).toBe('Arial');
    expect(normalizeFontFamily('Helvetica, Arial, sans-serif')).toBe('Arial');
    expect(normalizeFontFamily("'Times New Roman', serif")).toBe('Times New Roman');
  });

  it('infers a family from serif / mono / sans hints', () => {
    expect(normalizeFontFamily('Garamond, serif')).toBe('Georgia');
    expect(normalizeFontFamily('Menlo, monospace')).toBe('Courier New');
    expect(normalizeFontFamily('system-ui, sans-serif')).toBe('Arial');
    expect(normalizeFontFamily('Tahoma, sans-serif')).toBe('Verdana');
  });

  it('falls back to the default font for unknown input', () => {
    expect(normalizeFontFamily(undefined)).toBe(DEFAULT_FONT);
    expect(normalizeFontFamily('')).toBe(DEFAULT_FONT);
    expect(normalizeFontFamily('Roboto')).toBe(DEFAULT_FONT);
    expect(normalizeFontFamily(42)).toBe(DEFAULT_FONT);
  });
});

describe('normalizeFontStyle', () => {
  it.each([
    ['normal', 'normal'],
    ['bold', 'bold'],
    ['italic', 'italic'],
    ['bold italic', 'bold italic'],
    ['italic bold', 'bold italic'],
    ['oblique', 'italic'],
    ['700', 'bold'],
    ['800', 'bold'],
    ['', 'normal'],
    [undefined, 'normal'],
  ] as const)('%s -> %s', (input, expected) => {
    expect(normalizeFontStyle(input)).toBe(expected);
  });
});

describe('normalizeTextDecoration', () => {
  it('extracts underline and line-through in canonical order', () => {
    expect(normalizeTextDecoration('underline')).toBe('underline');
    expect(normalizeTextDecoration('line-through')).toBe('line-through');
    expect(normalizeTextDecoration('strikethrough')).toBe('line-through');
    expect(normalizeTextDecoration('line-through underline')).toBe('underline line-through');
    expect(normalizeTextDecoration('none')).toBe('');
    expect(normalizeTextDecoration('')).toBe('');
    expect(normalizeTextDecoration(undefined)).toBe('');
  });
});

describe('normalizeAlign', () => {
  it.each([
    ['left', 'left'],
    ['center', 'center'],
    ['right', 'right'],
    ['justify', 'justify'],
    ['CENTER', 'center'],
    ['bogus', 'left'],
    [undefined, 'left'],
  ] as const)('%s -> %s', (input, expected) => {
    expect(normalizeAlign(input)).toBe(expected);
  });
});

describe('normalizeShape', () => {
  it.each([
    ['rect', 'rect'],
    ['rectangle', 'rect'],
    ['square', 'rect'],
    ['roundRect', 'roundRect'],
    ['round_rect', 'roundRect'],
    ['rounded', 'roundRect'],
    ['circle', 'circle'],
    ['round', 'circle'],
    ['ellipse', 'oval'],
    ['oval', 'oval'],
    ['ellipsis', 'oval'],
    ['triangle', 'triangle'],
    ['star', 'star'],
    ['arrow', 'arrow'],
    ['not-a-shape', 'rect'],
    [undefined, 'rect'],
    [42, 'rect'],
  ] as const)('%s -> %s', (input, expected) => {
    expect(normalizeShape(input)).toBe(expected);
  });
});

describe('normalizeStampShape', () => {
  it.each([
    ['circle', 'circle'],
    ['oval', 'oval'],
    ['ellipse', 'oval'],
    ['rect', 'rect'],
    ['rectangle', 'rect'],
    ['roundRect', 'rect'],
    ['triangle', 'triangle'],
    ['star', 'circle'],
    [undefined, 'circle'],
  ] as const)('%s -> %s', (input, expected) => {
    expect(normalizeStampShape(input)).toBe(expected);
  });
});

describe('normalizeQrFormat', () => {
  it.each([
    ['QR', 'QR'],
    ['qr', 'QR'],
    ['QR_CODE', 'QR'],
    ['qrcode', 'QR'],
    ['PDF417', 'PDF_417'],
    ['pdf-417', 'PDF_417'],
    ['PDF_417', 'PDF_417'],
    ['datamatrix', 'DATA_MATRIX'],
    ['DATA_MATRIX', 'DATA_MATRIX'],
    ['Aztec', 'AZTEC'],
    ['bogus', 'QR'],
    [undefined, 'QR'],
  ] as const)('%s -> %s', (input, expected) => {
    expect(normalizeQrFormat(input)).toBe(expected);
  });
});

describe('normalizeChartKind', () => {
  it('accepts only bar and donut', () => {
    expect(normalizeChartKind('bar')).toBe('bar');
    expect(normalizeChartKind('donut')).toBe('donut');
    expect(normalizeChartKind('pie')).toBe('bar');
    expect(normalizeChartKind(undefined)).toBe('bar');
  });
});

describe('normalizeNumberArray', () => {
  it('coerces string numbers and filters non-finite values', () => {
    expect(normalizeNumberArray([1, 2, 3])).toEqual([1, 2, 3]);
    expect(normalizeNumberArray(['1', '2.5', 'x', NaN, Infinity])).toEqual([1, 2.5]);
    expect(normalizeNumberArray('nope')).toEqual([]);
    expect(normalizeNumberArray(null)).toEqual([]);
    expect(normalizeNumberArray(undefined)).toEqual([]);
  });

  it('truncates to the requested maximum', () => {
    const long = Array.from({ length: 200 }, (_, i) => i);
    expect(normalizeNumberArray(long, 10)).toHaveLength(10);
    expect(normalizeNumberArray(long, 10)[0]).toBe(0);
    expect(normalizeNumberArray(long, 10)[9]).toBe(9);
  });
});

describe('normalizePalette', () => {
  it('keeps valid colors and drops invalid ones', () => {
    expect(normalizePalette(['#fff', 'rgba(0,0,0,1)', 'bogus'])).toEqual(['#fff', '#000000']);
  });

  it('returns the default palette for empty or invalid input', () => {
    expect(normalizePalette(null)).toEqual(['#244f91', '#e76837']);
    expect(normalizePalette([])).toEqual(['#244f91', '#e76837']);
    expect(normalizePalette(['bogus'])).toEqual(['#244f91', '#e76837']);
  });
});

describe('numberInRange', () => {
  it('clamps and falls back', () => {
    expect(numberInRange(150, 0, 100, 50)).toBe(100);
    expect(numberInRange(-10, 0, 100, 50)).toBe(0);
    expect(numberInRange('42', 0, 100, 50)).toBe(42);
    expect(numberInRange('x', 0, 100, 50)).toBe(50);
    expect(numberInRange(undefined, 0, 100, 50)).toBe(50);
    expect(numberInRange(Infinity, 0, 100, 50)).toBe(50);
  });
});