/* ============================================================
   domain/arrange/align.ts

   Выравнивание и распределение выделенных элементов.
   Чистые функции, работают с CanvasElement. Никаких React/Konva.

   ARC-LAYER-02: домен framework-free.
   CQ-TEST-01: pure functions → coverage ≥ 80%.
   ============================================================ */

import type { CanvasElement } from '@/shared/types';

export interface BBox {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
  width: number;
  height: number;
}

export type AlignMode =
  | 'left' | 'center' | 'right'
  | 'top'  | 'middle' | 'bottom';

export type DistributeAxis = 'horizontal' | 'vertical';

export type ElementPatch = Partial<Pick<CanvasElement, 'x' | 'y'>>;

/**
 * Общий bounding box набора элементов.
 * Возвращает null для пустого массива.
 */
export function getBBox(elements: readonly CanvasElement[]): BBox | null {
  if (elements.length === 0) return null;
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const el of elements) {
    if (el.x < minX) minX = el.x;
    if (el.y < minY) minY = el.y;
    if (el.x + el.width > maxX) maxX = el.x + el.width;
    if (el.y + el.height > maxY) maxY = el.y + el.height;
  }
  return {
    minX, minY, maxX, maxY,
    width: maxX - minX,
    height: maxY - minY,
  };
}

/**
 * Выравнивание N ≥ 2 элементов по одному из 6 режимов.
 * Возвращает карту патчей: { [elementId]: { x?, y? } }.
 *
 * Чистая функция: не мутирует вход, только читает.
 */
export function computeAlign(
  elements: readonly CanvasElement[],
  mode: AlignMode,
): Record<string, ElementPatch> | null {
  if (elements.length < 2) return null;
  const box = getBBox(elements);
  if (!box) return null;

  const patches: Record<string, ElementPatch> = {};
  for (const el of elements) {
    let x = el.x;
    let y = el.y;
    switch (mode) {
      case 'left':   x = box.minX; break;
      case 'center': x = (box.minX + box.maxX) / 2 - el.width / 2; break;
      case 'right':  x = box.maxX - el.width; break;
      case 'top':    y = box.minY; break;
      case 'middle': y = (box.minY + box.maxY) / 2 - el.height / 2; break;
      case 'bottom': y = box.maxY - el.height; break;
    }
    patches[el.id] = { x: Math.round(x), y: Math.round(y) };
  }
  return patches;
}

/**
 * Равномерное распределение N ≥ 3 элементов с равными промежутками.
 * Сортировка по оси, потом пересчёт позиций с сохранением крайних.
 */
export function computeDistribute(
  elements: readonly CanvasElement[],
  axis: DistributeAxis,
): Record<string, ElementPatch> | null {
  if (elements.length < 3) return null;
  const box = getBBox(elements);
  if (!box) return null;

  const sorted = [...elements].sort((a, b) =>
    axis === 'horizontal' ? a.x - b.x : a.y - b.y,
  );

  const patches: Record<string, ElementPatch> = {};

  if (axis === 'horizontal') {
    const totalWidth = sorted.reduce((sum, el) => sum + el.width, 0);
    const gap = (box.width - totalWidth) / (sorted.length - 1);
    let cursor = box.minX;
    for (const el of sorted) {
      patches[el.id] = { x: Math.round(cursor) };
      cursor += el.width + gap;
    }
  } else {
    const totalHeight = sorted.reduce((sum, el) => sum + el.height, 0);
    const gap = (box.height - totalHeight) / (sorted.length - 1);
    let cursor = box.minY;
    for (const el of sorted) {
      patches[el.id] = { y: Math.round(cursor) };
      cursor += el.height + gap;
    }
  }
  return patches;
}