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

    if (Math.abs(x2 - x1) < 4 && Math.abs(y2 - y1) < 4) {
      startRef.current = null;
      setBand(null);
      return;
    }
    const inside = activeSlide.elements.filter((el) => {
      const bb = getBBox(el);
      return bb.x >= x1 && bb.y >= y1 && bb.x + bb.w <= x2 && bb.y + bb.h <= y2;
    });
    setSelectedIds(inside.map((e) => e.id));
    startRef.current = null;
    setBand(null);
  }, [band, activeSlide, setSelectedIds]);

  return { band, start, move, end };
}