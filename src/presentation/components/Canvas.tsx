import React, { useCallback, useEffect, useRef } from 'react';
import { Stage, Layer, Rect, Transformer } from 'react-konva';
import type Konva from 'konva';
import type { Slide, AnchorSide, CanvasElement, GroupElement } from '@/shared/types';
import { useStore } from '@/shared/store/store';
import { useDocumentStore, useSelectionStore, useModalsStore } from '@/ui/providers/EditorProvider';
import { ElementRenderer } from './ElementRenderer';
import { GridLayer } from './GridLayer';
import { CanvasPreviewLayer } from './canvas/CanvasPreviewLayer';
import { useCanvasViewport } from '@/ui/hooks/canvas/useCanvasViewport';
import {
  useCanvasDrag, useCanvasRubberBand, useCanvasFillMode,
  useCanvasConnectorDraft, useCanvasDrop, useCanvasHoverAnchor, useCanvasDblClick,
} from '@/ui/hooks/canvas';
import type { ElementSelectEvent } from './elements/types';

interface Props {
  slide: Slide;
  zoom: number;
  onZoomChange: (z: number | ((prev: number) => number)) => void;
  wrapRef: React.RefObject<HTMLDivElement>;
}

function isMultiSelectEvent(evt: unknown): boolean {
  if (!(evt instanceof MouseEvent) && !(evt instanceof PointerEvent)) return false;
  return evt.shiftKey || evt.metaKey || evt.ctrlKey;
}

export const Canvas: React.FC<Props> = ({ slide, zoom, onZoomChange, wrapRef }) => {
  const docStore = useDocumentStore();
  const selStore = useSelectionStore();
  const modalsStore = useModalsStore();

  const stageRef = useRef<Konva.Stage>(null);
  const trRef = useRef<Konva.Transformer>(null);
  const isDraggingRef = useRef(false);

  const elementsRef = useRef(slide.elements);
  if (elementsRef.current !== slide.elements) elementsRef.current = slide.elements;

  const selectedIds = useStore(selStore, (s) => s.selectedIds);
  const editing = useStore(modalsStore, (s) => s.editing);
  const fillMode = useStore(modalsStore, (s) => s.fillMode);
  const showGrid = useStore(modalsStore, (s) => s.showGrid);
  const showMargins = useStore(modalsStore, (s) => s.showMargins);

  const viewport = useCanvasViewport({ wrapRef, zoom, onZoomChange, stageRef });
  const drag = useCanvasDrag({ docStore, selStore, modalsStore, slide });
  const rubber = useCanvasRubberBand({ selStore });
  const fill = useCanvasFillMode({ docStore, modalsStore, slide, stageRef });
  const draft = useCanvasConnectorDraft({ docStore, slide });
  const drop = useCanvasDrop({ docStore, stageRef, zoom });
  const hover = useCanvasHoverAnchor({ slide });
  const dbl = useCanvasDblClick({ modalsStore, zoom });

  useEffect(() => {
    const tr = trRef.current;
    const stage = stageRef.current;
    if (!tr || !stage) return;

    if (selectedIds.length !== 1) {
      tr.nodes([]);
      return;
    }

    const el = slide.elements.find((e) => e.id === selectedIds[0]);
    if (!el) {
      tr.nodes([]);
      return;
    }

    const node = stage.findOne('#' + selectedIds[0]);
    if (node) {
      tr.nodes([node]);
      tr.getLayer()?.batchDraw();
    } else {
      tr.nodes([]);
    }
  }, [selectedIds, slide.elements]);

  const handleStartDraft = useCallback((id: string, side: AnchorSide, _clientX: number, _clientY: number) => {
    if (viewport.isPanning) return;
    const stage = stageRef.current;
    if (!stage) return;
    const pointer = stage.getPointerPosition();
    if (!pointer) return;
    draft.startDraft(id, side, pointer.x / zoom, pointer.y / zoom);
  }, [zoom, draft, viewport.isPanning]);

  const onStageDown = useCallback((e: Konva.KonvaEventObject<MouseEvent>) => {
    isDraggingRef.current = false;
    if (viewport.isPanning) {
      viewport.handleMouseDown(e.evt);
      return;
    }
    const stage = e.target.getStage();
    const isStage = e.target === stage;
    const p = stage?.getPointerPosition();
    if (!p) return;

    const wx = p.x / zoom;
    const wy = p.y / zoom;

    if (fillMode) {
      if (isStage) fill.applyFill(wx, wy);
      return;
    }

    if (isStage) {
      selStore.clear();
      modalsStore.setFloatingPos(null);
      rubber.begin(wx, wy);
    }
  }, [zoom, fillMode, fill, selStore, modalsStore, rubber, viewport]);

  const onStageMove = useCallback((e: Konva.KonvaEventObject<MouseEvent>) => {
    if (viewport.isPanning) return;
    if (isDraggingRef.current) return;
    const stage = e.target.getStage();
    const p = stage?.getPointerPosition();
    if (!p) return;
    const wx = p.x / zoom;
    const wy = p.y / zoom;
    draft.update(wx, wy);
    rubber.update(wx, wy);
    hover.update(e, wx, wy);
  }, [zoom, draft, rubber, hover, viewport.isPanning]);

  const onStageUp = useCallback((e: Konva.KonvaEventObject<MouseEvent>) => {
    if (viewport.isPanning) return;
    if (draft.isDrafting()) {
      const stage = e.target.getStage();
      const p = stage?.getPointerPosition();
      if (p) draft.commit(p.x / zoom, p.y / zoom);
    }
    if (rubber.isActive()) rubber.finish(slide.elements);
  }, [zoom, draft, rubber, slide.elements, viewport.isPanning]);

  const handleSelect = (el: CanvasElement, e?: ElementSelectEvent) => {
    if (viewport.isPanning) return;
    const nativeEvt = e && 'evt' in e ? e.evt : undefined;
    const multi = isMultiSelectEvent(nativeEvt);
    const current = selStore.getState().selectedIds;

    const parentGroup = slide.elements.find(
      (p): p is GroupElement => p.type === 'group' && p.children.includes(el.id)
    );

    if (parentGroup) {
      if (multi) {
        const newIds = [...new Set([...current, parentGroup.id])];
        selStore.setIds(newIds);
      } else if (!current.includes(parentGroup.id)) {
        selStore.setIds([parentGroup.id]);
      }
      return;
    }

    if (multi) selStore.select(el.id, true);
    else if (!current.includes(el.id)) selStore.select(el.id);
  };

  return (
    <div
      className="stage-wrap"
      data-fill-mode={fillMode || undefined}
      role="presentation"
      aria-label={`Холст, ${slide.elements.length} элементов`}
      onDragOver={drop.onDragOver}
      onDrop={drop.onDrop}
    >
      <Stage
        ref={stageRef}
        width={slide.width * zoom}
        height={slide.height * zoom}
        scaleX={zoom}
        scaleY={zoom}
        onMouseDown={onStageDown}
        onMouseMove={onStageMove}
        onMouseUp={onStageUp}
        onContextMenu={(e) => {
          e.evt.preventDefault();
          modalsStore.setContextMenu({
            x: e.evt.clientX,
            y: e.evt.clientY,
            elementId: null,
          });
        }}
        style={{
          cursor: viewport.isPanning ? 'grab' : fillMode ? 'crosshair' : 'default',
        }}
      >
        <Layer listening={false}>
          <Rect x={0} y={0} width={slide.width} height={slide.height} fill={slide.background} />
          {showGrid && <GridLayer width={slide.width} height={slide.height} />}
          {showMargins && (
            <Rect
              x={slide.padding.left}
              y={slide.padding.top}
              width={Math.max(0, slide.width - slide.padding.left - slide.padding.right)}
              height={Math.max(0, slide.height - slide.padding.top - slide.padding.bottom)}
              stroke="#3b82f6"
              strokeWidth={1 / zoom}
              dash={[6 / zoom, 4 / zoom]}
              listening={false}
            />
          )}
        </Layer>

        <Layer name="elements-layer" listening={!fillMode}>
          {slide.elements.map((el) => (
            <ElementRenderer
              key={el.id}
              element={el}
              elements={el.type === 'connector' ? elementsRef.current : undefined}
              isSelected={selectedIds.includes(el.id)}
              isEditing={editing?.id === el.id}
              onSelect={(e) => handleSelect(el, e)}
              onUpdate={(patch, newElement) => {
                docStore.commit((d) => {
                  const s = d.slides.find((x) => x.id === d.activeId);
                  const target = s?.elements.find((x) => x.id === el.id);
                  if (target) Object.assign(target, patch);
                  if (newElement && s) s.elements.push(newElement);
                }, `upd-${el.id}`);
              }}
              onDblClick={(e) => {
                if (!e) return;
                const stage = stageRef.current;
                if (!stage) return;
                const evt = e.evt;
                const clientX = 'clientX' in evt ? evt.clientX : 0;
                const clientY = 'clientY' in evt ? evt.clientY : 0;
                const rect = stage.container().getBoundingClientRect();
                dbl.handle(el, {
                  viewportLeft: rect.left,
                  viewportTop: rect.top,
                  clientX,
                  clientY,
                });
              }}
              onDragStart={(e) => {
                if (draft.isDrafting() || viewport.isPanning) {
                  e.target.stopDrag();
                  return;
                }
                drag.onDragStart(el, e);
                isDraggingRef.current = true;
              }}
              onDragMove={(e) => drag.onDragMove(e)}
              onDragEnd={(e) => {
                isDraggingRef.current = false;
                drag.onDragEnd(e);
              }}
              onContextMenu={(ev: Konva.KonvaEventObject<PointerEvent>) => {
                ev.evt.preventDefault();
                const parentGroup = slide.elements.find(
                  (p): p is GroupElement => p.type === 'group' && p.children.includes(el.id)
                );
                const targetId = parentGroup ? parentGroup.id : el.id;
                if (!selectedIds.includes(targetId)) selStore.select(targetId);
                modalsStore.setContextMenu({
                  x: ev.evt.clientX,
                  y: ev.evt.clientY,
                  elementId: targetId,
                });
              }}
            />
          ))}
        </Layer>

        <Layer name="transformer-layer" listening={!fillMode}>
          <Transformer
            ref={trRef}
            rotateEnabled
            resizeEnabled
            keepRatio={false}
            draggable={false}
            rotationSnaps={[0, 15, 30, 45, 60, 75, 90, 105, 120, 135, 150, 165, 180, 195, 210, 225, 240, 255, 270, 285, 300, 315, 330, 345]}
            rotationSnapTolerance={6}
            borderStroke="#f59e0b"
            anchorStroke="#f59e0b"
            anchorFill="#fbbf24"
            anchorSize={10}
            shouldOverdrawWholeArea={false}
            boundBoxFunc={(oldBox, newBox) => {
              if (newBox.width < 20 || newBox.height < 20) return oldBox;
              return newBox;
            }}
            onTransformEnd={(e) => {
              const node = e.target;
              const id = node.id();
              const sx = node.scaleX();
              const sy = node.scaleY();
              const rotation = node.rotation();

              if (sx === 1 && sy === 1 && rotation === 0) return;

              node.scaleX(1);
              node.scaleY(1);

              docStore.commit((d) => {
                const s = d.slides.find((x) => x.id === d.activeId);
                if (!s) return;
                const target = s.elements.find((x) => x.id === id);
                if (!target) return;

                const oldX = target.x;
                const oldY = target.y;

                if (target.type === 'group') {
                  const group = target;
                  target.x = node.x();
                  target.y = node.y();
                  target.rotation = rotation;
                  target.width = Math.max(20, target.width * sx);
                  target.height = Math.max(20, target.height * sy);

                  for (const child of s.elements) {
                    if (group.children.includes(child.id)) {
                      const relX = child.x - oldX;
                      const relY = child.y - oldY;
                      child.x = target.x + relX * sx;
                      child.y = target.y + relY * sy;
                      child.width = Math.max(20, child.width * sx);
                      child.height = Math.max(20, child.height * sy);
                    }
                  }
                } else {
                  target.x = node.x();
                  target.y = node.y();
                  target.rotation = rotation;
                  target.width = Math.max(20, target.width * sx);
                  target.height = Math.max(20, target.height * sy);

                  // Scale polygon points
                  if (target.type === 'shape' && target.shape === 'polygon') {
                    const shape = target;
                    if (Array.isArray(shape.polygonPoints) && shape.polygonPoints.length > 0) {
                      const pts = shape.polygonPoints;
                      for (let i = 0; i < pts.length; i += 2) {
                        pts[i] = Math.round(pts[i] * sx);
                        pts[i + 1] = Math.round(pts[i + 1] * sy);
                      }
                    }
                    if (Array.isArray(shape.polygonSubpaths)) {
                      for (const ring of shape.polygonSubpaths) {
                        for (let i = 0; i < ring.length; i += 2) {
                          ring[i] = Math.round(ring[i] * sx);
                          ring[i + 1] = Math.round(ring[i + 1] * sy);
                        }
                      }
                    }
                  }

                  // Scale clipPath
                  if (target.clipPathId) {
                    const clipper = s.elements.find((e) => e.id === target.clipPathId);
                    if (clipper) {
                      const relX = clipper.x - oldX;
                      const relY = clipper.y - oldY;
                      clipper.x = target.x + relX * sx;
                      clipper.y = target.y + relY * sy;
                      clipper.width = Math.max(1, clipper.width * sx);
                      clipper.height = Math.max(1, clipper.height * sy);
                    }
                  }
                }
              }, `trans-${id}`);
            }}
          />
        </Layer>

        <CanvasPreviewLayer
          zoom={zoom}
          fillPoints={fill.points()}
          draft={draft.current()}
          elements={slide.elements}
          rubberBand={rubber.ref()}
          onStartDraft={handleStartDraft}
          ghostRect={draft.getGhostRect()}
          selectedIds={selectedIds}
          slideWidth={slide.width}
          slideHeight={slide.height}
          listening={!fillMode}
        />
      </Stage>
    </div>
  );
};