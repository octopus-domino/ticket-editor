import React, { useCallback, useMemo } from 'react';
import { Layer, Image as KImage } from 'react-konva';
import type Konva from 'konva';
import type {
  StampShapeItem, StampTextItem, StampImageItem,
} from '@/shared/types';
import { StampShapeView } from '../StampShapeView';
import { StampStraightTextView } from '../StampStraightTextView';
import { StampArcTextView } from '../StampArcTextView';
import { StampTransformer } from './StampTransformer';
import { CompositeFillLayer } from './CompositeFillLayer';

type SelectionType = 'shape' | 'text' | 'image' | null;

interface Props {
  layerRef: React.RefObject<Konva.Layer>;
  trRef: React.RefObject<Konva.Transformer>;
  stampW: number;
  stampH: number;
  shapes: StampShapeItem[];
  texts: StampTextItem[];
  images: StampImageItem[];
  imageCache: Record<string, HTMLImageElement>;
  selectedId: string | null;
  selectedType: SelectionType;
  selectedShape: StampShapeItem | null;
  snap: boolean;
  listening?: boolean;
  onSelect: (id: string, type: Exclude<SelectionType, null>) => void;
  onShapeDragEnd: (id: string, e: Konva.KonvaEventObject<DragEvent>) => void;
  onTextDragEnd: (id: string, e: Konva.KonvaEventObject<DragEvent>, text: StampTextItem) => void;
  onImageDragEnd: (id: string, e: Konva.KonvaEventObject<DragEvent>, image: StampImageItem) => void;
  onTransformEnd: (e: Konva.KonvaEventObject<Event>) => void;
  onOpenTextEditor: (id: string) => void;
  onUpdateText: (id: string, patch: Partial<StampTextItem>) => void;
  onPointsChange?: (id: string, points: number[]) => void;
  onPointContextMenu?: (
    shapeId: string,
    pointIndex: number,
    clientX: number,
    clientY: number,
  ) => void;
}

const StampElementsLayerInner: React.FC<Props> = ({
  layerRef, trRef, stampW, stampH, shapes, texts, images, imageCache,
  selectedId, selectedType, selectedShape, snap, listening = true,
  onSelect, onShapeDragEnd, onTextDragEnd, onImageDragEnd, onTransformEnd,
  onOpenTextEditor, onUpdateText, onPointsChange, onPointContextMenu,
}) => {
  const regularShapes = useMemo(
    () => shapes.filter((s) => s.kind !== 'fill'),
    [shapes],
  );
  const legacyFills = useMemo(
    () => shapes.filter((s) => s.kind === 'fill' && !s.fillTargetShapeId),
    [shapes],
  );

  const handleShapeSelect = useCallback(
    (id: string) => onSelect(id, 'shape'),
    [onSelect],
  );
  const handleLegacyFillSelect = useCallback(
    (id: string) => onSelect(id, 'shape'),
    [onSelect],
  );
  const handleImageSelect = useCallback(
    (id: string) => onSelect(id, 'image'),
    [onSelect],
  );

  return (
    <Layer ref={layerRef as any} listening={listening}>
      <CompositeFillLayer width={stampW} height={stampH} shapes={shapes} />

      {legacyFills.map((s) =>
        s.hidden ? null : (
          <StampShapeView
            key={s.id}
            shape={s}
            allShapes={shapes}
            draggable={false}
            onSelect={handleLegacyFillSelect}
            onDragEnd={onShapeDragEnd}
          />
        ),
      )}

      {regularShapes.map((s) =>
        s.hidden ? null : (
          <StampShapeView
            key={s.id}
            shape={s}
            allShapes={shapes}
            draggable={!s.locked}
            isSelected={selectedId === s.id && selectedType === 'shape'}
            onSelect={handleShapeSelect}
            onDragEnd={onShapeDragEnd}
            onPointsChange={onPointsChange}
            onPointContextMenu={onPointContextMenu}
          />
        ),
      )}

      {images.map((im) => {
        if (im.hidden) return null;
        const img = imageCache[im.src];
        if (!img) return null;
        return (
          <KImage
            key={im.id}
            id={im.id}
            name="image"
            x={im.x}
            y={im.y}
            width={im.width}
            height={im.height}
            image={img}
            draggable={!im.locked}
            perfectDrawEnabled={false}
            onClick={(e) => { e.cancelBubble = true; handleImageSelect(im.id); }}
            onTap={(e) => { e.cancelBubble = true; handleImageSelect(im.id); }}
            onDragEnd={(e) => onImageDragEnd(im.id, e, im)}
          />
        );
      })}

      {texts.map((t) => {
        if (t.hidden) return null;

        if (t.mode === 'straight') {
          return (
            <StampStraightTextView
              key={t.id}
              text={t}
              draggable={!t.locked}
              isSelected={selectedId === t.id && selectedType === 'text'}
              onSelect={() => onSelect(t.id, 'text')}
              onDblClick={() => {
                onSelect(t.id, 'text');
                onOpenTextEditor(t.id);
              }}
              onDragEnd={(e) => onTextDragEnd(t.id, e, t)}
            />
          );
        }

        return (
          <StampArcTextView
            key={t.id}
            text={t}
            shapes={shapes}
            snapEnabled={snap}
            draggable={!t.locked}
            isSelected={selectedId === t.id && selectedType === 'text'}
            onSelect={() => onSelect(t.id, 'text')}
            onDblClick={() => {
              onSelect(t.id, 'text');
              onOpenTextEditor(t.id);
            }}
            onUpdate={(patch) => onUpdateText(t.id, patch)}
          />
        );
      })}

      {listening && (
        <StampTransformer
          trRef={trRef}
          selectedShape={selectedShape}
          onTransformEnd={onTransformEnd}
        />
      )}
    </Layer>
  );
};

export const StampElementsLayer = React.memo(StampElementsLayerInner);