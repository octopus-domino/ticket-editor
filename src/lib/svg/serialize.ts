/* ============================================================
   lib/svg/serialize.ts (v8)
   + path, chart, clipPath defs
   ============================================================ */

import type { Slide } from '@/shared/types';
import { escapeXml } from './escape';
import {
  toSvgText, toSvgShape, toSvgLine, toSvgTable, toSvgImage,
  toSvgFooter, toSvgPlaceholder, toSvgFill, toSvgConnector,
  toSvgDiagram, toSvgStamp, toSvgPath, toSvgChart,
  collectGradientDefs, collectClipDefs,
} from './exporters';

export function serializeSlideToSvg(slide: Slide): string {
  const { width, height, background, elements } = slide;

  const gradientDefs = collectGradientDefs(elements);
  const clipDefs = collectClipDefs(elements);

  const fills      = elements.filter((e) => e.type === 'fill');
  const connectors = elements.filter((e) => e.type === 'connector');
  const others     = elements.filter((e) => e.type !== 'fill' && e.type !== 'connector');

  let elementsSvg = '';

  fills.forEach((el) => {
    if (el.type === 'fill') elementsSvg += toSvgFill(el);
  });

  connectors.forEach((el) => {
    if (el.type === 'connector') elementsSvg += toSvgConnector(el, elements);
  });

  others.forEach((el) => {
    let inner = '';
    switch (el.type) {
      case 'text':        inner = toSvgText(el); break;
      case 'shape':       inner = toSvgShape(el); break;
      case 'path':        inner = toSvgPath(el); break;
      case 'chart':       inner = toSvgChart(el); break;
      case 'line':        inner = toSvgLine(el); break;
      case 'table':       inner = toSvgTable(el); break;
      case 'image':       inner = toSvgImage(el); break;
      case 'footer':      inner = toSvgFooter(el); break;
      case 'placeholder': inner = toSvgPlaceholder(el); break;
      case 'diagram':     inner = toSvgDiagram(el); break;
      case 'stamp':       inner = toSvgStamp(el); break;
      default: break;
    }
    if (!inner) return;
    if (el.clipPathId) {
      elementsSvg += `<g clip-path="url(#clip-${escapeXml(el.id)})">${inner}</g>`;
    } else {
      elementsSvg += inner;
    }
  });

  const defs = [gradientDefs, clipDefs].filter(Boolean).join('');
  const defsBlock = defs ? `\n  <defs>${defs}</defs>` : '';

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">${defsBlock}
  <rect width="${width}" height="${height}" fill="${escapeXml(background)}" />
  ${elementsSvg}
</svg>`;
}