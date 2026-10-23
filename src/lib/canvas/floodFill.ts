import type Konva from 'konva';

// Уменьшили с 2 до 1 (в 4 раза меньше пикселей для обработки и рендера)
const FILL_SCALE = 1; 
const MIN_AREA = 100;

export interface FloodFillResult {
  dataUrl: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

function toDataUrl(canvas: HTMLCanvasElement): string {
  try {
    // WebP с прозрачностью весит в 3-4 раза меньше PNG
    const url = canvas.toDataURL('image/webp', 0.85);
    if (url.startsWith('data:image/webp')) return url;
  } catch { /* fallback */ }
  return canvas.toDataURL('image/png');
}

export function rasterizeFloodFill(
  stage: Konva.Stage,
  layerName: string,
  clickX: number,
  clickY: number,
  slideWidth: number,
  slideHeight: number,
  color: string,
): FloodFillResult | null {
  const layer = stage.findOne('.' + layerName) as Konva.Layer | null;
  if (!layer) return null;

  const W = Math.round(slideWidth * FILL_SCALE);
  const H = Math.round(slideHeight * FILL_SCALE);
  if (W <= 0 || H <= 0) return null;

  const sx = Math.floor(clickX * FILL_SCALE);
  const sy = Math.floor(clickY * FILL_SCALE);
  if (sx < 0 || sy < 0 || sx >= W || sy >= H) return null;

  const fillsToHide = layer.find('.is-fill-element');
  const wasVisible = fillsToHide.map((n) => n.visible());
  fillsToHide.forEach((n) => n.visible(false));

  const oldScale = stage.scale();
  const oldPos = stage.position();
  stage.scale({ x: 1, y: 1 });
  stage.position({ x: 0, y: 0 });

  let layerCanvas: HTMLCanvasElement;
  try {
    layerCanvas = layer.toCanvas({
      x: 0, y: 0,
      width: slideWidth, height: slideHeight,
      pixelRatio: FILL_SCALE,
    });
  } catch {
    stage.scale(oldScale);
    stage.position(oldPos);
    fillsToHide.forEach((n, i) => n.visible(wasVisible[i]));
    return null;
  }

  stage.scale(oldScale);
  stage.position(oldPos);
  fillsToHide.forEach((n, i) => n.visible(wasVisible[i]));

  const offscreen = document.createElement('canvas');
  offscreen.width = W;
  offscreen.height = H;
  const ctx = offscreen.getContext('2d', { willReadFrequently: true });
  if (!ctx) return null;

  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, W, H);
  ctx.drawImage(layerCanvas, 0, 0, W, H);

  const img = ctx.getImageData(0, 0, W, H);
  const data = img.data;

  // Быстрая проверка: сумма каналов меньше 720 (3 * 240) => пиксель темный
  const isDark = (p: number): boolean =>
    data[p] + data[p + 1] + data[p + 2] < 720;

  const seedIdx = sy * W + sx;
  const seedP = seedIdx * 4;
  if (isDark(seedP)) return null;

  const visited = new Uint8Array(W * H);
  const filled = new Uint8Array(W * H);
  const stack: number[] = [seedIdx];
  let count = 0;

  while (stack.length > 0) {
    const i = stack.pop()!;
    if (visited[i]) continue;
    visited[i] = 1;

    const p = i * 4;
    if (isDark(p)) continue;

    filled[i] = 1;
    count++;

    const x = i % W;
    const y = (i - x) / W;
    if (x > 0) stack.push(i - 1);
    if (x < W - 1) stack.push(i + 1);
    if (y > 0) stack.push(i - W);
    if (y < H - 1) stack.push(i + W);
  }

  if (count < MIN_AREA) return null;

  let minX = W, minY = H, maxX = -1, maxY = -1;
  for (let i = 0; i < W * H; i++) {
    if (!filled[i]) continue;
    const x = i % W;
    const y = (i - x) / W;
    if (x < minX) minX = x;
    if (y < minY) minY = y;
    if (x > maxX) maxX = x;
    if (y > maxY) maxY = y;
  }

  const cropW = maxX - minX + 1;
  const cropH = maxY - minY + 1;
  if (cropW <= 0 || cropH <= 0) return null;

  const [cr, cg, cb] = hexToRgb(color);

  const resultCanvas = document.createElement('canvas');
  resultCanvas.width = cropW;
  resultCanvas.height = cropH;
  const rctx = resultCanvas.getContext('2d');
  if (!rctx) return null;

  const cropped = rctx.createImageData(cropW, cropH);
  for (let y = 0; y < cropH; y++) {
    for (let x = 0; x < cropW; x++) {
      const srcIdx = (minY + y) * W + (minX + x);
      if (!filled[srcIdx]) continue;
      const dp = (y * cropW + x) * 4;
      cropped.data[dp] = cr;
      cropped.data[dp + 1] = cg;
      cropped.data[dp + 2] = cb;
      cropped.data[dp + 3] = 255;
    }
  }
  rctx.putImageData(cropped, 0, 0);

  return {
    dataUrl: toDataUrl(resultCanvas),
    x: minX / FILL_SCALE,
    y: minY / FILL_SCALE,
    width: cropW / FILL_SCALE,
    height: cropH / FILL_SCALE,
  };
}

function hexToRgb(hex: string): [number, number, number] {
  const clean = hex.replace('#', '').trim();
  if (clean.length === 3) {
    return [
      parseInt(clean[0] + clean[0], 16),
      parseInt(clean[1] + clean[1], 16),
      parseInt(clean[2] + clean[2], 16),
    ];
  }
  if (clean.length === 6) {
    return [
      parseInt(clean.slice(0, 2), 16),
      parseInt(clean.slice(2, 4), 16),
      parseInt(clean.slice(4, 6), 16),
    ];
  }
  return [0, 0, 0];
}