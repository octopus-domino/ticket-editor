/* ============================================================
   shared/schemas/document.ts
   v8: + arc, path, chart, clipPathId, sampleValues
   ============================================================ */

import { z } from 'zod';

export const SCHEMA_LIMITS = {
  MAX_IMPORT_SIZE: 20 * 1024 * 1024,
  MAX_SLIDES: 500,
  MAX_ELEMENTS_PER_SLIDE: 2000,
  MAX_ARRAY_SAMPLE_COUNT: 100,
} as const;

const PaddingSchema = z.object({
  top: z.number(),
  right: z.number(),
  bottom: z.number(),
  left: z.number(),
});

const DocFormatSchema = z.enum(['a4', 'a5', 'a6', 'letter', 'ticket', 'card', 'custom']);
const OrientationSchema = z.enum(['portrait', 'landscape']);
const TextAlignSchema = z.enum(['left', 'center', 'right', 'justify']);
const TextVerticalAlignSchema = z.enum(['top', 'middle', 'bottom']);
const DashTypeSchema = z.enum(['solid', 'dashed', 'dotted', 'dashdot', 'longdash']);
const DataFieldTypeSchema = z.enum(['string', 'number', 'date', 'boolean', 'image', 'object', 'array']);
const AnchorSideSchema = z.enum(['top', 'right', 'bottom', 'left']);
const ConnectorRoutingSchema = z.enum(['straight', 'orthogonal']);
const ChartKindSchema = z.enum(['bar', 'donut']);

const AppearanceFillTypeSchema = z.enum(['solid', 'linear', 'radial']);
const StrokeAlignSchema = z.enum(['center', 'inside', 'outside']);

const GradientStopSchema = z.object({
  offset: z.number().min(0).max(1),
  color: z.string(),
});

const AppearanceFillSchema = z.object({
  id: z.string(),
  type: AppearanceFillTypeSchema,
  color: z.string().optional(),
  stops: z.array(GradientStopSchema).optional(),
  angle: z.number().optional(),
  opacity: z.number().min(0).max(1).optional(),
});

const AppearanceStrokeSchema = z.object({
  id: z.string(),
  color: z.string(),
  width: z.number().nonnegative(),
  dash: DashTypeSchema.optional(),
  align: StrokeAlignSchema.optional(),
});

const AppearanceSchema = z.object({
  fills: z.array(AppearanceFillSchema).optional(),
  strokes: z.array(AppearanceStrokeSchema).optional(),
}).passthrough();

export const DataFieldSchema: z.ZodType<unknown> = z.lazy(() =>
  z.object({
    id: z.string(),
    name: z.string(),
    type: DataFieldTypeSchema,
    sample: z.string().default(''),
    children: z.array(DataFieldSchema).optional(),
    sampleCount: z.number().int().positive().max(SCHEMA_LIMITS.MAX_ARRAY_SAMPLE_COUNT).optional(),
    sampleValues: z.array(z.number()).optional(),
  }).passthrough(),
);

export const DataRootSchema = z.object({
  id: z.string(),
  name: z.string(),
  fields: z.array(DataFieldSchema).default([]),
}).passthrough();

const BaseElementFields = {
  id: z.string(),
  x: z.number(),
  y: z.number(),
  width: z.number().nonnegative(),
  height: z.number().nonnegative(),
  rotation: z.number().default(0),
  locked: z.boolean().optional(),
  appearance: AppearanceSchema.optional(),
  styleId: z.string().nullable().optional(),
  symbolId: z.string().nullable().optional(),
  clipPathId: z.string().nullable().optional(),
};

export const TextElementSchema = z.object({
  ...BaseElementFields,
  type: z.literal('text'),
  text: z.string(),
  html: z.string().optional(),
  richText: z.boolean().optional(),
  fontSize: z.number().positive(),
  fontFamily: z.string(),
  fill: z.string(),
  fontStyle: z.string().default('normal'),
  textDecoration: z.string().default(''),
  align: TextAlignSchema.default('left'),
  verticalAlign: TextVerticalAlignSchema.default('top'),
  lineHeight: z.number().positive().default(1.5),
  padding: PaddingSchema.default({ top: 8, right: 8, bottom: 8, left: 8 }),
  background: z.string().default('transparent'),
  textMode: z.enum(['straight', 'arc']).optional(),
  arcRadius: z.number().optional(),
  arcStartAngle: z.number().optional(),
  arcEndAngle: z.number().optional(),
  arcFlip: z.boolean().optional(),
}).passthrough();

export const ImageElementSchema = z.object({
  ...BaseElementFields,
  type: z.literal('image'),
  src: z.string(),
}).passthrough();

export const ShapeElementSchema = z.object({
  ...BaseElementFields,
  type: z.literal('shape'),
  shape: z.enum(['rect', 'roundRect', 'circle', 'triangle', 'star', 'arrow', 'polygon', 'arc']),
  fill: z.string(),
  stroke: z.string(),
  strokeWidth: z.number().nonnegative(),
  text: z.string().default(''),
  fontSize: z.number().positive().default(16),
  textFill: z.string().default('#111'),
  radius: z.number().nonnegative().optional(),
  textAlign: TextAlignSchema.optional(),
  textVerticalAlign: TextVerticalAlignSchema.optional(),
  textPadding: PaddingSchema.optional(),
  textFontFamily: z.string().optional(),
  textLineHeight: z.number().positive().optional(),
  textFontStyle: z.string().optional(),
  textDecoration: z.string().optional(),
  polygonPoints: z.array(z.number()).optional(),
  polygonSubpaths: z.array(z.array(z.number())).optional(),
  arcStartAngle: z.number().optional(),
  arcEndAngle: z.number().optional(),
  arcInnerRadius: z.number().min(0).max(1).optional(),
  arcOuterRadius: z.number().min(0).max(1).optional(),
  rasterFill: z.object({
    src: z.string(),
    relX: z.number(),
    relY: z.number(),
    relW: z.number(),
    relH: z.number(),
  }).optional(),
}).passthrough();

export const PathElementSchema = z.object({
  ...BaseElementFields,
  type: z.literal('path'),
  d: z.string(),
  fill: z.string(),
  stroke: z.string(),
  strokeWidth: z.number().nonnegative(),
}).passthrough();

export const ChartElementSchema = z.object({
  ...BaseElementFields,
  type: z.literal('chart'),
  chartKind: ChartKindSchema,
  dataPath: z.string().nullable().optional(),
  values: z.array(z.number()).default([]),
  palette: z.array(z.string()).default([]),
  barWidth: z.number().positive().default(40),
  gap: z.number().nonnegative().default(12),
  donutInnerRatio: z.number().min(0).max(1).default(0.5),
}).passthrough();

export const LineElementSchema = z.object({
  ...BaseElementFields,
  type: z.literal('line'),
  points: z.array(z.number()).min(4),
  stroke: z.string(),
  strokeWidth: z.number().nonnegative(),
  dash: DashTypeSchema.default('solid'),
  isArrow: z.boolean().default(false),
}).passthrough();

export const TableElementSchema = z.object({
  ...BaseElementFields,
  type: z.literal('table'),
  rows: z.number().int().positive(),
  cols: z.number().int().positive(),
  data: z.array(z.array(z.string())),
  borderColor: z.string(),
  headerBg: z.string(),
  fontSize: z.number().positive(),
}).passthrough();

export const FooterElementSchema = z.object({
  ...BaseElementFields,
  type: z.literal('footer'),
  text: z.string(),
  html: z.string().optional(),
  fill: z.string(),
  bgColor: z.string(),
  fontSize: z.number().positive(),
}).passthrough();

export const PlaceholderElementSchema = z.object({
  ...BaseElementFields,
  type: z.literal('placeholder'),
  fieldPath: z.string(),
  fieldType: DataFieldTypeSchema,
  sample: z.string().default(''),
  label: z.string().default(''),
  inline: z.boolean().optional(),
  fontSize: z.number().positive(),
  fontFamily: z.string(),
  fill: z.string(),
  fontStyle: z.string().default('normal'),
  textDecoration: z.string().default(''),
  align: TextAlignSchema.default('left'),
  verticalAlign: TextVerticalAlignSchema.default('top'),
  lineHeight: z.number().positive().default(1.2),
  padding: PaddingSchema.default({ top: 4, right: 4, bottom: 4, left: 4 }),
  background: z.string().default('transparent'),
  imageMode: z.enum(['fit', 'fill']).optional(),
  html: z.string().optional(),
}).passthrough();

export const FillElementSchema = z.object({
  ...BaseElementFields,
  type: z.literal('fill'),
  points: z.array(z.number()).min(6),
  fill: z.string(),
  stroke: z.string().default(''),
  strokeWidth: z.number().nonnegative().default(0),
  opacity: z.number().min(0).max(1).default(1),
}).passthrough();

export const DiagramElementSchema = z.object({
  ...BaseElementFields,
  type: z.literal('diagram'),
  svg: z.string(),
  xml: z.string(),
}).passthrough();

export const ConnectorElementSchema = z.object({
  ...BaseElementFields,
  type: z.literal('connector'),
  fromId: z.string(),
  fromAnchor: AnchorSideSchema,
  toId: z.string(),
  toAnchor: AnchorSideSchema,
  stroke: z.string(),
  strokeWidth: z.number().nonnegative(),
  dash: DashTypeSchema.default('solid'),
  isArrow: z.boolean().default(true),
  routing: ConnectorRoutingSchema.default('orthogonal'),
  label: z.string().optional(),
  labelFontSize: z.number().positive().optional(),
  labelFill: z.string().optional(),
  labelOffsetX: z.number().optional(),
  labelOffsetY: z.number().optional(),
}).passthrough();

export const StampElementSchema = z.object({
  ...BaseElementFields,
  type: z.literal('stamp'),
}).passthrough();

export const GroupElementSchema = z.object({
  ...BaseElementFields,
  type: z.literal('group'),
  children: z.array(z.string()),
}).passthrough();

export const CanvasElementSchema = z.discriminatedUnion('type', [
  TextElementSchema,
  ImageElementSchema,
  ShapeElementSchema,
  PathElementSchema,
  ChartElementSchema,
  LineElementSchema,
  TableElementSchema,
  FooterElementSchema,
  PlaceholderElementSchema,
  FillElementSchema,
  DiagramElementSchema,
  ConnectorElementSchema,
  StampElementSchema,
  GroupElementSchema,
]);

export const SlideSchema = z.object({
  id: z.string(),
  name: z.string(),
  format: DocFormatSchema.default('a4'),
  orientation: OrientationSchema.default('portrait'),
  width: z.number().positive(),
  height: z.number().positive(),
  background: z.string().default('#ffffff'),
  backgroundImage: z.string().optional(),
  padding: PaddingSchema.default({ top: 20, right: 20, bottom: 20, left: 20 }),
  elements: z.array(CanvasElementSchema).max(SCHEMA_LIMITS.MAX_ELEMENTS_PER_SLIDE).default([]),
}).passthrough();

export const DocumentSchema = z.object({
  version: z.string().regex(/^\d+\.\d+$/, 'version must be "N.N"').default('2.0'),
  exportedAt: z.string().optional(),
  slides: z.array(SlideSchema).min(1).max(SCHEMA_LIMITS.MAX_SLIDES),
  data: z.array(DataRootSchema).default([]),
  activeSlideId: z.string().optional(),
}).passthrough();

export type ValidatedDocument = z.infer<typeof DocumentSchema>;
export type ValidatedSlide = z.infer<typeof SlideSchema>;
export type ValidatedCanvasElement = z.infer<typeof CanvasElementSchema>;
export type ValidatedDataRoot = z.infer<typeof DataRootSchema>;

export type ValidationResult<T> =
  | { ok: true; value: T }
  | { ok: false; issues: z.ZodIssue[] };

export function validateDocument(raw: unknown): ValidationResult<ValidatedDocument> {
  const result = DocumentSchema.safeParse(raw);
  return result.success
    ? { ok: true, value: result.data }
    : { ok: false, issues: result.error.issues };
}