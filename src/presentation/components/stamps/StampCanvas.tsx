import React, { useEffect } from 'react';
import { Stage } from 'react-konva';
import type Konva from 'konva';
import type {
  StampShapeItem,
  StampTextItem,
  StampImageItem,
} from '@/shared/types';
import { StampBackgroundLayer } from './canvas/StampBackgroundLayer';
import { StampElementsLayer } from './canvas/StampElementsLayer';

type SelectionType = 'shape' | 'text' | 'image' | null;

interface Props {
  wrapRef: React.RefObject<HTMLDivElement>;
  stageRef: React.RefObject<Konva.Stage>;
  trRef: React.RefObject<Konva.Transformer>;
  layerRef: React.RefObject<Konva.Layer>;
  wrapSize: { w: number; h: number };
  width: number;
  height: number;
  zoom: number;
  pan: { x: number; y: number };
  onWheel: (e: Konva.KonvaEventObject<WheelEvent>) => void;
  onStageMouseDown: () => void;
  showGrid: boolean;
  shapes: StampShapeItem[];
  texts: StampTextItem[];
  images: StampImageItem[];
  imageCache: Record<string, HTMLImageElement>;
  selectedId: string | null;
  selectedType: SelectionType;
  selectedShape: StampShapeItem | null;
  snap: boolean;
  fillMode: boolean;
  onFillClick: (px: number, py: number) => void;
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
  children?: React.ReactNode;
}

export const StampCanvas: React.FC<Props> = ({
  wrapRef, stageRef, trRef, layerRef, wrapSize, width, height, zoom, pan,
  onWheel, onStageMouseDown, showGrid, shapes, texts, images, imageCache,
  selectedId, selectedType, selectedShape, snap, fillMode, onFillClick,
  onSelect, onShapeDragEnd, onTextDragEnd, onImageDragEnd, onTransformEnd,
  onOpenTextEditor, onUpdateText, onPointsChange, onPointContextMenu, children,
}) => {
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const prev = el.style.cursor;
    el.style.cursor = fillMode ? 'crosshair' : '';
    return () => { el.style.cursor = prev; };
  }, [fillMode, wrapRef]);

  return (
    <div className="stamp-editor-canvas" ref={wrapRef}>
      <Stage
        ref={stageRef as any}
        width={wrapSize.w}
        height={wrapSize.h}
        x={pan.x}
        y={pan.y}
        scaleX={zoom}
        scaleY={zoom}
        onWheel={onWheel}
        onMouseDown={(e) => {
          const stage = e.target.getStage();
          const pos = stage?.getRelativePointerPosition();
          if (fillMode && pos) {
            onFillClick(pos.x, pos.y);
            return;
          }
          if (e.target === stage) {
            onStageMouseDown();
          }
        }}
      >
        <StampBackgroundLayer width={width} height={height} zoom={zoom} showGrid={showGrid} />
        <StampElementsLayer
          layerRef={layerRef}
          trRef={trRef}
          stampW={width}
          stampH={height}
          shapes={shapes}
          texts={texts}
          images={images}
          imageCache={imageCache}
          selectedId={selectedId}
          selectedType={selectedType}
          selectedShape={selectedShape}
          snap={snap}
          listening={!fillMode}
          onSelect={onSelect}
          onShapeDragEnd={onShapeDragEnd}
          onTextDragEnd={onTextDragEnd}
          onImageDragEnd={onImageDragEnd}
          onTransformEnd={onTransformEnd}
          onOpenTextEditor={onOpenTextEditor}
          onUpdateText={onUpdateText}
          onPointsChange={onPointsChange}
          onPointContextMenu={onPointContextMenu}
        />
      </Stage>
      {children}
    </div>
  );
};