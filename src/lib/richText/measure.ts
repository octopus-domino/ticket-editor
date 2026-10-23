/* ============================================================
   lib/richText/measure.ts
   NFR-PERF-07, REG-B10: кэш ширин текста (LRU, 4096).
   ============================================================ */

let measureCtx: CanvasRenderingContext2D | null | undefined;

function getCtx(): CanvasRenderingContext2D | null {
  if (measureCtx === undefined) {
    measureCtx =
      typeof document !== 'undefined'
        ? document.createElement('canvas').getContext('2d')
        : null;
  }
  return measureCtx;
}

const cache = new Map<string, number>();
const MAX_CACHE = 4096;

export function measureText(
  text: string,
  fontSize: number,
  fontFamily: string,
  fontStyle: string,
): number {
  if (!text) return 0;

  const family = fontFamily || 'Arial, sans-serif';
  const size = typeof fontSize === 'number' && isFinite(fontSize) && fontSize > 0 ? fontSize : 16;
  const key = `${fontStyle}|${size}|${family}|${text}`;
  
  const cached = cache.get(key);
  if (cached !== undefined) {
    cache.delete(key);
    cache.set(key, cached);
    return cached;
  }

  const ctx = getCtx();
  let width: number;
  if (!ctx) {
    width = text.length * size * 0.55;
  } else {
    const style = fontStyle || 'normal';
    ctx.font = `${style} ${size}px ${family}`;
    const m = ctx.measureText(text);
    width = isFinite(m.width) && m.width > 0 ? m.width : text.length * size * 0.55;
  }

  if (cache.size >= MAX_CACHE) {
    const oldestKey = cache.keys().next().value;
    if (oldestKey !== undefined) cache.delete(oldestKey);
  }
  cache.set(key, width);
  return width;
}