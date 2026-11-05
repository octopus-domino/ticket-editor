import { z } from 'zod';
import { CanvasElementSchema } from '@/shared/schemas/document';
import { loadCustomStamps, type StampTemplate } from '@/lib/stamps/library';

const name = z.string().min(1).max(200);
const number = z.number().finite();
const color = z.string().regex(/^#[a-f\d]{3,8}$/i);
const fill = z.object({
  id: name,
  type: z.enum(['solid', 'linear', 'radial']),
  color: color.optional(),
  stops: z
    .array(z.object({ offset: number.min(0).max(1), color }))
    .max(20)
    .optional(),
  angle: number.optional(),
  opacity: number.min(0).max(1).optional(),
});
const stroke = z.object({
  id: name,
  color,
  width: number.min(0).max(1000),
  dash: z.enum(['solid', 'dashed', 'dotted', 'dashdot', 'longdash']).optional(),
  align: z.enum(['center', 'inside', 'outside']).optional(),
});
const style = z.object({
  id: name,
  name,
  fills: z.array(fill).max(20),
  strokes: z.array(stroke).max(20),
});
const stamp = z
  .object({
    id: name,
    name,
    width: number.positive().max(10000),
    height: number.positive().max(10000),
    shapes: z
      .array(
        z
          .object({
            id: name,
            kind: z.enum(['circle', 'ellipse', 'rect', 'triangle', 'line', 'fill']),
            x: number,
            y: number,
            width: number,
            height: number,
          })
          .passthrough(),
      )
      .max(500),
    texts: z
      .array(
        z
          .object({
            id: name,
            text: z.string().max(20000),
            mode: z.enum(['straight', 'arc']),
            x: number,
            y: number,
            width: number,
            fontSize: number.positive().max(1000),
            fontFamily: z.string().max(200),
          })
          .passthrough(),
      )
      .max(500),
    images: z
      .array(
        z.object({ id: name, x: number, y: number, width: number, height: number }).passthrough(),
      )
      .max(50)
      .optional(),
  })
  .passthrough();
export interface Asset {
  id: string;
  name: string;
  kind: 'folder' | 'stamp' | 'style' | 'symbol' | 'template' | 'brand';
  folderId?: string;
  locked?: boolean;
  payload?: unknown;
}
function safe(value: unknown, depth = 0, allowSymbol = false, path = ''): boolean {
  if (depth > 30) return false;
  if (typeof value === 'string' && /^(?:https?:|javascript:|data:|blob:|file:)/i.test(value))
    return /^data:image\/(?:png|jpeg);base64,[A-Za-z\d+/=]+$/.test(value);
  return (
    !value ||
    typeof value !== 'object' ||
    Object.entries(value).every(
      ([key, item]) =>
        (!['__proto__', 'constructor', 'prototype'].includes(key) ||
          (key === 'prototype' && allowSymbol && path === 'payload')) &&
        safe(item, depth + 1, allowSymbol, path ? `${path}.${key}` : key),
    )
  );
}
export function validateAsset(asset: Asset): Asset {
  if (!safe(asset, 0, asset.kind === 'symbol')) throw new Error('Unsafe library asset');
  const base = z
    .object({
      id: name,
      name,
      kind: z.enum(['folder', 'stamp', 'style', 'symbol', 'template', 'brand']),
      folderId: z.string().optional(),
      locked: z.boolean().optional(),
      payload: z.unknown().optional(),
    })
    .parse(asset);
  if (base.kind === 'stamp') base.payload = stamp.parse(base.payload);
  if (base.kind === 'style' || base.kind === 'brand') base.payload = style.parse(base.payload);
  if (base.kind === 'symbol')
    base.payload = z.object({ id: name, name, prototype: CanvasElementSchema }).parse(base.payload);
  if (base.kind === 'template')
    base.payload = z
      .object({
        name,
        slides: z.array(z.unknown()).min(1).max(500),
        bindings: z.array(z.unknown()).max(10000).default([]),
      })
      .parse(base.payload);
  return base;
}
export function captureAssets(): Asset[] {
  const raw = JSON.parse(
    localStorage.getItem('ticket-editor:graphics:v1') ?? '{"styles":[],"symbols":[]}',
  ) as { styles: { id: string; name: string }[]; symbols: { id: string; name: string }[] };
  return [
    ...loadCustomStamps().map((payload) => ({
      id: `stamp:${payload.id}`,
      name: payload.name,
      kind: 'stamp' as const,
      payload,
    })),
    ...raw.styles.map((payload) => ({
      id: `style:${payload.id}`,
      name: payload.name,
      kind: 'style' as const,
      payload,
    })),
    ...raw.symbols.map((payload) => ({
      id: `symbol:${payload.id}`,
      name: payload.name,
      kind: 'symbol' as const,
      payload,
    })),
  ].map(validateAsset);
}
/** Append copies: conflicts never replace local assets. Stores are read on the next editor mount. */
export function installAssets(assets: Asset[]): number {
  const checked = assets
    .filter((a) => ['stamp', 'style', 'symbol', 'brand'].includes(a.kind))
    .map(validateAsset);
  const stamps = loadCustomStamps();
  const graphics = JSON.parse(
    localStorage.getItem('ticket-editor:graphics:v1') ?? '{"styles":[],"symbols":[]}',
  ) as { styles: unknown[]; symbols: unknown[] };
  const oldStamps = localStorage.getItem('stamp_library_v1');
  const oldGraphics = localStorage.getItem('ticket-editor:graphics:v1');
  const ids = new Map<string, string>();
  // Collect all IDs first: a symbol can reference a style that appears later in the payload.
  function collect(value: unknown) {
    if (!value || typeof value !== 'object') return;
    const record = value as Record<string, unknown>;
    if (typeof record.id === 'string' && !ids.has(record.id))
      ids.set(record.id, crypto.randomUUID());
    Object.values(value).forEach(collect);
  }
  function clone(value: unknown): unknown {
    if (Array.isArray(value)) return value.map(clone);
    if (!value || typeof value !== 'object') return value;
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [
        key,
        typeof item === 'string' &&
        ['id', 'styleId', 'symbolId', 'clipPathId', 'parentId', 'fromId', 'toId'].includes(key)
          ? (ids.get(item) ?? item)
          : clone(item),
      ]),
    );
  }
  checked.forEach((asset) => collect(asset.payload));
  for (const asset of checked) {
    const payload = { ...(clone(asset.payload) as Record<string, unknown>), name: asset.name };
    if (asset.kind === 'stamp') stamps.push({ ...payload, custom: true } as StampTemplate);
    else if (asset.kind === 'symbol') graphics.symbols.push(payload);
    else graphics.styles.push(payload);
  }
  try {
    localStorage.setItem('ticket-editor:graphics:v1', JSON.stringify(graphics));
    localStorage.setItem('stamp_library_v1', JSON.stringify(stamps));
  } catch (error) {
    // Both stores form one local installation. Restore the previous pair if either write fails.
    if (oldGraphics === null) localStorage.removeItem('ticket-editor:graphics:v1');
    else localStorage.setItem('ticket-editor:graphics:v1', oldGraphics);
    if (oldStamps === null) localStorage.removeItem('stamp_library_v1');
    else localStorage.setItem('stamp_library_v1', oldStamps);
    throw error;
  }
  return checked.length;
}
