import React, { useEffect, useMemo, useRef } from 'react';
import {
  Stage, Layer, Rect, Transformer,
  Image as KImage, Line as KLine, Shape,
} from 'react-konva';
import type { EditorApi } from '../../hooks/useEditor';
import type { CanvasElement, AnchorSide } from '../../types';
import { GRID_SIZE } from '../../types';
import { getStrategy, type EditorActionsContext } from '../../lib/elements';
import { AnchorOverlay } from './AnchorOverlay';
import { previewPoints, ghostRectForDraft } from '../../hooks/useConnectorDraft';
import { ANCHOR_OFFSET } from '../../lib/connectors';

interface Props {
  editor: EditorApi;
  wrapRef: React.RefObject<HTMLDivElement>;
}

type HandlerEntry = {
  onSelect: (e?: any) => void;
  onUpdate: (p: any) => void;
  onDragStart: (e: any) => void;
  onDragMove: (e: any) => void;
  onDragEnd: (e: any) => void;
  onContextMenu: (e: any) => void;
  isSelected: boolean;
  __el: CanvasElement;
  __isEditing: boolean;
  __isSelected: boolean;
};
type HandlerMap = Record<string, HandlerEntry>;

const EditorStageInner: React.FC<Props> = ({ editor, wrapRef }) => {
  const { activeSlide, zoom, selectedIds, editing } = editor;
  const fillsLayerRef = useRef<any>(null);
  const hoverPad = ANCHOR_OFFSET + 16 / zoom;

  const editorRef = useRef(editor);
  editorRef.current = editor;

  /* ---------- Один проход по elements вместо трёх .filter() ---------- */
  const { fillElements, connectorElements, regularElements } = useMemo(() => {
    const fills: CanvasElement[] = [];
    const connectors: CanvasElement[] = [];
    const regular: CanvasElement[] = [];
    for (const el of activeSlide.elements) {
      if (el.type === 'fill') fills.push(el);
      else if (el.type === 'connector') connectors.push(el);
      else regular.push(el);
    }
    return {
      fillElements: fills,
      connectorElements: connectors,
      regularElements: regular,
    };
  }, [activeSlide.elements]);

  /* ---------- Transformer sync ---------- */
  useEffect(() => {
    const tr = editor.trRef.current;
    const stage = editor.stageRef.current;
    if (!tr || !stage) return;

    if (editor.connectorDraft) {
      tr.nodes([]);
      tr.getLayer()?.batchDraw();
      return;
    }
    if (!selectedIds.length) {
      tr.nodes([]);
      tr.getLayer()?.batchDraw();
      return;
    }

    const layers = stage.getLayers();
    const nodes = selectedIds
      .map((id) => {
        for (const l of layers) {
          const node = l.findOne('#' + id);
          if (node) return node;
        }
        return null;
      })
      .filter((n): n is any => !!n);

    tr.nodes(nodes);
    tr.getLayer()?.batchDraw();
  }, [selectedIds, activeSlide, editor.trRef, editor.stageRef, editor.connectorDraft]);

  /* ---------- Opacity fills-слоя ---------- */
  useEffect(() => {
    const layer = fillsLayerRef.current;
    if (!layer) return;
    const canvas = layer.getCanvas?.()?._canvas as HTMLCanvasElement | undefined;
    if (canvas) canvas.style.opacity = '0.6';
  }, [activeSlide.id]);

  /* ---------- Stage events ---------- */

  const handleStageMouseDown = (e: any) => {
    const cur = editorRef.current;
    if (cur.fillMode) {
      cur.handleFillClick(() => {});
      return;
    }
    if (e.target !== e.target.getStage()) return;
    if (editing) { cur.commitEdit(); return; }

    cur.clearSelection();
    cur.setFloatingPos(null);
    cur.setShowTextToolbar(false);
    cur.rubberBandStart();
  };

  const handleStageMouseMove = (e: any) => {
    if (editorRef.current.isDraggingRef?.current) return;

    if (editor.isDragging) {
      if (editor.connectorDraft) {
        const stage = e.target.getStage();
        const pos = stage?.getPointerPosition();
        if (pos) editor.moveConnectorDraft(pos.x / zoom, pos.y / zoom);
      }
      return;
    }

    editor.rubberBandMove();

    const stage = e.target.getStage();
    if (!stage) return;
    const pos = stage.getPointerPosition();
    if (!pos) return;
    const worldX = pos.x / zoom;
    const worldY = pos.y / zoom;

    editor.setHoveredId(
      editor.findElementIdAtWithPad(
        worldX, worldY, hoverPad,
        [editor.connectorDraft?.fromId || ''],
      ) || null,
    );

    if (editor.connectorDraft) {
      editor.moveConnectorDraft(worldX, worldY);
    }
  };

  const handleStageMouseUp = () => {
    const cur = editorRef.current;
    cur.rubberBandEnd();
    if (cur.connectorDraft) cur.commitConnectorDraft();
  };

  const handleStageMouseLeave = () => {
    editorRef.current.setHoveredId(null);
  };

  const handleContextMenu = (e: any, elementId: string | null) => {
    e.evt.preventDefault();
    const cur = editorRef.current;
    if (elementId && !selectedIds.includes(elementId)) cur.setSelectedIds([elementId]);
    cur.setContextMenu({ x: e.evt.clientX, y: e.evt.clientY, elementId });
    cur.setFloatingPos(null);
  };

  /* ---------- Стабильный editorCtx (пустые deps) ---------- */
  const editorCtx: EditorActionsContext = useMemo(
    () => ({
      openEditor: (el, field, clickPos) => editorRef.current.openEditor(el, field, clickPos),
      openCellEditor: (el, r, c) => editorRef.current.openCellEditor(el, r, c),
      openStampEditor: (id) => editorRef.current.openStampEditor(id),
      openDiagramEditor: (id) => editorRef.current.openDiagramEditor(id),
    }),
    [],
  );

  /* ---------- handlers с кэшем по element.id ---------- */
  const handlersCacheRef = useRef<HandlerMap>({});

  const handlers = useMemo(() => {
    const cache = handlersCacheRef.current;
    const next: HandlerMap = {};

    const make = (el: CanvasElement): Omit<HandlerEntry, '__el' | '__isEditing' | '__isSelected'> => ({
      onSelect: (e?: any) => {
        const cur = editorRef.current;
        if (cur.fillMode) {
          if (el.type === 'shape' || el.type === 'fill') {
            cur.updateWithHistory(el.id, { fill: cur.fillColor });
          }
          return;
        }
        if (editing && editing.id !== el.id) cur.commitEdit();

        const shift = !!(e?.evt?.shiftKey || e?.evt?.metaKey || e?.evt?.ctrlKey);
        if (shift) {
          const ids = selectedIds.includes(el.id)
            ? selectedIds.filter((id) => id !== el.id)
            : [...selectedIds, el.id];
          cur.setSelectedIds(ids);
        } else if (!selectedIds.includes(el.id)) {
          cur.setSelectedIds([el.id]);
        }

        if (!editing || editing.id !== el.id) cur.setShowTextToolbar(false);

        const skipFloating = el.type === 'text' || el.type === 'footer';
        if (e?.evt && e.evt.button === 0 && !skipFloating) {
          cur.setFloatingPos({ x: e.evt.clientX, y: e.evt.clientY });
        } else if (skipFloating) {
          cur.setFloatingPos(null);
        }
      },
      onUpdate: (p: any) => editorRef.current.updateWithHistory(el.id, p),
      onDragStart: (e: any) => editorRef.current.handleElDragStart(el, e),
      onDragMove: (e: any) => editorRef.current.handleElDragMove(el, e),
      onDragEnd: (e: any) => editorRef.current.handleElDragEnd(el, e),
      onContextMenu: (e: any) => handleContextMenu(e, el.id),
      isSelected: selectedIds.includes(el.id),
    });

    for (const el of activeSlide.elements) {
      const isEditing = editing?.id === el.id;
      const isSelected = selectedIds.includes(el.id);
      const cached = cache[el.id];

      if (
        cached
        && cached.__el === el
        && cached.__isEditing === isEditing
        && cached.__isSelected === isSelected
      ) {
        next[el.id] = cached;
        continue;
      }

      next[el.id] = {
        ...make(el),
        __el: el,
        __isEditing: isEditing,
        __isSelected: isSelected,
      };
    }

    handlersCacheRef.current = next;
    return next;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeSlide.elements, selectedIds, editing]);

  const handleStartDraft = (side: AnchorSide, e: any) => {
    const stage = e.target.getStage();
    if (!stage) return;
    const pos = stage.getPointerPosition();
    if (!pos) return;
    const el = activeSlide.elements.find((x) => x.id === editor.hoveredId);
    if (!el) return;
    editor.startConnectorDraft(el.id, side, pos.x / zoom, pos.y / zoom);
  };

  /* ---------- Производные ---------- */
  const draftPreview = editor.connectorDraft
    ? previewPoints(editor.connectorDraft, activeSlide.elements)
    : null;

  const hoveredElement = editor.hoveredId
    ? activeSlide.elements.find((e) => e.id === editor.hoveredId) || null
    : null;

  const draftTargetElement = editor.connectorDraft?.hoverTargetId
    ? activeSlide.elements.find((e) => e.id === editor.connectorDraft!.hoverTargetId) || null
    : null;

  const ghostRect = editor.connectorDraft
    ? ghostRectForDraft(editor.connectorDraft, activeSlide.elements)
    : null;

  return (
    <Stage
      ref={editor.stageRef as any}
      width={activeSlide.width * zoom}
      height={activeSlide.height * zoom}
      scaleX={zoom}
      scaleY={zoom}
      onMouseDown={handleStageMouseDown}
      onMouseMove={handleStageMouseMove}
      onMouseUp={handleStageMouseUp}
      onMouseLeave={handleStageMouseLeave}
      onDblClick={() => {
        if (editor.fillMode && editor.fillPoints.length >= 6) editor.closePolygon();
      }}
      onDblTap={() => {
        if (editor.fillMode && editor.fillPoints.length >= 6) editor.closePolygon();
      }}
      onContextMenu={(e) => handleContextMenu(e, null)}
    >
      {/* Слой 1: фон */}
      <Layer listening={false}>
        <Rect
          x={0} y={0}
          width={activeSlide.width} height={activeSlide.height}
          fill={activeSlide.background}
          shadowColor="#000" shadowBlur={10} shadowOpacity={0.18} shadowOffsetY={2}
        />
        {activeSlide.backgroundImage && (
          <BgImage src={activeSlide.backgroundImage} w={activeSlide.width} h={activeSlide.height} />
        )}
        {editor.showGrid && <GridLayer w={activeSlide.width} h={activeSlide.height} />}
        {editor.showMargins && (
          <Rect
            x={activeSlide.padding.left} y={activeSlide.padding.top}
            width={Math.max(0, activeSlide.width - activeSlide.padding.left - activeSlide.padding.right)}
            height={Math.max(0, activeSlide.height - activeSlide.padding.top - activeSlide.padding.bottom)}
            stroke="#3b82f6" strokeWidth={1} dash={[6, 4]}
          />
        )}
        {editor.fillMode && editor.fillPoints.length >= 2 && (
          <KLine points={editor.fillPoints} stroke={editor.fillColor} strokeWidth={2} dash={[6, 4]} />
        )}
        {editor.fillMode && editor.fillPoints.map((_, i) => {
          if (i % 2 !== 0) return null;
          return (
            <Rect key={i} x={editor.fillPoints[i] - 3} y={editor.fillPoints[i + 1] - 3}
              width={6} height={6} fill="#6366f1" cornerRadius={3} />
          );
        })}
        {editor.rubberBand && (() => {
          const b = editor.rubberBand!;
          const x = Math.min(b.x1, b.x2);
          const y = Math.min(b.y1, b.y2);
          const w = Math.abs(b.x2 - b.x1);
          const h = Math.abs(b.y2 - b.y1);
          if (w < 2 && h < 2) return null;
          return (
            <Rect x={x} y={y} width={w} height={h}
              fill="rgba(99,102,241,0.12)" stroke="#6366f1" strokeWidth={1.5} dash={[6, 4]} />
          );
        })()}
      </Layer>

      {/* Слой 2: fills */}
      <Layer ref={fillsLayerRef}>
        {fillElements.map((el) => {
          const strategy = getStrategy('fill');
          if (!strategy) return null;
          const View = strategy.KonvaView;
          return (
            <View
              key={el.id}
              el={el}
              handlers={handlers[el.id]}
              elements={activeSlide.elements}
              editorCtx={editorCtx}
            />
          );
        })}
      </Layer>

      {/* Слой 3: коннекторы */}
      <Layer>
        {connectorElements.map((el) => {
          const strategy = getStrategy('connector');
          if (!strategy) return null;
          const View = strategy.KonvaView;
          return (
            <View
              key={el.id}
              el={el}
              handlers={handlers[el.id]}
              elements={activeSlide.elements}
              editorCtx={editorCtx}
            />
          );
        })}
      </Layer>

      {/* Слой 4: элементы */}
      <Layer ref={editor.layerRef as any}>
        {regularElements.map((el) => {
          const strategy = getStrategy(el.type);
          if (!strategy) {
            console.warn('[EditorStage] no strategy for', el.type);
            return null;
          }
          const View = strategy.KonvaView;
          return (
            <View
              key={el.id}
              el={el}
              handlers={handlers[el.id]}
              elements={activeSlide.elements}
              editorCtx={editorCtx}
              isEditing={editing?.id === el.id}
            />
          );
        })}

        {editor.guides.v.map((x, i) => (
          <Rect key={`gv-${i}`} x={x} y={0} width={1} height={activeSlide.height}
            fill="#ef4444" opacity={0.7} listening={false} />
        ))}
        {editor.guides.h.map((y, i) => (
          <Rect key={`gh-${i}`} x={0} y={y} width={activeSlide.width} height={1}
            fill="#ef4444" opacity={0.7} listening={false} />
        ))}

        <Transformer
          ref={editor.trRef as any}
          rotateEnabled keepRatio={false}
          borderStroke="#f59e0b" anchorStroke="#f59e0b" anchorFill="#fbbf24"
          anchorSize={10} anchorCornerRadius={2}
          rotationSnaps={[0, 15, 30, 45, 60, 75, 90, 105, 120, 135, 150, 165, 180, 195, 210, 225, 240, 255, 270, 285, 300, 315, 330, 345]}
          rotationSnapTolerance={6}
          boundBoxFunc={(o, n) => (n.width < 20 || n.height < 20 ? o : n)}
        />
      </Layer>

      {/* Слой 5: anchor'ы, превью */}
      <Layer>
        {!editor.connectorDraft && hoveredElement && !selectedIds.includes(hoveredElement.id) && (
          <AnchorOverlay element={hoveredElement} zoom={zoom} onStartDraft={handleStartDraft} />
        )}

        {draftPreview && (
          <KLine points={draftPreview} stroke="#6366f1" strokeWidth={2 / zoom}
            dash={[8 / zoom, 4 / zoom]} lineCap="round" listening={false} />
        )}

        {draftTargetElement && (
          <Rect
            x={draftTargetElement.x} y={draftTargetElement.y}
            width={draftTargetElement.width} height={draftTargetElement.height}
            stroke="#10b981" strokeWidth={2 / zoom} dash={[6 / zoom, 4 / zoom]}
            listening={false}
          />
        )}

        {ghostRect && (
          <Rect
            x={ghostRect.x} y={ghostRect.y}
            width={ghostRect.width} height={ghostRect.height}
            fill="rgba(238,242,255,0.55)" stroke="#6366f1"
            strokeWidth={2 / zoom} dash={[8 / zoom, 4 / zoom]}
            cornerRadius={8 / zoom} listening={false}
          />
        )}
      </Layer>
    </Stage>
  );
};

/* ---------- Кастомный compare — только поля, влияющие на рендер ---------- */
const compareEditor = (prev: EditorApi, next: EditorApi): boolean => {
  return (
    prev.activeSlide === next.activeSlide &&
    prev.zoom === next.zoom &&
    prev.selectedIds === next.selectedIds &&
    prev.editing === next.editing &&
    prev.hoveredId === next.hoveredId &&
    prev.connectorDraft === next.connectorDraft &&
    prev.guides === next.guides &&
    prev.rubberBand === next.rubberBand &&
    prev.fillMode === next.fillMode &&
    prev.fillPoints === next.fillPoints &&
    prev.fillColor === next.fillColor &&
    prev.showGrid === next.showGrid &&
    prev.showMargins === next.showMargins &&
    prev.isDragging === next.isDragging
  );
};

export const EditorStage = React.memo(EditorStageInner, (prev, next) =>
  compareEditor(prev.editor, next.editor) && prev.wrapRef === next.wrapRef,
);

/* ---------- Внутренние ---------- */

const BgImage: React.FC<{ src: string; w: number; h: number }> = ({ src, w, h }) => {
  const [img, setImg] = React.useState<HTMLImageElement | null>(null);
  React.useEffect(() => {
    const i = new window.Image();
    i.src = src;
    i.onload = () => setImg(i);
  }, [src]);
  if (!img) return null;
  return <KImage x={0} y={0} width={w} height={h} image={img} listening={false} />;
};

const GridLayer: React.FC<{ w: number; h: number }> = React.memo(({ w, h }) => (
  <Shape
    listening={false}
    sceneFunc={(ctx, shape) => {
      const c = (ctx as any)._context as CanvasRenderingContext2D;
      c.beginPath();
      for (let x = 0; x <= w; x += GRID_SIZE) { c.moveTo(x, 0); c.lineTo(x, h); }
      for (let y = 0; y <= h; y += GRID_SIZE) { c.moveTo(0, y); c.lineTo(w, y); }
      c.strokeStyle = '#eef2f7';
      c.lineWidth = 1;
      c.stroke();
      ctx.strokeShape(shape);
    }}
  />
));
GridLayer.displayName = 'GridLayer';