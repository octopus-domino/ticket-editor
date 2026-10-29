/* ============================================================
   lib/svg/exporters.ts
   ============================================================ */

import type {
  TextElement, ShapeElement, LineElement, TableElement, ImageElement,
  FooterElement, PlaceholderElement, FillElement, ConnectorElement,
  DiagramElement, StampElement, PathElement, ChartElement, CanvasElement,
  QrElement,
} from '@/shared/types';
import { escapeXml } from './escape';
import { resolveConnectorEnds, routeConnector } from '../connectors';
import { parseHtmlToBlocks } from '../richText/parser';
import { layoutRuns } from '../richText/layout';
import { computeTableLayout } from '../richText/tableLayout';
import type { BorderSide } from '../richText/types';
import { fillToSvg, strokeToSvg } from '../graphics/fills';
import { computeBarGeometry, computeDonutGeometry, CHART_PALETTE } from '../graphics/charts';

/* ---------- helpers ---------- */

/**
 * Оборачивает SVG-контент элемента в группу с трансформациями.
 * Контент должен быть нарисован в ЛОКАЛЬНЫХ координатах (от 0,0).
 */
function wrapTransform(el: CanvasElement, content: string): string {
  const x = el.x || 0;
  const y = el.y || 0;
  const rot = el.rotation || 0;
  const flipX = el.flipX ? -1 : 1;
  const flipY = el.flipY ? -1 : 1;
  
  const tx = x + (el.flipX ? el.width : 0);
  const ty = y + (el.flipY ? el.height : 0);

  if (tx === 0 && ty === 0 && rot === 0 && flipX === 1 && flipY === 1) return content;

  const transforms = [`translate(${tx}, ${ty})`];
  if (rot) transforms.push(`rotate(${rot})`);
  if (flipX !== 1 || flipY !== 1) transforms.push(`scale(${flipX}, ${flipY})`);
  
  return `<g transform="${transforms.join(' ')}">${content}</g>`;
}

function isSideVisible(side: BorderSide | undefined): side is BorderSide {
  if (!side) return false;
  if (side.style === 'none') return false;
  return (side.width ?? 1) > 0;
}

function sideDash(style: string | undefined): string {
  if (!style) return '';
  switch (style.toLowerCase()) {
    case 'dashed': return ' stroke-dasharray="4,4"';
    case 'dotted': return ' stroke-dasharray="2,3"';
    default: return '';
  }
}

function appendSide(
  out: string,
  side: BorderSide | undefined,
  x1: number, y1: number, x2: number, y2: number,
): string {
  if (!isSideVisible(side)) return out;
  const color = side.color || '#000000';
  const width = side.width ?? 1;
  return out
    + `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" `
    + `stroke="${escapeXml(color)}" stroke-width="${width}"${sideDash(side.style)}/>`;
}

/* ---------- Appearance defs ---------- */

export function collectGradientDefs(elements: CanvasElement[]): string {
  const parts: string[] = [];
  for (const el of elements) {
    const fills = el.appearance?.fills;
    if (!fills || !fills.length) continue;
    for (const fill of fills) {
      if (fill.type === 'solid') continue;
      const { defs } = fillToSvg(fill, { width: el.width, height: el.height });
      if (defs) parts.push(defs);
    }
  }
  return parts.join('');
}

export function collectClipDefs(elements: CanvasElement[]): string {
  const parts: string[] = [];
  for (const el of elements) {
    if (!el.clipPathId) continue;
    const clipper = elements.find((e) => e.id === el.clipPathId);
    if (!clipper || clipper.type !== 'shape') continue;
    const outline = shapeOutlineToSvg(clipper);
    if (!outline) continue;
    parts.push(`<clipPath id="clip-${escapeXml(el.id)}">${outline}</clipPath>`);
  }
  return parts.join('');
}

function shapeOutlineToSvg(el: ShapeElement): string {
  const { width: w, height: h } = el;
  switch (el.shape) {
    case 'rect':
    case 'roundRect': {
      const rx = el.shape === 'roundRect' ? (el.radius ?? 16) : 0;
      return wrapTransform(el, `<rect x="0" y="0" width="${w}" height="${h}"${rx ? ` rx="${rx}"` : ''} />`);
    }
    case 'circle':
      return wrapTransform(el, `<circle cx="${w / 2}" cy="${h / 2}" r="${Math.min(w, h) / 2}" />`);
    case 'triangle':
      return wrapTransform(el, `<polygon points="${w / 2},0 ${w},${h} 0,${h}" />`);
    case 'star': {
      const cx = w / 2, cy = h / 2;
      const outerR = Math.min(w, h) / 2;
      const innerR = outerR / 2.4;
      const pts: string[] = [];
      for (let i = 0; i < 10; i++) {
        const a = -Math.PI / 2 + (i * Math.PI) / 5;
        const r = i % 2 === 0 ? outerR : innerR;
        pts.push(`${cx + Math.cos(a) * r},${cy + Math.sin(a) * r}`);
      }
      return wrapTransform(el, `<polygon points="${pts.join(' ')}" />`);
    }
    case 'polygon': {
      const subpaths = el.polygonSubpaths || (el.polygonPoints ? [el.polygonPoints] : []);
      if (!subpaths.length) return '';
      const d = subpaths.map((ring) => {
        if (ring.length < 6) return '';
        const pts: string[] = [];
        for (let i = 0; i < ring.length; i += 2) pts.push(`${ring[i]},${ring[i + 1]}`);
        return `M ${pts.join(' L ')} Z`;
      }).join(' ');
      return wrapTransform(el, `<path d="${d}" fill-rule="evenodd" />`);
    }
    case 'arc': {
      const d = arcToSvgPathLocal(el);
      return d ? wrapTransform(el, `<path d="${d}" fill-rule="evenodd" />`) : '';
    }
    default:
      return '';
  }
}

function arcToSvgPathLocal(el: ShapeElement): string {
  const { width: w, height: h } = el;
  const cx = w / 2;
  const cy = h / 2;
  const outerR = Math.min(w, h) / 2 * (el.arcOuterRadius ?? 1);
  const innerR = outerR * (el.arcInnerRadius ?? 0.5);
  const a0 = ((el.arcStartAngle ?? 0) * Math.PI) / 180;
  const a1 = ((el.arcEndAngle ?? 90) * Math.PI) / 180;
  const sweep = a1 > a0 ? 1 : 0;
  const large = Math.abs(a1 - a0) > Math.PI ? 1 : 0;

  const p1x = cx + Math.cos(a0) * outerR;
  const p1y = cy + Math.sin(a0) * outerR;
  const p2x = cx + Math.cos(a1) * outerR;
  const p2y = cy + Math.sin(a1) * outerR;
  const p3x = cx + Math.cos(a1) * innerR;
  const p3y = cy + Math.sin(a1) * innerR;
  const p4x = cx + Math.cos(a0) * innerR;
  const p4y = cy + Math.sin(a0) * innerR;

  if (innerR <= 0.01) {
    return `M ${p1x} ${p1y} A ${outerR} ${outerR} 0 ${large} ${sweep} ${p2x} ${p2y} L ${cx} ${cy} Z`;
  }
  return [
    `M ${p1x} ${p1y}`,
    `A ${outerR} ${outerR} 0 ${large} ${sweep} ${p2x} ${p2y}`,
    `L ${p3x} ${p3y}`,
    `A ${innerR} ${innerR} 0 ${large} ${1 - sweep} ${p4x} ${p4y}`,
    'Z',
  ].join(' ');
}

/* ---------- Shape ---------- */

function shapePrimitiveLocal(
  el: ShapeElement,
  fillAttr: string,
  opacityAttr: string,
  extraStrokeAttrs: string,
): string {
  const { width: w, height: h } = el;
  const common = `${fillAttr}${opacityAttr}${extraStrokeAttrs}`;

  switch (el.shape) {
    case 'rect':
    case 'roundRect': {
      const rx = el.shape === 'roundRect' ? (el.radius ?? 16) : 0;
      return `<rect x="0" y="0" width="${w}" height="${h}"${rx ? ` rx="${rx}"` : ''}${common} />`;
    }
    case 'circle':
      return `<circle cx="${w / 2}" cy="${h / 2}" r="${Math.min(w, h) / 2}"${common} />`;
    case 'triangle':
      return `<polygon points="${w / 2},0 ${w},${h} 0,${h}"${common} />`;
    case 'polygon': {
      const subpaths = el.polygonSubpaths || (el.polygonPoints ? [el.polygonPoints] : []);
      if (subpaths.length === 0) return '';
      const d = subpaths.map((ring) => {
        if (ring.length < 6) return '';
        const pts: string[] = [];
        for (let i = 0; i < ring.length; i += 2) pts.push(`${ring[i]},${ring[i + 1]}`);
        return `M ${pts.join(' L ')} Z`;
      }).join(' ');
      return `<path d="${d}" fill-rule="evenodd"${common} />`;
    }
    case 'arc': {
      const d = arcToSvgPathLocal(el);
      return d ? `<path d="${d}" fill-rule="evenodd"${common} />` : '';
    }
    case 'star':
    case 'arrow':
    default:
      return `<rect x="0" y="0" width="${w}" height="${h}"${common} />`;
  }
}

export function toSvgShape(el: ShapeElement): string {
  const appearance = el.appearance;
  let svg = '';

  const hasAppearanceFills = appearance?.fills && appearance.fills.length > 0;
  const hasAppearanceStrokes = appearance?.strokes && appearance.strokes.length > 0;

  if (!hasAppearanceFills && !hasAppearanceStrokes) {
    const fillAttr = (!el.fill || el.fill === 'transparent' || el.fill === '') ? 'none' : escapeXml(el.fill);
    const strokeAttrsStr =
      el.stroke && el.stroke !== 'transparent' && el.strokeWidth > 0
        ? ` stroke="${escapeXml(el.stroke)}" stroke-width="${el.strokeWidth}"`
        : '';
    svg += shapePrimitiveLocal(el, ` fill="${fillAttr}"`, '', strokeAttrsStr);
  } else {
    for (const fill of appearance?.fills ?? []) {
      const { fillAttr, opacityAttr } = fillToSvg(fill, { width: el.width, height: el.height });
      svg += shapePrimitiveLocal(el, ` fill="${fillAttr}"`, opacityAttr, '');
    }
    for (const stroke of appearance?.strokes ?? []) {
      const s = strokeToSvg(stroke);
      svg += shapePrimitiveLocal(el, ' fill="none"', '', `${s.strokeAttr}${s.strokeWidthAttr}${s.dashAttr}`);
    }
  }

  if (el.text) {
    const anchor = el.textAlign === 'center' ? 'middle' : el.textAlign === 'right' ? 'end' : 'start';
    const tx = el.textAlign === 'center' ? el.width / 2 : el.textAlign === 'right' ? el.width - 8 : 8;
    const ty = el.height / 2 + (el.fontSize || 18) / 2;
    svg += `<text x="${tx}" y="${ty}" font-size="${el.fontSize || 18}" font-family="Arial" fill="${escapeXml(el.textFill || '#000')}" text-anchor="${anchor}">${escapeXml(el.text)}</text>`;
  }

  return wrapTransform(el, svg);
}

export function toSvgPath(el: PathElement): string {
  const fill = (!el.fill || el.fill === 'transparent' || el.fill === '') ? 'none' : escapeXml(el.fill);
  const stroke = el.stroke && el.stroke !== 'transparent' && el.strokeWidth > 0
    ? ` stroke="${escapeXml(el.stroke)}" stroke-width="${el.strokeWidth}"`
    : '';
  const inner = `<path d="${escapeXml(el.d)}" fill="${fill}"${stroke} />`;
  return wrapTransform(el, inner);
}

export function toSvgChart(el: ChartElement): string {
  const values = el.values || [];
  const palette = el.palette.length ? el.palette : CHART_PALETTE;
  let inner = '';

  if (el.chartKind === 'bar') {
    const bars = computeBarGeometry(values, el.width, el.height, {
      barWidth: el.barWidth, gap: el.gap, palette,
    });
    inner += `<line x1="40" y1="${el.height - 40}" x2="${el.width - 10}" y2="${el.height - 40}" stroke="#cbd5e1" stroke-width="2" />`;
    inner += `<line x1="40" y1="20" x2="40" y2="${el.height - 40}" stroke="#cbd5e1" stroke-width="2" />`;
    for (const b of bars) {
      inner += `<rect x="${b.x}" y="${b.y}" width="${b.width}" height="${b.height}" fill="${escapeXml(b.fill)}" />`;
    }
  } else {
    const donut = computeDonutGeometry(values, el.width, el.height, {
      innerRatio: el.donutInnerRatio, palette,
    });
    for (const d of donut) {
      inner += `<path d="${d.path}" fill="${escapeXml(d.fill)}" stroke="#ffffff" stroke-width="2" />`;
    }
  }

  if (!values.length) {
    const label = el.dataPath ? `нет данных: ${el.dataPath}` : 'нет данных';
    inner += `<text x="${el.width / 2}" y="${el.height / 2}" font-size="14" fill="#94a3b8" text-anchor="middle">${escapeXml(label)}</text>`;
  }

  return wrapTransform(el, inner);
}

export function toSvgText(el: TextElement): string {
  const padding = el.padding || { top: 0, right: 0, bottom: 0, left: 0 };
  const innerWidth = Math.max(1, el.width - padding.left - padding.right);
  const sourceHtml = el.html && el.html.trim() ? el.html : `<p>${escapeXml(el.text || '')}</p>`;

  const blocks = parseHtmlToBlocks(sourceHtml, {
    fontSize: el.fontSize,
    fontFamily: el.fontFamily,
    fontStyle: el.fontStyle || 'normal',
    textDecoration: el.textDecoration || '',
    fill: el.fill || '#000000',
  });

  const lineHeightCoef = el.lineHeight || 1.5;
  let cursorY = padding.top;
  let svgContent = '';

  for (const block of blocks) {
    if (block.kind === 'text') {
      const layout = layoutRuns(block.runs, innerWidth, lineHeightCoef);
      if (layout.lines.length === 0) continue;
      layout.lines.forEach((line) => {
        const lineWidth = line.reduce((sum, r) => sum + r.width, 0);
        let lineOffsetX = 0;
        if (el.align === 'center') lineOffsetX = Math.max(0, (innerWidth - lineWidth) / 2);
        else if (el.align === 'right') lineOffsetX = Math.max(0, innerWidth - lineWidth);
        line.forEach((run) => {
          const rx = padding.left + lineOffsetX + run.x;
          const ry = cursorY + run.y + run.actualFontSize;
          const textDecoration = run.underline && run.strike ? 'underline line-through' : run.underline ? 'underline' : run.strike ? 'line-through' : 'none';
          svgContent += `<text x="${rx}" y="${ry}" font-size="${run.actualFontSize}" font-family="${escapeXml(run.fontFamily || el.fontFamily)}" font-style="${run.italic ? 'italic' : 'normal'}" font-weight="${run.bold ? 'bold' : 'normal'}" fill="${escapeXml(run.color || el.fill || '#000')}" text-decoration="${textDecoration}">${escapeXml(run.text)}</text>`;
        });
      });
      cursorY += layout.totalHeight;
    } else if (block.kind === 'table') {
      const layout = computeTableLayout(block.data, innerWidth, el.fontSize, lineHeightCoef);
      const tableX = padding.left;
      const tableY = cursorY;

      block.data.cells.forEach((cell) => {
        const cellX = tableX + layout.colOffsets[cell.colIndex];
        const cellY = tableY + layout.rowOffsets[cell.rowIndex];
        const cellW = layout.colOffsets[Math.min(cell.colIndex + cell.colspan, layout.colOffsets.length - 1)] - layout.colOffsets[cell.colIndex];
        const cellH = layout.rowOffsets[Math.min(cell.rowIndex + cell.rowspan, layout.rowOffsets.length - 1)] - layout.rowOffsets[cell.rowIndex];

        const bg = cell.bgColor === 'transparent'
          ? 'none'
          : cell.bgColor || (cell.isHeader ? '#f1f5f9' : '#ffffff');
        if (bg !== 'none') {
          svgContent += `<rect x="${cellX}" y="${cellY}" width="${cellW}" height="${cellH}" fill="${escapeXml(bg)}"/>`;
        }

        const hasSide = isSideVisible(cell.borderTop)
          || isSideVisible(cell.borderRight)
          || isSideVisible(cell.borderBottom)
          || isSideVisible(cell.borderLeft);
        const explicit = cell.borderTop !== undefined
          || cell.borderRight !== undefined
          || cell.borderBottom !== undefined
          || cell.borderLeft !== undefined;

        if (hasSide) {
          svgContent = appendSide(svgContent, cell.borderTop,    cellX,         cellY,         cellX + cellW, cellY);
          svgContent = appendSide(svgContent, cell.borderRight,  cellX + cellW, cellY,         cellX + cellW, cellY + cellH);
          svgContent = appendSide(svgContent, cell.borderBottom, cellX,         cellY + cellH, cellX + cellW, cellY + cellH);
          svgContent = appendSide(svgContent, cell.borderLeft,   cellX,         cellY,         cellX,         cellY + cellH);
        } else if (!explicit) {
          const color = cell.borderColor || '#cbd5e1';
          const bw = cell.borderWidth ?? 1;
          svgContent += `<rect x="${cellX}" y="${cellY}" width="${cellW}" height="${cellH}" `
            + `fill="none" stroke="${escapeXml(color)}" stroke-width="${bw}"`
            + `${sideDash(cell.borderStyle)}/>`;
        }

        const items = layout.cellItems.get(cell);
        if (items) {
          let itemY = cellY + (cell.padding?.top ?? 8);
          items.forEach((item) => {
            if (item.kind === 'text') {
              item.layout.lines.forEach((line) => {
                const lineW = line.reduce((s, r) => s + r.width, 0);
                let lineOffsetX = 0;
                if (cell.align === 'center') lineOffsetX = Math.max(0, (cellW - lineW) / 2);
                else if (cell.align === 'right') lineOffsetX = Math.max(0, cellW - lineW);
                line.forEach((run) => {
                  const rx = cellX + (cell.padding?.left ?? 10) + lineOffsetX + run.x;
                  const ry = itemY + run.y + run.actualFontSize;
                  svgContent += `<text x="${rx}" y="${ry}" font-size="${run.actualFontSize}" font-family="${escapeXml(run.fontFamily || el.fontFamily)}" font-weight="${run.bold || cell.isHeader ? 'bold' : 'normal'}" fill="${escapeXml(run.color || '#000')}">${escapeXml(run.text)}</text>`;
                });
              });
              itemY += item.height + 8;
            }
          });
        }
      });
      cursorY += layout.totalHeight;
    }
  }

  return wrapTransform(el, svgContent);
}

export function toSvgLine(el: LineElement): string {
  const pointsStr: string[] = [];
  for (let i = 0; i < el.points.length; i += 2) pointsStr.push(`${el.points[i]},${el.points[i + 1]}`);
  const inner = `<polyline points="${pointsStr.join(' ')}" fill="none" stroke="${escapeXml(el.stroke)}" stroke-width="${el.strokeWidth}" />`;
  return wrapTransform(el, inner);
}

export function toSvgTable(el: TableElement): string {
  const { width: w, height: h, rows, cols, data, borderColor, headerBg, fontSize } = el;
  const cellW = w / cols;
  const cellH = h / rows;
  let svg = '';
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const bg = r === 0 ? headerBg : '#ffffff';
      const cx = c * cellW;
      const cy = r * cellH;
      svg += `<rect x="${cx}" y="${cy}" width="${cellW}" height="${cellH}" fill="${escapeXml(bg)}" stroke="${escapeXml(borderColor)}" stroke-width="1" />`;
      const text = data[r]?.[c] || '';
      if (text) {
        svg += `<text x="${cx + 4}" y="${cy + fontSize + 4}" font-size="${fontSize}" font-family="Arial" fill="#111">${escapeXml(text)}</text>`;
      }
    }
  }
  return wrapTransform(el, svg);
}

export function toSvgImage(el: ImageElement): string {
  const inner = `<image x="0" y="0" width="${el.width}" height="${el.height}" href="${escapeXml(el.src)}" />`;
  return wrapTransform(el, inner);
}

export function toSvgFooter(el: FooterElement): string {
  const inner = `
    <rect x="0" y="0" width="${el.width}" height="${el.height}" fill="${escapeXml(el.bgColor)}" />
    <text x="${el.width / 2}" y="${el.height / 2 + el.fontSize / 2}" font-size="${el.fontSize}" font-family="Arial" fill="${escapeXml(el.fill)}" text-anchor="middle">${escapeXml(el.text)}</text>
  `;
  return wrapTransform(el, inner);
}

export function toSvgPlaceholder(el: PlaceholderElement): string {
  const inner = `
    <rect x="0" y="0" width="${el.width}" height="${el.height}" fill="${escapeXml(el.background)}" stroke="#6366f1" stroke-dasharray="6,4" />
    <text x="8" y="${el.fontSize + 8}" font-size="${el.fontSize}" font-family="${escapeXml(el.fontFamily)}" fill="${escapeXml(el.fill)}">${escapeXml(el.sample || '—')}</text>
  `;
  return wrapTransform(el, inner);
}

export function toSvgFill(el: FillElement): string {
  const pointsStr: string[] = [];
  for (let i = 0; i < el.points.length; i += 2) pointsStr.push(`${el.points[i]},${el.points[i + 1]}`);
  const inner = `<polygon points="${pointsStr.join(' ')}" fill="${escapeXml(el.fill)}" opacity="${el.opacity || 0.6}" />`;
  return wrapTransform(el, inner);
}

export function toSvgConnector(el: ConnectorElement, allElements: CanvasElement[]): string {
  const { from, to } = resolveConnectorEnds(el, allElements);
  if (!from || !to) return '';
  const obstacles = allElements.filter((e) =>
    e.id !== el.fromId && e.id !== el.toId && e.type !== 'connector' && e.type !== 'fill' && e.type !== 'line' && !e.locked
  );
  const points = routeConnector(from, el.fromAnchor, to, el.toAnchor, el.routing, obstacles);
  const pointsStr: string[] = [];
  for (let i = 0; i < points.length; i += 2) pointsStr.push(`${points[i]},${points[i + 1]}`);
  let svg = `<polyline points="${pointsStr.join(' ')}" fill="none" stroke="${escapeXml(el.stroke)}" stroke-width="${el.strokeWidth}" />`;
  if (el.isArrow) {
    const n = points.length;
    const x1 = points[n - 4], y1 = points[n - 3];
    const x2 = points[n - 2], y2 = points[n - 1];
    const angle = Math.atan2(y2 - y1, x2 - x1);
    const len = 12;
    const spread = 0.45;
    const arrowHead = [
      x2 + len * Math.cos(angle + Math.PI - spread), y2 + len * Math.sin(angle + Math.PI - spread),
      x2, y2,
      x2 + len * Math.cos(angle + Math.PI + spread), y2 + len * Math.sin(angle + Math.PI + spread),
    ];
    svg += `<polyline points="${arrowHead.join(' ')}" fill="none" stroke="${escapeXml(el.stroke)}" stroke-width="${el.strokeWidth}" stroke-linecap="round" stroke-linejoin="round" />`;
  }
  return svg;
}

export function toSvgDiagram(el: DiagramElement): string {
  const inner = el.svg || `<rect x="0" y="0" width="${el.width}" height="${el.height}" fill="#f8fafc" stroke="#cbd5e1" stroke-dasharray="6,4" />`;
  return wrapTransform(el, inner);
}

export function toSvgStamp(el: StampElement): string {
  let svg = '';
  if (el.shapes) {
    el.shapes.forEach((s) => {
      if (s.kind === 'rect') {
        svg += `<rect x="${s.x}" y="${s.y}" width="${s.width}" height="${s.height}" fill="${escapeXml(s.fill || 'transparent')}" stroke="${escapeXml(s.stroke)}" stroke-width="${s.strokeWidth}" />`;
      } else if (s.kind === 'circle' || s.kind === 'ellipse') {
        svg += `<ellipse cx="${s.x + s.width / 2}" cy="${s.y + s.height / 2}" rx="${s.width / 2}" ry="${s.height / 2}" fill="${escapeXml(s.fill || 'transparent')}" stroke="${escapeXml(s.stroke)}" stroke-width="${s.strokeWidth}" />`;
      } else if (s.kind === 'line') {
        const pts = s.points || [0, 0, s.width, 0];
        svg += `<polyline points="${pts.join(' ')}" fill="none" stroke="${escapeXml(s.stroke)}" stroke-width="${s.strokeWidth}" />`;
      }
    });
  }
  if (el.texts) {
    el.texts.forEach((t) => {
      if (t.mode === 'straight') {
        svg += `<text x="${t.x}" y="${t.y + t.fontSize}" font-size="${t.fontSize}" font-family="${escapeXml(t.fontFamily)}" fill="${escapeXml(t.fill)}" text-anchor="middle">${escapeXml(t.text)}</text>`;
      }
    });
  }
  return wrapTransform(el, svg);
}

export function toSvgQr(el: QrElement): string {
  if (el._qrDataUrl && el._qrDataUrl.startsWith('data:image/')) {
    const dataUrl = escapeXml(el._qrDataUrl);
    const inner = `<image href="${dataUrl}" xlink:href="${dataUrl}" x="0" y="0" width="${el.width}" height="${el.height}" preserveAspectRatio="xMidYMid meet"/>`;
    return wrapTransform(el, inner);
  }
  // Заглушка-рамка, если QR не сгенерился.
  const inner = `<rect x="0" y="0" width="${el.width}" height="${el.height}" fill="none" stroke="#cbd5e1" stroke-width="1" stroke-dasharray="6,4"/>`;
  return wrapTransform(el, inner);
}