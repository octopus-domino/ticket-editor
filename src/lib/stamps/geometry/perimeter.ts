import type { StampShapeItem } from '@/shared/types';
import { buildRectEdges, buildTriangleEdges, type Edge } from './edges';
import { pointToSegmentDistance } from './math';

function pointOnTrianglePerimeter(
  w: number, h: number, signedOffset: number, angleRad: number,
): [number, number] {
  const edges = buildTriangleEdges(w, h, signedOffset);
  const cx = w / 2, cy = h / 2;
  const cos = Math.cos(angleRad), sin = Math.sin(angleRad);
  let bestT = Infinity;
  let bestPt: [number, number] = [cx, cy];
  for (const e of edges) {
    const ex = e.x2 - e.x1, ey = e.y2 - e.y1;
    const det = cos * (-ey) - (-ex) * sin;
    if (Math.abs(det) < 1e-9) continue;
    const b1 = e.x1 - cx, b2 = e.y1 - cy;
    const t = (b1 * (-ey) - (-ex) * b2) / det;
    const s = (cos * b2 - sin * b1) / det;
    if (t > 0 && s >= 0 && s <= 1 && t < bestT) {
      bestT = t;
      bestPt = [cx + t * cos, cy + t * sin];
    }
  }
  return bestPt;
}

export function pointOnHostPerimeter(
  host: StampShapeItem,
  signedOffset: number,
  angleRad: number,
): [number, number] {
  const cx = host.width / 2, cy = host.height / 2;

  if (host.kind === 'rect') {
    const dxHalf = Math.max(1, host.width / 2 - signedOffset);
    const dyHalf = Math.max(1, host.height / 2 - signedOffset);
    const cos = Math.cos(angleRad), sin = Math.sin(angleRad);
    const t = Math.min(
      dxHalf / Math.max(Math.abs(cos), 1e-9),
      dyHalf / Math.max(Math.abs(sin), 1e-9),
    );
    return [cx + cos * t, cy + sin * t];
  }
  if (host.kind === 'triangle') {
    return pointOnTrianglePerimeter(host.width, host.height, signedOffset, angleRad);
  }
  const r = Math.max(1, Math.min(host.width, host.height) / 2 - signedOffset);
  return [cx + Math.cos(angleRad) * r, cy + Math.sin(angleRad) * r];
}

export function closestPointOnHostPerimeter(
  host: StampShapeItem,
  signedOffset: number,
  px: number, py: number,
): [number, number] {
  const lx = px - host.x;
  const ly = py - host.y;

  if (host.kind === 'rect') {
    const x1 = signedOffset, y1 = signedOffset;
    const x2 = host.width - signedOffset, y2 = host.height - signedOffset;
    const edges: [number, number, number, number][] = [
      [x1, y1, x2, y1], [x2, y1, x2, y2],
      [x2, y2, x1, y2], [x1, y2, x1, y1],
    ];
    let best = Infinity;
    let bp: [number, number] = [x1, y1];
    for (const [ax, ay, bx, by] of edges) {
      const r = pointToSegmentDistance(lx, ly, ax, ay, bx, by);
      if (r.distance < best) { best = r.distance; bp = [r.qx, r.qy]; }
    }
    return [host.x + bp[0], host.y + bp[1]];
  }

  if (host.kind === 'triangle') {
    const edges = buildTriangleEdges(host.width, host.height, signedOffset);
    let best = Infinity;
    let bp: [number, number] = [0, 0];
    for (const e of edges) {
      const r = pointToSegmentDistance(lx, ly, e.x1, e.y1, e.x2, e.y2);
      if (r.distance < best) { best = r.distance; bp = [r.qx, r.qy]; }
    }
    return [host.x + bp[0], host.y + bp[1]];
  }

  const cx = host.x + host.width / 2;
  const cy = host.y + host.height / 2;
  const r = Math.max(1, Math.min(host.width, host.height) / 2 - signedOffset);
  const angle = Math.atan2(py - cy, px - cx);
  return [cx + r * Math.cos(angle), cy + r * Math.sin(angle)];
}

export interface PerimeterTextOptions {
  host: StampShapeItem;
  arcOffset: number;
  isOutside: boolean;
  centerDeg: number;
  text: string;
  fontSize: number;
  fontFamily: string;
  fontStyle: string;
  fill: string;
}

function findPerimeterPosition(edges: Edge[], tx: number, ty: number): number {
  let bestDist = Infinity;
  let bestPos = 0;
  let cum = 0;
  for (const e of edges) {
    const r = pointToSegmentDistance(tx, ty, e.x1, e.y1, e.x2, e.y2);
    if (r.distance < bestDist) {
      bestDist = r.distance;
      bestPos = cum + Math.hypot(r.qx - e.x1, r.qy - e.y1);
    }
    cum += e.len;
  }
  return bestPos;
}

function findEdgeAt(edges: Edge[], L: number): { edge: Edge | null; posOnEdge: number } {
  const total = edges.reduce((s, e) => s + e.len, 0);
  if (total <= 0) return { edge: null, posOnEdge: 0 };
  const wrapL = ((L % total) + total) % total;
  let cum = 0;
  for (const e of edges) {
    if (wrapL >= cum && wrapL < cum + e.len) return { edge: e, posOnEdge: wrapL - cum };
    cum += e.len;
  }
  const last = edges[edges.length - 1];
  return { edge: last, posOnEdge: last.len };
}

export function drawPerimeterText(
  ctx: CanvasRenderingContext2D,
  opts: PerimeterTextOptions,
): void {
  const {
    host, arcOffset, isOutside, centerDeg,
    text, fontSize, fontFamily, fontStyle, fill,
  } = opts;
  if (!text) return;

  const fontParts: string[] = [];
  if (fontStyle.includes('italic')) fontParts.push('italic');
  if (fontStyle.includes('bold')) fontParts.push('bold');
  fontParts.push(`${fontSize}px`, `${fontFamily}, Arial, sans-serif`);

  ctx.save();
  ctx.font = fontParts.join(' ');
  ctx.fillStyle = fill;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  const signed = isOutside ? -Math.max(0, arcOffset) : Math.max(0, arcOffset);
  const edges = host.kind === 'rect'
    ? buildRectEdges(host.width, host.height, signed)
    : buildTriangleEdges(host.width, host.height, signed);

  if (edges.reduce((s, e) => s + e.len, 0) <= 1) { ctx.restore(); return; }

  const chars = Array.from(text);
  const widths = chars.map((ch) => Math.max(fontSize * 0.3, ctx.measureText(ch).width));
  const totalTextLen = widths.reduce((a, b) => a + b, 0);

  const centerRad = (centerDeg * Math.PI) / 180;
  const [tx, ty] = pointOnHostPerimeter(host, signed, centerRad);
  const centerPos = findPerimeterPosition(edges, tx, ty);
  let cursor = centerPos - totalTextLen / 2;

  for (let i = 0; i < chars.length; i++) {
    const mid = cursor + widths[i] / 2;
    const { edge, posOnEdge } = findEdgeAt(edges, mid);
    if (edge) {
      const px = edge.x1 + edge.dirX * posOnEdge;
      const py = edge.y1 + edge.dirY * posOnEdge;
      const angle = Math.atan2(edge.dirY, edge.dirX);
      ctx.save();
      ctx.translate(px, py);
      ctx.rotate(angle);
      ctx.fillText(chars[i], 0, 0);
      ctx.restore();
    }
    cursor += widths[i];
  }
  ctx.restore();
}