/**
 * Integration tests for the OCR-draft → Slide pipeline.
 *
 * Contract reminder:
 *   • Security / correctness violations throw (engine, src, overflow, tables, path).
 *   • Syntax normalisation never throws (colors, fonts, shape/QR aliases).
 *   • HTML sanitisation failure degrades to plain text.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { recognizedSlide } from '@/features/image-template/domain/recognizedLayout';
import { RecognitionError } from '@/features/image-template/domain/RecognitionError';
import { CanvasElementSchema } from '@/shared/schemas';

beforeEach(() => {
  // Recognised-HTML failures are best-effort; keep test output clean.
  vi.spyOn(console, 'warn').mockImplementation(() => {});
});

function draft(
  elements: unknown[],
  page: { width: number; height: number } = { width: 800, height: 600 },
) {
  return { ...page, elements, warnings: [], engine: 'ocr' as const };
}

/* ============================================================ */
describe('recognizedSlide — happy path', () => {
  it('builds a Slide from a single text element', () => {
    const { slide, warnings } = recognizedSlide(
      draft([
        {
          type: 'text',
          x: 40,
          y: 40,
          width: 400,
          height: 60,
          properties: { text: 'Hello', fontSize: 24, fill: '#000000' },
        },
      ]),
      'Doc',
    );
    expect(slide.elements).toHaveLength(1);
    expect(slide.elements[0]).toMatchObject({ type: 'text', text: 'Hello' });
    expect(warnings).toEqual([]);
    expect(slide.format).toBe('custom');
  });

  it('produces Zod-valid elements (contract with the editor)', () => {
    const { slide } = recognizedSlide(
      draft([
        {
          type: 'text',
          x: 40,
          y: 40,
          width: 400,
          height: 60,
          properties: { text: 'Hello' },
        },
        {
          type: 'shape',
          x: 0,
          y: 0,
          width: 100,
          height: 50,
          properties: { shape: 'rectangle' },
        },
        {
          type: 'qr',
          x: 100,
          y: 100,
          width: 100,
          height: 100,
          properties: { text: 'https://example.com', format: 'qr' },
        },
      ]),
      'Doc',
    );
    for (const el of slide.elements) {
      expect(() => CanvasElementSchema.parse(el)).not.toThrow();
    }
  });

  it('scales an oversized page (A4 @ 600 dpi) without error', () => {
    const { slide } = recognizedSlide(
      draft(
        [
          {
            type: 'text',
            x: 0,
            y: 0,
            width: 200,
            height: 60,
            properties: { text: 'x' },
          },
        ],
        { width: 4960, height: 7016 },
      ),
      'A4@600dpi',
    );
    expect(slide.width).toBeLessThanOrEqual(1552);
    expect(slide.height).toBeLessThanOrEqual(1552);
    expect(slide.width / slide.height).toBeCloseTo(4960 / 7016, 2);
    expect(slide.orientation).toBe('portrait');
  });

  it('preserves landscape orientation', () => {
    const { slide } = recognizedSlide(
      draft(
        [
          {
            type: 'text',
            x: 0,
            y: 0,
            width: 100,
            height: 40,
            properties: { text: 'x' },
          },
        ],
        { width: 1200, height: 800 },
      ),
      'Landscape',
    );
    expect(slide.orientation).toBe('landscape');
  });
});

/* ============================================================ */
describe('recognizedSlide — normalisation of loose fields', () => {
  it('accepts "italic bold" and stores canonical "bold italic"', () => {
    const { slide } = recognizedSlide(
      draft([
        {
          type: 'text',
          x: 0,
          y: 0,
          width: 200,
          height: 40,
          properties: { text: 'x', fontStyle: 'italic bold' },
        },
      ]),
      'Doc',
    );
    const el = slide.elements[0];
    expect(el.type).toBe('text');
    if (el.type === 'text') expect(el.fontStyle).toBe('bold italic');
  });

  it('converts rgba() fill to hex', () => {
    const { slide } = recognizedSlide(
      draft([
        {
          type: 'text',
          x: 0,
          y: 0,
          width: 200,
          height: 40,
          properties: { text: 'x', fill: 'rgba(32, 40, 62, 0.8)' },
        },
      ]),
      'Doc',
    );
    const el = slide.elements[0];
    if (el.type === 'text') expect(el.fill).toBe('#20283e');
  });

  it('accepts "rectangle" and "square" as rect', () => {
    for (const shape of ['rectangle', 'square', 'Rect']) {
      const { slide } = recognizedSlide(
        draft([
          {
            type: 'shape',
            x: 0,
            y: 0,
            width: 100,
            height: 50,
            properties: { shape },
          },
        ]),
        'Doc',
      );
      expect(slide.elements[0]).toMatchObject({ type: 'shape', shape: 'rect' });
    }
  });

  it('maps "ellipse" to a circle (basic-shape compatibility)', () => {
    const { slide } = recognizedSlide(
      draft([
        {
          type: 'shape',
          x: 0,
          y: 0,
          width: 100,
          height: 100,
          properties: { shape: 'ellipse' },
        },
      ]),
      'Doc',
    );
    expect(slide.elements[0]).toMatchObject({ type: 'shape', shape: 'circle' });
  });

  it('normalises QR format aliases', () => {
    const aliases: Array<[string, string]> = [
      ['qr', 'QR'],
      ['PDF417', 'PDF_417'],
      ['datamatrix', 'DATA_MATRIX'],
      ['Aztec', 'AZTEC'],
    ];
    for (const [input, expected] of aliases) {
      const { slide } = recognizedSlide(
        draft([
          {
            type: 'qr',
            x: 0,
            y: 0,
            width: 100,
            height: 100,
            properties: { text: 'payload', format: input },
          },
        ]),
        'Doc',
      );
      const el = slide.elements[0];
      if (el.type === 'qr') expect(el.format).toBe(expected);
    }
  });

  it('normalises unicode font families to a whitelisted fallback', () => {
    const { slide } = recognizedSlide(
      draft([
        {
          type: 'text',
          x: 0,
          y: 0,
          width: 200,
          height: 40,
          properties: { text: 'x', fontFamily: 'Helvetica, sans-serif' },
        },
      ]),
      'Doc',
    );
    const el = slide.elements[0];
    if (el.type === 'text') expect(el.fontFamily).toBe('Arial');
  });
});

/* ============================================================ */
describe('recognizedSlide — resilience', () => {
  it('keeps text content when HTML markup is rejected by safety limits', () => {
    const deepHtml = '<div>'.repeat(40) + 'Hello' + '</div>'.repeat(40);
    const { slide } = recognizedSlide(
      draft([
        {
          type: 'text',
          x: 0,
          y: 0,
          width: 200,
          height: 40,
          properties: { text: 'Hello', html: deepHtml },
        },
      ]),
      'Doc',
    );
    expect(slide.elements).toHaveLength(1);
    const el = slide.elements[0];
    expect(el.type).toBe('text');
    if (el.type === 'text') {
      expect(el.text).toBe('Hello');
      expect(el.html).toBeUndefined();
    }
  });

  it('caps user-supplied warnings and preserves their order', () => {
    const longWarnings = Array.from({ length: 30 }, (_, i) => `w${i}`);
    const { warnings } = recognizedSlide(
      {
        width: 800,
        height: 600,
        elements: [
          { type: 'text', x: 0, y: 0, width: 100, height: 40, properties: { text: 'x' } },
        ],
        warnings: longWarnings,
        engine: 'ocr',
      },
      'Doc',
    );
    expect(warnings.length).toBeLessThanOrEqual(20);
    expect(warnings[0]).toBe('w0');
  });
});

/* ============================================================ */
describe('recognizedSlide — contract violations', () => {
  it('throws RecognitionError for a non-object draft', () => {
    expect(() => recognizedSlide(null, 'Doc')).toThrow(RecognitionError);
    expect(() => recognizedSlide('not-a-draft', 'Doc')).toThrow(RecognitionError);
    expect(() => recognizedSlide(42, 'Doc')).toThrow(RecognitionError);
  });

  it('throws RecognitionError when the page size is missing or out of range', () => {
    expect(() =>
      recognizedSlide({ elements: [], engine: 'ocr', warnings: [] }, 'Doc'),
    ).toThrow(RecognitionError);
    expect(() =>
      recognizedSlide(
        { width: 0, height: 600, elements: [], engine: 'ocr', warnings: [] },
        'Doc',
      ),
    ).toThrow(RecognitionError);
    expect(() =>
      recognizedSlide(
        { width: 800, height: -1, elements: [], engine: 'ocr', warnings: [] },
        'Doc',
      ),
    ).toThrow(RecognitionError);
  });

  it('throws RecognitionError on unknown engine values', () => {
    expect(() =>
      recognizedSlide(
        { ...draft([{ type: 'text', x: 0, y: 0, width: 100, height: 40, properties: { text: 'x' } }]), engine: 'unknown' as never },
        'Doc',
      ),
    ).toThrow(RecognitionError);
  });

  it('throws RecognitionError when an element fails required-property validation', () => {
    expect(() =>
      recognizedSlide(
        draft([{ type: 'text', x: 10, y: 10, width: 100, height: 50, properties: {} }]),
        'Doc',
      ),
    ).toThrow(RecognitionError);
  });

  it('throws RecognitionError on unknown element types', () => {
    expect(() =>
      recognizedSlide(
        draft([{ type: 'vector', x: 0, y: 0, width: 10, height: 10, properties: {} }]),
        'Doc',
      ),
    ).toThrow(RecognitionError);
  });

  it('throws RecognitionError when an element overflows the page', () => {
    expect(() =>
      recognizedSlide(
        draft([{ type: 'text', x: 900, y: 0, width: 50, height: 50, properties: { text: 'x' } }]),
        'Doc',
      ),
    ).toThrow(RecognitionError);
  });

  it('propagates the code recognition.invalid_result with a human detail', () => {
    try {
      recognizedSlide({ width: 0, height: 0, elements: [] }, 'Doc');
      expect.unreachable('expected rejection');
    } catch (err) {
      expect(err).toBeInstanceOf(RecognitionError);
      const rec = err as RecognitionError;
      expect(rec.code).toBe('recognition.invalid_result');
      expect(typeof rec.detail).toBe('string');
    }
  });
});