import type { StampElement, StampShapeItem, StampTextItem } from '@/shared/types';
import { escapeXml as e } from './escape';
import { arcGlyphLayout, STAMP_DASH_MAP } from '../stamps/render';
import { shapeContainsPoint } from '../stamps/geometry/findShape';

const paint = (value?: string) => !value || value === 'transparent' ? 'none' : e(value);
function geometry(shape: StampShapeItem, attributes = ''): string {
  const { x, y, width: w, height: h } = shape;
  const rotate = shape.rotation ? ` transform="rotate(${shape.rotation} ${x} ${y})"` : '';
  if (shape.kind === 'circle' || shape.kind === 'ellipse') return `<ellipse cx="${x + w / 2}" cy="${y + h / 2}" rx="${w / 2}" ry="${h / 2}"${rotate} ${attributes}/>`;
  if (shape.kind === 'triangle') return `<polygon points="${x + w / 2},${y} ${x + w},${y + h} ${x},${y + h}"${rotate} ${attributes}/>`;
  if (shape.kind === 'line') {
    const points = shape.points ?? [0,0,w,0];
    return `<polyline points="${Array.from({ length: points.length / 2 }, (_, i) => `${x + points[i * 2]},${y + points[i * 2 + 1]}`).join(' ')}"${rotate} ${attributes}/>`;
  }
  return `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${Math.max(0, shape.cornerRadius ?? 0)}"${rotate} ${attributes}/>`;
}
function textSvg(text: StampTextItem, shapes: StampShapeItem[]): string {
  const styles = `font-family="${e(text.fontFamily)}" font-size="${text.fontSize}" font-weight="${text.fontStyle.includes('bold') ? '700' : '400'}" font-style="${text.fontStyle.includes('italic') ? 'italic' : 'normal'}" text-decoration="${e(text.textDecoration)}" fill="${paint(text.fill)}"`;
  if (text.mode === 'arc') {
    const host = shapes.find((shape) => shape.id === text.arcHostId);
    const offset = text.arcOffset ?? 6, sign = text.arcOutside ? 1 : -1;
    const rx = text.arcRx ?? (host?.kind === 'ellipse' ? Math.max(text.fontSize * .8, host.width / 2 + sign * offset) : text.arcRadius);
    const ry = text.arcRy ?? (host?.kind === 'ellipse' ? Math.max(text.fontSize * .8, host.height / 2 + sign * offset) : text.arcRadius);
    return arcGlyphLayout(text.text, rx, ry, text.arcStartDeg, text.arcEndDeg).map((glyph) => `<text ${styles} x="0" y="0" text-anchor="middle" dominant-baseline="middle" transform="translate(${text.arcCx + glyph.x} ${text.arcCy + glyph.y}) rotate(${glyph.rotation * 180 / Math.PI})">${e(glyph.char)}</text>`).join('');
  }
  const anchor = text.align === 'center' ? 'middle' : text.align === 'right' ? 'end' : 'start';
  const x = text.x + (text.align === 'center' ? text.width / 2 : text.align === 'right' ? text.width : 0);
  return text.text.split('\n').map((line, index) => `<text ${styles} x="${x}" y="${text.y + text.fontSize + index * text.fontSize * 1.2}" text-anchor="${anchor}" xml:space="preserve">${e(line)}</text>`).join('');
}
export function stampContentSvg(stamp: StampElement): string {
  const shapes = stamp.shapes ?? [], byId = new Map(shapes.map((shape) => [shape.id, shape]));
  let result = '';
  for (const fill of shapes.filter((shape) => shape.kind === 'fill' && !shape.hidden)) {
    const target = byId.get(fill.fillTargetShapeId ?? fill.fillOuterId ?? '');
    if (!target) continue;
    const ax = target.x + (fill.fillAnchorLocal?.x ?? .5) * target.width, ay = target.y + (fill.fillAnchorLocal?.y ?? .5) * target.height;
    const holes = fill.fillHoleIds ? fill.fillHoleIds.map((id) => byId.get(id)).filter((shape): shape is StampShapeItem => Boolean(shape)) : shapes.filter((shape) => shape.id !== target.id && !shape.hidden && shape.kind !== 'line' && shape.kind !== 'fill' && shape.strokeWidth > 0 && shape.x >= target.x && shape.y >= target.y && shape.x + shape.width <= target.x + target.width && shape.y + shape.height <= target.y + target.height && !shapeContainsPoint(shape, ax, ay));
    const clip = `stamp-clip-${stamp.id}-${fill.id}`, mask = `stamp-mask-${stamp.id}-${fill.id}`;
    result += `<defs><clipPath id="${e(clip)}" clipPathUnits="userSpaceOnUse">${geometry(target)}</clipPath><mask id="${e(mask)}" maskUnits="userSpaceOnUse" x="0" y="0" width="${stamp.width}" height="${stamp.height}"><rect width="${stamp.width}" height="${stamp.height}" fill="white"/>${holes.map((shape) => geometry(shape, 'fill="black"')).join('')}</mask></defs><rect width="${stamp.width}" height="${stamp.height}" fill="${paint(fill.fill)}" clip-path="url(#${e(clip)})" mask="url(#${e(mask)})"/>`;
  }
  for (const shape of shapes) {
    if (shape.hidden || shape.kind === 'fill') continue;
    const dash = STAMP_DASH_MAP[shape.dash];
    result += geometry(shape, `fill="${shape.kind === 'line' ? 'none' : paint(shape.fill)}" stroke="${paint(shape.stroke)}" stroke-width="${shape.strokeWidth}"${dash?.length ? ` stroke-dasharray="${dash.join(' ')}"` : ''}`);
  }
  for (const image of stamp.images ?? []) {
    if (image.hidden || !image.src) continue;
    const fit = image.fit === 'fill' ? 'none' : image.fit === 'cover' ? 'xMidYMid slice' : 'xMidYMid meet';
    result += `<image href="${e(image.src)}" xlink:href="${e(image.src)}" x="${image.x}" y="${image.y}" width="${image.width}" height="${image.height}" preserveAspectRatio="${fit}" overflow="hidden" transform="rotate(${image.rotation ?? 0} ${image.x} ${image.y})"/>`;
  }
  for (const text of stamp.texts ?? []) if (!text.hidden) result += textSvg(text, shapes);
  return result;
}
