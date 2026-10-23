import React from 'react';
import type { StampShapeItem } from '@/shared/types';
import { getShapeView } from './shapes';

interface Props { shape: StampShapeItem; allShapes?: StampShapeItem[]; onChange: (p: Partial<StampShapeItem>) => void; }

export const ShapePropsPanel: React.FC<Props> = ({ shape, allShapes = [], onChange }) => {
  const strategy = getShapeView(shape.kind); const Panel = strategy.Panel;
  return <Panel shape={shape} allShapes={allShapes} onChange={onChange} />;
};