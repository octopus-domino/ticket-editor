/* ============================================================
   Работа с изображениями: удаление однотонного фона (chroma-key),
   вычисление размеров под вставку.
   ============================================================ */

export interface TransparentOptions {
  tolerance?: number;
  keyColor?: string | 'auto';
  maxSize?: number;
}

const hexToRgb = (hex: string): { r: number; g: number; b: number } => {
  const m = hex.replace('#', '').match(/.{2}/g);
  if (!m || m.length < 3) return { r: 255, g: 255, b: 255 };
  return {
    r: parseInt(m[0], 16),
    g: parseInt(m[1], 16),
    b: parseInt(m[2], 16),
  };
};

export function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = (e) => reject(e);
    img.src = src;
  });
}

export async function makeImageTransparent(
  src: string,
  options: TransparentOptions = {},
): Promise<string> {
  const { tolerance = 30, keyColor = 'auto', maxSize = 2048 } = options;

  const img = await loadImage(src);

  let w = img.naturalWidth || img.width;
  let h = img.naturalHeight || img.height;
  const k = Math.min(1, maxSize / Math.max(w, h));
  w = Math.max(1, Math.round(w * k));
  h = Math.max(1, Math.round(h * k));

  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return src;
  ctx.clearRect(0, 0, w, h);
  ctx.drawImage(img, 0, 0, w, h);

  let data: ImageData;
  try {
    data = ctx.getImageData(0, 0, w, h);
  } catch {
    return src;
  }
  const px = data.data;

  let kr: number, kg: number, kb: number;
  if (keyColor === 'auto') {
    const idxs = [
      0,
      (w - 1) * 4,
      (h - 1) * w * 4,
      ((h - 1) * w + (w - 1)) * 4,
    ];
    let r = 0, g = 0, b = 0;
    for (const i of idxs) {
      r += px[i];
      g += px[i + 1];
      b += px[i + 2];
    }
    kr = r / 4;
    kg = g / 4;
    kb = b / 4;
  } else {
    const rgb = hexToRgb(keyColor);
    kr = rgb.r;
    kg = rgb.g;
    kb = rgb.b;
  }

  const tol = tolerance;
  const tol2 = tol * tol * 3;
  const softEdge2 = tol2 * 4;

  for (let i = 0; i < px.length; i += 4) {
    const dr = px[i] - kr;
    const dg = px[i + 1] - kg;
    const db = px[i + 2] - kb;
    const dist2 = dr * dr + dg * dg + db * db;

    if (dist2 <= tol2) {
      px[i + 3] = 0;
    } else if (dist2 < softEdge2) {
      const d = Math.sqrt(dist2);
      const t = (d - tol) / tol;
      px[i + 3] = Math.max(0, Math.min(255, Math.round(px[i + 3] * t)));
    }
  }

  ctx.putImageData(data, 0, 0);
  return canvas.toDataURL('image/png');
}

export function fitImageSize(
  naturalW: number,
  naturalH: number,
  slideW: number,
  slideH: number,
  maxRatio = 0.6,
): { width: number; height: number } {
  const maxW = Math.max(40, slideW * maxRatio);
  const maxH = Math.max(40, slideH * maxRatio);
  const k = Math.min(1, maxW / naturalW, maxH / naturalH);
  return {
    width: Math.max(20, Math.round(naturalW * k)),
    height: Math.max(20, Math.round(naturalH * k)),
  };
}