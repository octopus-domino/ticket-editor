import { useCallback } from 'react';
import type Konva from 'konva';
import type { StampShapeItem, StampImageItem } from '@/shared/types';
import { getShapeStrategy } from '@/lib/stamps/shapes';

type SelectionType = 'shape' | 'text' | 'image' | null;

interface Args {
  shapes: StampShapeItem[]; images: StampImageItem[];
  selectedType: SelectionType;
  updateShape: (id: string, patch: Partial<StampShapeItem>) => void;
  updateImage: (id: string, patch: Partial<StampImageItem>) => void;
}

export function useStampTransform({ shapes, images, selectedType, updateShape, updateImage }: Args) {
  return useCallback((e: Konva.KonvaEventObject<Event>) => {
    const node = e.target; const id = node.id();
    const evt = e.evt as MouseEvent | undefined;
    const ctrl = !!(evt && (evt.ctrlKey || evt.metaKey));

    if (selectedType === 'shape') {
      const s = shapes.find((x) => x.id === id);
      if (!s || s.kind === 'fill') return;
      const strategy = getShapeStrategy(s.kind);
      const result = strategy.applyTransform({
        shape: s, nodeX: node.x(), nodeY: node.y(), nodeRotation: node.rotation(),
        scaleX: node.scaleX(), scaleY: node.scaleY(), ctrl, shapes,
      });
      if (result.resetScale) { node.scaleX(1); node.scaleY(1); }
      updateShape(id, result.patch);
      return;
    }

    if (selectedType === 'image') {
      const im = images.find((x) => x.id === id);
      if (!im) return;
      const nw = Math.max(8, im.width * node.scaleX());
      const nh = Math.max(8, im.height * node.scaleY());
      node.scaleX(1); node.scaleY(1);
      updateImage(id, { x: Math.round(node.x()), y: Math.round(node.y()), width: Math.round(nw), height: Math.round(nh) });
    }
  }, [shapes, images, selectedType, updateShape, updateImage]);
}