import { z } from 'zod';

/**
 * Post-normalisation contract. Every value here has already passed through
 * `normalize.ts`, so the schema is a bug detector / documentation, not a
 * rejector of external data. Structure only — semantic validation lives
 * in the normalisers.
 */
export const ELEMENT_TYPES = [
  'text',
  'shape',
  'line',
  'table',
  'image',
  'stamp',
  'chart',
  'qr',
  'path',
  'footer',
] as const;

export type ElementType = (typeof ELEMENT_TYPES)[number];

export const MAX_PAGE_DIMENSION = 16_384;

export const draftSchema = z
  .object({
    width: z.number().positive().max(MAX_PAGE_DIMENSION),
    height: z.number().positive().max(MAX_PAGE_DIMENSION),
    elements: z
      .array(
        z.object({
          type: z.enum(ELEMENT_TYPES),
          x: z.number().finite(),
          y: z.number().finite(),
          width: z.number().positive(),
          height: z.number().positive(),
          properties: z.record(z.string(), z.unknown()).default({}),
        }),
      )
      .min(1)
      .max(300),
    warnings: z.array(z.string().max(100)).max(20).default([]),
    engine: z.enum(['ocr', 'ollama', 'dual']).default('ocr'),
  })
  .passthrough();

export type RecognizedDraft = z.infer<typeof draftSchema>;
export type RecognizedElement = RecognizedDraft['elements'][number];