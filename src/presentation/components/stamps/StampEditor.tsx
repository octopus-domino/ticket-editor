/* ============================================================
   stamps/StampEditor.tsx
   F-STMP-E-01..26, REG-B1, REG-B4, F-LN-09.
   ============================================================ */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type Konva from 'konva';
import type {
  StampShapeItem, StampTextItem, StampImageItem,
} from '@/shared/types';
import { StampHead } from './panels/StampHead';
import { StampToolbar } from './panels/StampToolbar';
import { StampInlineTextEditor } from './panels/StampInlineTextEditor';
import { StampCanvas } from './StampCanvas';
import { StampLayersPanel } from './StampLayersPanel';
import { ShapePropsPanel } from './ShapePropsPanel';
import { TextPropsPanel } from './TextPropsPanel';
import { StampImagePropsPanel } from './StampImagePropsPanel';
import { LineContextMenu, type LineContextMenuState } from './LineContextMenu';

import { useStampHistory } from '../../hooks/stamps/useStampHistory';
import { useStampUndoRedo } from '../../hooks/stamps/useStampUndoRedo';
import { useStampZoomPan } from '../../hooks/stamps/useStampZoomPan';
import { useStampShortcuts } from '../../hooks/stamps/useStampShortcuts';
import { useStampCanvasWrap } from '../../hooks/stamps/useStampCanvasWrap';
import { useStampImageCache } from '../../hooks/stamps/useStampImageCache';
import { useStampTextEditor } from '../../hooks/stamps/useStampTextEditor';
import { useStampDragHandlers } from '../../hooks/stamps/useStampDragHandlers';
import { useStampTextUpdate } from '../../hooks/stamps/useStampTextUpdate';
import { useStampTransform } from '../../hooks/stamps/useStampTransform';
import { useStampLayerActions } from '../../hooks/stamps/useStampLayerActions';
import { useStampToolbarActions } from '../../hooks/stamps/useStampToolbarActions';
import { useStampCRUD } from '../../hooks/stamps/useStampCRUD';
import { useStampImageUpload } from '../../hooks/stamps/useStampImageUpload';
import { useStampImageReplace } from '../../hooks/stamps/useStampImageReplace';
import { useStampFillMode } from '../../hooks/stamps/useStampFillMode';
import type { PlacementMode } from '@/lib/stamps/geometry';
import { autoKey } from '@/lib/stamps/history/autoKey';
import { parsePoints, serializePoints } from '@/lib/polyline';

type SelectionType = 'shape' | 'text' | 'image' | null;

interface Props {
  initialWidth: number;
  initialHeight: number;
  initialShapes: StampShapeItem[];
  initialTexts: StampTextItem[];
  initialImages?: StampImageItem[];
  initialName?: string;
  onSave: (data: {
    name: string;
    width: number;
    height: number;
    shapes: StampShapeItem[];
    texts: StampTextItem[];
    images: StampImageItem[];
  }) => void;
  onCancel: () => void;
}

export const StampEditor: React.FC<Props> = ({
  initialWidth, initialHeight, initialShapes, initialTexts, initialImages,
  initialName, onSave, onCancel,
}) => {
  const [name, setName] = useState(initialName || 'Новый штамп');
  const [width, setWidth] = useState(initialWidth);
  const [height, setHeight] = useState(initialHeight);
  const [placementMode, setPlacementMode] = useState<PlacementMode>('inside');
  const [showGrid, setShowGrid] = useState(true);
  const [snap, setSnap] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedType, setSelectedType] = useState<SelectionType>(null);
  const [lineContextMenu, setLineContextMenu] = useState<LineContextMenuState | null>(null);

  const select = useCallback((id: string | null, type: SelectionType) => {
    setSelectedId(id);
    setSelectedType(type);
    setLineContextMenu(null);
  }, []);
  const clearSelection = useCallback(() => {
    setSelectedId(null);
    setSelectedType(null);
    setLineContextMenu(null);
  }, []);

  const stageWrapRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<Konva.Stage>(null);
  const trRef = useRef<Konva.Transformer>(null);
  const layerRef = useRef<Konva.Layer>(null);

  const history = useStampHistory({
    shapes: initialShapes,
    texts: initialTexts,
    images: initialImages || [],
  });
  const { shapes, texts, images } = history.state;

  const zp = useStampZoomPan(stageRef);
  const wrapSize = useStampCanvasWrap(stageWrapRef as React.RefObject<HTMLElement>);

  useEffect(() => {
    zp.zoomFit(wrapSize.w, wrapSize.h, width, height);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [width, height, wrapSize.w, wrapSize.h]);

  const imageCache = useStampImageCache(images);

  const commit = useCallback(
    (
      s: StampShapeItem[],
      t: StampTextItem[],
      i: StampImageItem[],
      mergeKey?: string,
    ) => history.push({ shapes: s, texts: t, images: i }, mergeKey),
    [history],
  );

  const updateShape = useCallback(
    (id: string, patch: Partial<StampShapeItem>) => {
      const key = autoKey(id, patch);
      commit(
        shapes.map((s) => (s.id === id ? { ...s, ...patch } : s)),
        texts,
        images,
        key,
      );
    },
    [shapes, texts, images, commit],
  );

  const updateImage = useCallback(
    (id: string, patch: Partial<StampImageItem>) => {
      const key = autoKey(id, patch);
      commit(
        shapes,
        texts,
        images.map((im) => (im.id === id ? { ...im, ...patch } : im)),
        key,
      );
    },
    [shapes, texts, images, commit],
  );

  const updateText = useStampTextUpdate({ shapes, texts, images, commit });

  const textEditor = useStampTextEditor({
    shapes, texts, images, commit, replace: history.replace,
  });
  const drag = useStampDragHandlers({
    shapes, width, height, snapEnabled: snap,
    updateShape, updateText, updateImage,
  });
  const handleTransform = useStampTransform({
    shapes, images, selectedType, updateShape, updateImage,
  });
  const layerActions = useStampLayerActions({
    shapes, texts, images, selectedId, commit, clearSelection,
  });
  const toolbar = useStampToolbarActions({
    shapes, texts, images, width, height, placementMode,
    selectedId, selectedType, commit, select,
  });
  const crud = useStampCRUD({
    shapes, texts, images, selectedId, selectedType, commit, select, clearSelection,
  });
  const uploadImage = useStampImageUpload({
    shapes, texts, images, width, height, commit, select,
  });
  const replaceImage = useStampImageReplace({
    updateImage, stampW: width, stampH: height,
  });
  const fill = useStampFillMode({
    shapes, texts, images, width, height, commit, select,
  });

  const withFillOff = useCallback(
    <A extends unknown[]>(fn: (...args: A) => void) =>
      (...args: A) => {
        fill.setFillMode(false);
        fn(...args);
      },
    [fill],
  );

  const addShape = useMemo(() => withFillOff(toolbar.addShape), [toolbar.addShape, withFillOff]);
  const addStraightText = useMemo(() => withFillOff(toolbar.addStraightText), [toolbar.addStraightText, withFillOff]);
  const addArcText = useMemo(() => withFillOff(toolbar.addArcText), [toolbar.addArcText, withFillOff]);
  const addImage = useMemo(() => withFillOff(uploadImage), [uploadImage, withFillOff]);

  const { undo: handleUndo, redo: handleRedo } = useStampUndoRedo({
    history, clearSelection,
  });

  useStampShortcuts({
    editingTextId: textEditor.editingTextId,
    selectedId,
    onCloseTextEditor: textEditor.closeTextEditor,
    onClearSelection: clearSelection,
    onDelete: crud.deleteSelected,
    onDuplicate: crud.duplicateSelected,
    onUndo: handleUndo,
    onRedo: handleRedo,
    onCloseEditor: onCancel,
  });

  useEffect(() => {
    const tr = trRef.current;
    const layer = layerRef.current;
    if (!tr || !layer) return;
    const isFill =
      selectedType === 'shape' &&
      shapes.find((s) => s.id === selectedId)?.kind === 'fill';
    if (!selectedId || isFill || (selectedType !== 'shape' && selectedType !== 'image')) {
      tr.nodes([]);
      layer.batchDraw();
      return;
    }
    const node = layer.findOne('#' + selectedId);
    if (node) tr.nodes([node]);
    else tr.nodes([]);
    layer.batchDraw();
  }, [selectedId, selectedType, shapes, texts, images]);

  /* ---------- F-LN-09: контекстное меню для точки линии ---------- */

  const handlePointContextMenu = useCallback(
    (shapeId: string, pointIndex: number, clientX: number, clientY: number) => {
      setLineContextMenu({ shapeId, pointIndex, clientX, clientY });
    },
    [],
  );

  const closeLineContextMenu = useCallback(() => setLineContextMenu(null), []);

  const handleRemoveLinePoint = useCallback(() => {
    if (!lineContextMenu) return;
    const shape = shapes.find((s) => s.id === lineContextMenu.shapeId);
    if (!shape || shape.kind !== 'line') return;
    const pts = parsePoints(shape.points);
    if (pts.length <= 2) return;
    const next = pts.slice();
    next.splice(lineContextMenu.pointIndex, 1);
    updateShape(shape.id, { points: serializePoints(next) });
    setLineContextMenu(null);
  }, [lineContextMenu, shapes, updateShape]);

  const handleAddLinePoint = useCallback(() => {
    if (!lineContextMenu) return;
    const shape = shapes.find((s) => s.id === lineContextMenu.shapeId);
    if (!shape || shape.kind !== 'line') return;
    const pts = parsePoints(shape.points);
    if (pts.length === 0) {
      setLineContextMenu(null);
      return;
    }
    const last = pts[pts.length - 1];
    const prev = pts.length > 1 ? pts[pts.length - 2] : last;
    const next = [...pts, {
      x: last.x + (last.x - prev.x),
      y: last.y + (last.y - prev.y),
    }];
    updateShape(shape.id, { points: serializePoints(next) });
    setLineContextMenu(null);
  }, [lineContextMenu, shapes, updateShape]);

  const selectedShape = selectedType === 'shape'
    ? shapes.find((s) => s.id === selectedId) || null
    : null;
  const selectedText = selectedType === 'text'
    ? texts.find((t) => t.id === selectedId) || null
    : null;
  const selectedImage = selectedType === 'image'
    ? images.find((im) => im.id === selectedId) || null
    : null;
  const editingText = textEditor.editingTextId
    ? texts.find((t) => t.id === textEditor.editingTextId) || null
    : null;

  const handleSave = () =>
    onSave({ name, width, height, shapes, texts, images });

  return (
    <div className="stamp-editor-backdrop" onMouseDown={(e) => e.stopPropagation()}>
      <div className="stamp-editor-modal" onMouseDown={(e) => e.stopPropagation()}>
        <StampHead
          name={name} width={width} height={height}
          onChangeName={setName} onChangeWidth={setWidth} onChangeHeight={setHeight}
          onSave={handleSave} onCancel={onCancel}
        />
        <StampToolbar
          placementMode={placementMode}
          zoom={zp.zoom} minZoom={zp.MIN_ZOOM} maxZoom={zp.MAX_ZOOM}
          canUndo={history.canUndo} canRedo={history.canRedo}
          showGrid={showGrid} snap={snap}
          fillMode={fill.fillMode} fillColor={fill.fillColor}
          onChangePlacement={setPlacementMode}
          onAddShape={addShape}
          onAddStraightText={addStraightText}
          onAddArcText={addArcText}
          onAddImage={addImage}
          onToggleFillMode={() => fill.setFillMode((v) => !v)}
          onFillColorChange={fill.setFillColor}
          onUndo={handleUndo} onRedo={handleRedo}
          onZoomIn={zp.zoomIn} onZoomOut={zp.zoomOut}
          onZoomFit={() => zp.zoomFit(wrapSize.w, wrapSize.h, width, height)}
          onToggleGrid={setShowGrid} onToggleSnap={setSnap}
        />
        <div className="stamp-editor-body">
          <div className="stamp-editor-left">
            <StampLayersPanel
              shapes={shapes} texts={texts} images={images}
              selectedId={selectedId} selectedType={selectedType}
              onSelect={select}
              onToggleHidden={layerActions.toggleHidden}
              onToggleLocked={layerActions.toggleLocked}
              onDelete={layerActions.removeLayer}
              onReorder={layerActions.reorder}
            />
          </div>
          <StampCanvas
            wrapRef={stageWrapRef as React.RefObject<HTMLDivElement>}
            stageRef={stageRef}
            trRef={trRef}
            layerRef={layerRef}
            wrapSize={wrapSize}
            width={width} height={height}
            zoom={zp.zoom} pan={zp.pan}
            onWheel={zp.onWheel}
            onStageMouseDown={() => {
              if (textEditor.editingTextId) textEditor.closeTextEditor();
              clearSelection();
            }}
            showGrid={showGrid}
            shapes={shapes} texts={texts} images={images}
            imageCache={imageCache}
            selectedId={selectedId} selectedType={selectedType}
            selectedShape={selectedShape}
            snap={snap}
            fillMode={fill.fillMode}
            onFillClick={fill.handleCanvasClick}
            onSelect={(id, type) => select(id, type)}
            onShapeDragEnd={drag.handleShapeDragEnd}
            onTextDragEnd={drag.handleTextDragEnd}
            onImageDragEnd={drag.handleImageDragEnd}
            onTransformEnd={handleTransform}
            onOpenTextEditor={textEditor.openTextEditor}
            onUpdateText={(id, patch) => updateText(id, patch)}
            onPointsChange={(id, points) => updateShape(id, { points })}
            onPointContextMenu={handlePointContextMenu}
          >
            {editingText && (
              <StampInlineTextEditor
                text={editingText}
                zoom={zp.zoom}
                pan={zp.pan}
                onChange={textEditor.changeEditingText}
                onClose={textEditor.closeTextEditor}
              />
            )}
            <div className="stamp-editor-info">
              {width}×{height} · {Math.round(zp.zoom * 100)}% · Элементов:{' '}
              {shapes.length + texts.length + images.length}
            </div>
          </StampCanvas>
          <div className="stamp-editor-right">
            {selectedShape && (
              <ShapePropsPanel
                shape={selectedShape}
                allShapes={shapes}
                onChange={(p) => updateShape(selectedShape.id, p)}
              />
            )}
            {selectedText && (
              <TextPropsPanel
                text={selectedText}
                onChange={(p) => updateText(selectedText.id, p)}
              />
            )}
            {selectedImage && (
              <StampImagePropsPanel
                image={selectedImage}
                onChange={(p) => updateImage(selectedImage.id, p)}
                onReplace={() => replaceImage(selectedImage.id)}
              />
            )}
            {!selectedShape && !selectedText && !selectedImage && (
              <p className="stamp-editor-empty">
                <b>Выберите элемент</b>, чтобы редактировать.
                <br /><br />
                <b>Ctrl</b> при перемещении/масштабировании — свободно.
                <br />
                <b>Двойной клик по тексту</b> — редактирование.
              </p>
            )}
          </div>
        </div>
      </div>

      {lineContextMenu && (
        <LineContextMenu
          state={lineContextMenu}
          canRemove={(() => {
            const sh = shapes.find((s) => s.id === lineContextMenu.shapeId);
            if (!sh || sh.kind !== 'line') return false;
            return parsePoints(sh.points).length > 2;
          })()}
          onClose={closeLineContextMenu}
          onRemovePoint={handleRemoveLinePoint}
          onAddPoint={handleAddLinePoint}
        />
      )}
    </div>
  );
};