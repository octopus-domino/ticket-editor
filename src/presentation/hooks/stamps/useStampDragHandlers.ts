import { useCallback } from 'react';
import type Konva from 'konva';
import type { StampShapeItem, StampTextItem, StampImageItem } from '@/shared/types';
import { snapPosition, snapToHostCenter, findContainingShape } from '@/lib/stamps/geometry';

interface Args {
  shapes: StampShapeItem[];
  width: number;
  height: number;
  snapEnabled: boolean;
  updateShape: (id: string, patch: Partial<StampShapeItem>) => void;
  updateText: (id: string, patch: Partial<StampTextItem>) => void;
  updateImage: (id: string, patch: Partial<StampImageItem>) => void;
}

function isCtrlPressed(e: Konva.KonvaEventObject<any>): boolean {
  const evt = e.evt as MouseEvent | undefined;
  return !!(evt && (evt.ctrlKey || evt.metaKey));
}

export function useStampDragHandlers({ shapes, width, height, snapEnabled, updateShape, updateText, updateImage }: Args) {
  const handleShapeDragEnd = useCallback((id: string, e: Konva.KonvaEventObject<DragEvent>) => {
    const s = shapes.find((x) => x.id === id);
    if (!s || s.kind === 'fill') return;
    const node = e.target;
    const rawX = node.x() - s.width / 2;
    const rawY = node.y() - s.height / 2;
    if (isCtrlPressed(e)) {
      node.x(Math.round(rawX) + s.width / 2);
      node.y(Math.round(rawY) + s.height / 2);
      updateShape(id, { x: Math.round(rawX), y: Math.round(rawY) });
      return;
    }
    const host = findContainingShape(rawX + s.width / 2, rawY + s.height / 2, id, shapes);
    const cs = snapToHostCenter(rawX, rawY, s.width, s.height, host);
    let nx = cs.x, ny = cs.y;
    if (!cs.snappedX || !cs.snappedY) {
      const general = snapPosition(nx, ny, s.width, s.height, id, shapes, width, height, snapEnabled);
      if (!cs.snappedX) nx = general.x;
      if (!cs.snappedY) ny = general.y;
    }
    node.x(nx + s.width / 2);
    node.y(ny + s.height / 2);
    updateShape(id, { x: Math.round(nx), y: Math.round(ny) });
  }, [shapes, snapEnabled, width, height, updateShape]);

  const handleTextDragEnd = useCallback((id: string, e: Konva.KonvaEventObject<DragEvent>, text: StampTextItem) => {
    const node = e.target;
    if (isCtrlPressed(e)) {
      node.x(Math.round(node.x())); node.y(Math.round(node.y()));
      updateText(id, { x: Math.round(node.x()), y: Math.round(node.y()) });
      return;
    }
    const snapped = snapPosition(node.x(), node.y(), text.width, text.fontSize * 1.4, id, shapes, width, height, snapEnabled);
    node.x(snapped.x); node.y(snapped.y);
    updateText(id, { x: snapped.x, y: snapped.y });
  }, [shapes, snapEnabled, width, height, updateText]);

  const handleImageDragEnd = useCallback((id: string, e: Konva.KonvaEventObject<DragEvent>, image: StampImageItem) => {
    const node = e.target;
    if (isCtrlPressed(e)) {
      node.x(Math.round(node.x())); node.y(Math.round(node.y()));
      updateImage(id, { x: Math.round(node.x()), y: Math.round(node.y()) });
      return;
    }
    const snapped = snapPosition(node.x(), node.y(), image.width, image.height, id, shapes, width, height, snapEnabled);
    node.x(snapped.x); node.y(snapped.y);
    updateImage(id, { x: snapped.x, y: snapped.y });
  }, [shapes, snapEnabled, width, height, updateImage]);

  return { handleShapeDragEnd, handleTextDragEnd, handleImageDragEnd };
}