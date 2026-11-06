import { z } from 'zod';
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

const color = z.string().regex(/^(#[a-f\d]{3}|#[a-f\d]{6}|transparent|none)$/i);
const text = z.string().max(20000);
const properties = z.object({
  text: text.optional(),
  fontSize: z.number().positive().max(512).optional(),
  fill: color.optional(),
  fontStyle: z.enum(['normal', 'bold', 'italic', 'bold italic']).optional(),
  fontFamily: z.enum(['Arial', 'Times New Roman', 'Georgia', 'Verdana', 'Courier New']).optional(),
  align: z.enum(['left', 'center', 'right']).optional(),
  shape: z.enum(['rect', 'roundRect', 'circle', 'oval', 'triangle', 'star', 'arrow']).optional(),
  stroke: color.optional(),
  strokeWidth: z.number().min(0).max(100).optional(),
  radius: z.number().min(0).max(1000).optional(),
  data: z.array(z.array(text).min(1).max(30)).min(1).max(100).optional(),
  borderColor: color.optional(),
  headerBg: color.optional(),
  src: z
    .string()
    .max(12_000_000)
    .regex(/^data:image\/(png|jpeg);base64,[a-z\d+/=]+$/i)
    .optional(),
  topText: text.optional(),
  centerText: text.optional(),
  bottomText: text.optional(),
  stampColor: color.optional(),
  kind: z.enum(['bar', 'donut']).optional(),
  values: z.array(z.number().finite()).max(100).optional(),
  palette: z.array(color).max(100).optional(),
  format: z.enum(['QR', 'DATA_MATRIX', 'AZTEC', 'PDF_417']).optional(),
  d: z
    .string()
    .max(20000)
    .regex(/^[MmZzLlHhVvCcSsQqTtAa\d\s.,+eE-]+$/)
    .optional(),
  bgColor: color.optional(),
  confidence: z.number().finite().optional(),
});
const draftSchema = z.object({
  width: z.number().min(32).max(4096),
  height: z.number().min(32).max(4096),
  elements: z
    .array(
      z.object({
        type: z.enum([
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
        ]),
        x: z.number().nonnegative(),
        y: z.number().nonnegative(),
        width: z.number().positive(),
        height: z.number().positive(),
        properties,
      }),
    )
    .min(1)
    .max(300),
  warnings: z.array(z.string().max(100)).max(20),
  engine: z.enum(['ocr', 'ollama']),
});
export type RecognizedDraft = z.infer<typeof draftSchema>;
export function recognizedSlide(
  input: unknown,
  name: string,
): { slide: Slide; warnings: string[] } {
  const draft = draftSchema.parse(input);
  const scale = Math.min(1, 1552 / Math.max(draft.width, draft.height));
  const margin = 0;
  const slide: Slide = {
    id: crypto.randomUUID(),
    name,
    format: 'custom',
    orientation: draft.width > draft.height ? 'landscape' : 'portrait',
    width: Math.ceil(draft.width * scale) + margin * 2,
    height: Math.ceil(draft.height * scale) + margin * 2,
    padding: { top: margin, right: margin, bottom: margin, left: margin },
    background: '#ffffff',
    elements: [],
  };
  for (const item of draft.elements) {
    if (item.x + item.width > draft.width + 1 || item.y + item.height > draft.height + 1)
      throw new Error('recognition.invalid_result');
    const p = item.properties;
    const bounds = {
      id: crypto.randomUUID(),
      x: margin + item.x * scale,
      y: margin + item.y * scale,
      width: Math.min(item.width, draft.width - item.x) * scale,
      height: Math.min(item.height, draft.height - item.y) * scale,
      rotation: 0,
    };
    const fontSize = (p.fontSize ?? 16) * scale;
    let element: CanvasElement;
    switch (item.type) {
      case 'text': {
        if (p.text === undefined) throw new Error('recognition.invalid_result');
        const longest = Math.max(
          ...p.text
            .split('\n')
            .map((line) =>
              measureText(line, fontSize, p.fontFamily ?? 'Arial', p.fontStyle ?? 'normal'),
            ),
        );
        const fitted = Math.min(
          fontSize,
          (fontSize * bounds.width) / Math.max(1, longest),
          bounds.height / (p.text.split('\n').length * 1.2),
        );
        element = {
          ...newSimpleText(),
          ...bounds,
          text: p.text,
          autoHeight: false,
          fontSize: fitted,
          fontFamily: p.fontFamily ?? 'Arial',
          fontStyle: p.fontStyle ?? 'normal',
          align: p.align ?? 'left',
          fill: p.fill ?? '#202020',
          lineHeight: 1.2,
          padding: { top: 0, right: 0, bottom: 0, left: 0 },
        };
        break;
      }
      case 'shape':
        element = {
          ...newShape(p.shape === 'oval' ? 'circle' : (p.shape ?? 'rect')),
          ...bounds,
          fill: p.fill ?? 'transparent',
          stroke: p.stroke ?? 'none',
          strokeWidth: (p.strokeWidth ?? 0) * scale,
          radius: (p.radius ?? 0) * scale,
        };
        break;
      case 'line':
        element = {
          ...newLine(),
          ...bounds,
          points: [
            0,
            0,
            bounds.width > bounds.height ? bounds.width : 0,
            bounds.height > bounds.width ? bounds.height : 0,
          ],
          stroke: p.stroke ?? '#555555',
          strokeWidth: (p.strokeWidth ?? 1) * scale,
        };
        break;
      case 'table': {
        if (!p.data || p.data.some((row) => row.length !== p.data![0].length))
          throw new Error('recognition.invalid_result');
        element = {
          ...newTable(),
          ...bounds,
          data: p.data,
          rows: p.data.length,
          cols: p.data[0].length,
          fontSize,
          borderColor: p.borderColor ?? '#777777',
          headerBg: p.headerBg ?? '#ffffff',
        };
        break;
      }
      case 'image':
        if (!p.src) throw new Error('recognition.invalid_result');
        element = { type: 'image', ...bounds, src: p.src };
        break;
      case 'stamp': {
        const shape =
          p.shape && ['circle', 'oval', 'rect', 'triangle'].includes(p.shape)
            ? (p.shape as 'circle' | 'oval' | 'rect' | 'triangle')
            : 'circle';
        element = {
          ...newStamp(shape),
          ...bounds,
          topText: p.topText ?? '',
          centerText: p.centerText ?? '',
          bottomText: p.bottomText ?? '',
          stampColor: p.stampColor ?? '#244f91',
        };
        break;
      }
      case 'chart':
        if (!p.values?.length) throw new Error('recognition.invalid_result');
        element = {
          ...newChart(p.kind ?? 'bar'),
          ...bounds,
          values: p.values,
          palette: p.palette?.length ? p.palette : ['#244f91', '#e76837'],
        };
        break;
      case 'qr':
        if (!p.text) throw new Error('recognition.invalid_result');
        element = { ...newQr(), ...bounds, text: p.text, format: p.format ?? 'QR' };
        break;
      case 'path':
        if (!p.d) throw new Error('recognition.invalid_result');
        // Path coordinates are local to the object's original bounding box.
        element = {
          ...newPath(),
          ...bounds,
          d: scalePath(p.d, scale),
          fill: p.fill ?? 'none',
          stroke: p.stroke ?? '#202020',
          strokeWidth: (p.strokeWidth ?? 1) * scale,
        };
        break;
      case 'footer':
        element = {
          ...newFooter(slide),
          ...bounds,
          text: p.text ?? '',
          fontSize,
          fill: p.fill ?? '#202020',
          bgColor: p.bgColor ?? '#ffffff',
        };
        break;
    }
    slide.elements.push(CanvasElementSchema.parse(element) as CanvasElement);
  }
  return { slide, warnings: draft.warnings };
}

function scalePath(d: string, scale: number): string {
  let command = '';
  let index = 0;
  return d.replace(
    /[MmZzLlHhVvCcSsQqTtAa]|[-+]?(?:\d*\.\d+|\d+\.?\d*)(?:[eE][-+]?\d+)?/g,
    (token) => {
      if (/^[a-z]$/i.test(token)) {
        command = token.toUpperCase();
        index = 0;
        return token;
      }
      const position = index++ % 7;
      return command === 'A' && [2, 3, 4].includes(position)
        ? token
        : String(Number(token) * scale);
    },
  );
}
