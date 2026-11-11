import { DocumentSchema, CanvasElementSchema } from '@/shared/schemas/document';
import { newSlide, newShape } from '@/lib/factories';
import { newStampFromTemplate } from '@/lib/stamps/factories';
import type { StampTemplate } from '@/lib/stamps/types';
import type { CanvasElement, AppearanceFill, AppearanceStroke } from '@/shared/types';
import { validateAsset, type Asset } from './assets';
import { t } from '@/shared/i18n';

/** Produce document content independently of storage, routing and library state. */
export function assetDocument(input: Asset, libraryAssets: Asset[] = []): string {
  const asset = validateAsset(input);
  if (asset.kind === 'template') {
    const payload = asset.payload as { slides: unknown[]; bindings: unknown[] };
    const result = DocumentSchema.parse({
      version: '2.0',
      slides: payload.slides,
      bindings: payload.bindings,
      data: [],
    });
    return JSON.stringify({ ...result, activeId: result.slides[0].id });
  }
  const slide = newSlide(1);
  let element: CanvasElement;
  if (asset.kind === 'stamp')
    element = newStampFromTemplate(asset.payload as StampTemplate, 40, 40);
  else if (asset.kind === 'symbol') {
    const prototype = (asset.payload as { prototype: CanvasElement }).prototype;
    if (prototype.type === 'group' || prototype.type === 'connector' || prototype.clipPathId)
      throw new Error(t('Use a complete template for linked elements.'));
    const linkedStyle = prototype.styleId
      ? libraryAssets.find(
          (entry) =>
            ['style', 'brand'].includes(entry.kind) &&
            (entry.payload as { id?: string } | undefined)?.id === prototype.styleId,
        )
      : undefined;
    if (prototype.styleId && !linkedStyle)
      throw new Error(t('Use a complete template for linked elements.'));
    const appearance = linkedStyle
      ? (validateAsset(linkedStyle).payload as {
          fills: AppearanceFill[];
          strokes: AppearanceStroke[];
        })
      : prototype.appearance;
    element = CanvasElementSchema.parse({
      ...structuredClone(prototype),
      id: crypto.randomUUID(),
      x: 40,
      y: 40,
      symbolId: undefined,
      styleId: undefined,
      appearance: appearance ? structuredClone(appearance) : undefined,
    }) as CanvasElement;
  } else if (asset.kind === 'style' || asset.kind === 'brand') {
    const style = asset.payload as { fills: AppearanceFill[]; strokes: AppearanceStroke[] };
    element = {
      ...newShape('rect', 40, 40),
      appearance: { fills: structuredClone(style.fills), strokes: structuredClone(style.strokes) },
    };
  } else throw new Error(t('Choose a material instead of a folder.'));
  // Preserve source geometry without placing an oversized material outside its page.
  if (element.width > 2000 || element.height > 2000)
    throw new Error(t('This material is too large for a new document.'));
  if (element.width + 80 > slide.width || element.height + 80 > slide.height) {
    slide.width = Math.max(slide.width, element.width + 80);
    slide.height = Math.max(slide.height, element.height + 80);
    slide.format = 'custom';
  }
  slide.elements.push(element);
  return JSON.stringify({
    version: '2.0',
    slides: [slide],
    activeId: slide.id,
    data: [],
    bindings: [],
  });
}
