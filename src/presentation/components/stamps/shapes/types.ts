import type React from 'react';
import type Konva from 'konva';
import type { StampShapeItem } from '@/shared/types';

/**
 * F-SSTRAT-06, F-LN-09.
 * Все callback'и принимают id первого аргументом, чтобы родитель
 * мог передать стабильную ссылку (React.memo на View).
 */
export interface ShapeViewContext {
  shape: StampShapeItem;
  allShapes: StampShapeItem[];
  draggable: boolean;
  isSelected?: boolean;
  onSelect: (id: string) => void;
  onDragEnd: (id: string, e: Konva.KonvaEventObject<DragEvent>) => void;
  onPointsChange?: (id: string, points: number[]) => void;
  onPointContextMenu?: (
    shapeId: string,
    pointIndex: number,
    clientX: number,
    clientY: number,
  ) => void;
}

export interface ShapePanelContext {
  shape: StampShapeItem;
  allShapes: StampShapeItem[];
  onChange: (patch: Partial<StampShapeItem>) => void;
}

export interface ShapeViewStrategy {
  kind: StampShapeItem['kind'];
  View: React.FC<ShapeViewContext>;
  Panel: React.FC<ShapePanelContext>;
}