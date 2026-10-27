import { useState, useCallback } from 'react';
import type { Slide, CanvasElement, FillElement } from '../types';
import { hitShapeEl } from '../lib/geometry';
import { uid } from '../lib/uid';

interface Args {
  activeSlide: Slide;
  updateElement: (id: string, patch: Partial<CanvasElement>) => void;
  addElement: (el: CanvasElement) => void;
  pointerPos: () => { x: number; y: number };
  onElementSelected?: (id: string) => void;
}

export function useFillMode({ activeSlide, updateElement, addElement, pointerPos, onElementSelected }: Args) {
  const [fillMode, setFillMode] = useState(false);
  const [fillColor, setFillColor] = useState('#fbbf24');
  const [points, setPoints] = useState<number[]>([]);

  const findShapeAt = useCallback((x: number, y: number): CanvasElement | null => {
    for (let i = activeSlide.elements.length - 1; i >= 0; i--) {
      const el = activeSlide.elements[i];
      if (hitShapeEl(el, x, y)) return el;
    }
    return null;
  }, [activeSlide]);

  const handleClick = useCallback((onEmpty: () => void): boolean => {
    if (!fillMode) return false;
    const pos = pointerPos();
    const target = findShapeAt(pos.x, pos.y);
    if (target && (target.type === 'shape' || target.type === 'fill')) {
      updateElement(target.id, { fill: fillColor });
      onElementSelected?.(target.id);
      return true;
    }
    onEmpty();
    setPoints((prev) => [...prev, pos.x, pos.y]);
    return true;
  }, [fillMode, fillColor, findShapeAt, updateElement, pointerPos, onElementSelected]);

  const closePolygon = useCallback(() => {
    if (points.length < 6) { setPoints([]); return; }
    const xs: number[] = [];
    const ys: number[] = [];
    for (let i = 0; i < points.length; i += 2) {
      xs.push(points[i]);
      ys.push(points[i + 1]);
    }
    const minX = Math.min(...xs);
    const minY = Math.min(...ys);
    const maxX = Math.max(...xs);
    const maxY = Math.max(...ys);
    const rel = points.map((v, i) => (i % 2 === 0 ? v - minX : v - minY));

    const el: FillElement = {
      id: uid(), type: 'fill',
      x: minX, y: minY,
      width: Math.max(1, maxX - minX),
      height: Math.max(1, maxY - minY),
      rotation: 0,
      points: rel,
      fill: fillColor,
      stroke: '',
      strokeWidth: 0,
      opacity: 1,
    };
    addElement(el);
    setPoints([]);
  }, [points, fillColor, addElement]);

  const cancel = useCallback(() => setPoints([]), []);

  return { fillMode, setFillMode, fillColor, setFillColor, points, handleClick, closePolygon, cancel };
}