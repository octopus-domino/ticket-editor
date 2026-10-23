import React from 'react';
import { Transformer } from 'react-konva';
import type Konva from 'konva';
import type { StampShapeItem } from '@/shared/types';

interface Props {
  trRef: React.RefObject<Konva.Transformer>;
  selectedShape: StampShapeItem | null;
  onTransformEnd: (e: Konva.KonvaEventObject<Event>) => void;
}

export const StampTransformer: React.FC<Props> = ({ trRef, selectedShape, onTransformEnd }) => (
  <Transformer
    ref={trRef as any}
    rotateEnabled
    // F-STMP-E-06 / F-LN-06: линия должна ресайзиться как на главном канвасе.
    // Запрещён только resize для fill (у него нет собственной геометрии).
    resizeEnabled={selectedShape?.kind !== 'fill'}
    keepRatio={selectedShape?.kind === 'circle'}
    borderStroke="#6366f1"
    borderDash={[4, 4]}
    anchorStroke="#6366f1"
    anchorFill="#eef2ff"
    anchorSize={8}
    anchorCornerRadius={2}
    padding={4}
    rotationSnaps={[
      0, 15, 30, 45, 60, 75, 90, 105, 120, 135, 150, 165,
      180, 195, 210, 225, 240, 255, 270, 285, 300, 315, 330, 345,
    ]}
    rotationSnapTolerance={5}
    boundBoxFunc={(o, n) => (n.width < 8 || n.height < 8 ? o : n)}
    onTransformEnd={onTransformEnd}
  />
);