/* ============================================================
   stamps/StampShapeView.tsx
   F-SSTRAT-06, F-LN-09.
   ============================================================ */

import React from 'react';
import type Konva from 'konva';
import type { StampShapeItem } from '@/shared/types';
import { getShapeView } from './shapes';

interface Props {
  shape: StampShapeItem;
  allShapes?: StampShapeItem[];
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

const StampShapeViewInner: React.FC<Props> = ({
  shape, allShapes = [], draggable, isSelected,
  onSelect, onDragEnd, onPointsChange, onPointContextMenu,
}) => {
  const strategy = getShapeView(shape.kind);
  const View = strategy.View;
  return (
    <View
      shape={shape}
      allShapes={allShapes}
      draggable={draggable}
      isSelected={isSelected}
      onSelect={onSelect}
      onDragEnd={onDragEnd}
      onPointsChange={onPointsChange}
      onPointContextMenu={onPointContextMenu}
    />
  );
};

export const StampShapeView = React.memo(StampShapeViewInner, (prev, next) => (
  prev.shape === next.shape
  && prev.draggable === next.draggable
  && prev.isSelected === next.isSelected
  && prev.allShapes === next.allShapes
  && prev.onSelect === next.onSelect
  && prev.onDragEnd === next.onDragEnd
  && prev.onPointsChange === next.onPointsChange
  && prev.onPointContextMenu === next.onPointContextMenu
));