import { useState, useRef, useCallback } from 'react';
import type { Slide } from '../types';
import { getBBox } from '../lib/geometry';
import type Konva from 'konva';
import { RefObject } from 'react';

export interface RubberBand {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

interface Args {
  stageRef: RefObject<Konva.Stage>;
  zoom: number;
  activeSlide: Slide;
  setSelectedIds: (ids: string[]) => void;
}

/** Прямоугольники пересекаются? (использует loose-границы). */
function rectsIntersect(
  a: { x: number; y: number; w: number; h: number },
  b: { x: number; y: number; w: number; h: number },
): boolean {
  return !(
    a.x + a.w < b.x ||
    b.x + b.w < a.x ||
    a.y + a.h < b.y ||
    b.y + b.h < a.y
  );
}

export function useRubberBand({ stageRef, zoom, activeSlide, setSelectedIds }: Args) {
  const [band, setBand] = useState<RubberBand | null>(null);
  const startRef = useRef<{ x: number; y: number } | null>(null);

  const pointerPos = () => {
    const stage = stageRef.current;
    if (!stage) return { x: 0, y: 0 };
    const p = stage.getPointerPosition();
    if (!p) return { x: 0, y: 0 };
    return { x: p.x / zoom, y: p.y / zoom };
  };

  const start = useCallback(() => {
    const pos = pointerPos();
    startRef.current = pos;
    setBand({ x1: pos.x, y1: pos.y, x2: pos.x, y2: pos.y });
  }, [zoom, stageRef]);

  const move = useCallback(() => {
    if (!startRef.current) return;
    const pos = pointerPos();
    const s = startRef.current;
    setBand({ x1: s.x, y1: s.y, x2: pos.x, y2: pos.y });
  }, [zoom, stageRef]);

  const end = useCallback(() => {
    if (!band || !startRef.current) {
      startRef.current = null;
      setBand(null);
      return;
    }
    const x1 = Math.min(band.x1, band.x2);
    const x2 = Math.max(band.x1, band.x2);
    const y1 = Math.min(band.y1, band.y2);
    const y2 = Math.max(band.y1, band.y2);

    /* Совсем маленькая рамка — считаем кликом, не выделяем */
    if (Math.abs(x2 - x1) < 4 && Math.abs(y2 - y1) < 4) {
      startRef.current = null;
      setBand(null);
      return;
    }

    const rect = { x: x1, y: y1, w: x2 - x1, h: y2 - y1 };

    /* Пересечение, не полное включение: элемент выделяется,
       если хотя бы часть его bbox попала в рамку. */
    const inside = activeSlide.elements.filter((el) => {
      if (el.type === 'connector') return false;
      if (el.type === 'fill') return false;
      if (el.locked) return false;
      const bb = getBBox(el);
      return rectsIntersect(rect, bb);
    });

    setSelectedIds(inside.map((e) => e.id));
    startRef.current = null;
    setBand(null);
  }, [band, activeSlide, setSelectedIds]);

  return { band, start, move, end };
}