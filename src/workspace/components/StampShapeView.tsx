import React from 'react';
import type Konva from 'konva';
import type { StampShapeItem } from '../../types';
import { getShapeView } from './shapes';

interface Props {
  shape: StampShapeItem;
  allShapes?: StampShapeItem[];
  draggable: boolean;
  isSelected?: boolean;
  onSelect: () => void;
  onDragEnd: (e: Konva.KonvaEventObject<DragEvent>) => void;
  onPointsChange?: (points: number[]) => void;
}

export const StampShapeView: React.FC<Props> = ({
  shape, allShapes = [], draggable, isSelected,
  onSelect, onDragEnd, onPointsChange,
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
    />
  );
};