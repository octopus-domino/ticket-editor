import { useState, useRef, useCallback } from 'react';
import type { CanvasElement, LineElement } from '../types';
import { useSlides } from './useSlides';
import { useSelection } from './useSelection';
import { useHistory } from './useHistory';
import { useDataModel } from './useDataModel';
import { useInlineEditor } from './useInlineEditor';
import { useKeyboardShortcuts } from './useKeyboardShortcuts';
import { useGroupDrag } from './useGroupDrag';
import { useRubberBand } from './useRubberBand';
import { useFillMode } from './useFillMode';
import { useFileIO } from './useFileIO';
import { computeSnap } from '../services/snap';
import { uid } from '../lib/uid';
import Konva from 'konva';

export function useEditor() {
  const wrapRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<Konva.Stage>(null);
  const trRef = useRef<Konva.Transformer>(null);
  const layerRef = useRef<Konva.Layer>(null);

  const slidesApi = useSlides();
  const selection = useSelection(slidesApi.activeSlide);
  const history = useHistory();
  const dataApi = useDataModel(slidesApi.slides, slidesApi.setSlides);

  const [zoom, setZoom] = useState(0.6);
  const [showGrid, setShowGrid] = useState(true);
  const [showMargins, setShowMargins] = useState(true);
  const [guides, setGuides] = useState<{ v: number[]; h: number[] }>({ v: [], h: [] });
  const [copiedStyle, setCopiedStyle] = useState<Partial<CanvasElement> | null>(null);
  const [clipboard, setClipboard] = useState<CanvasElement[]>([]);
  const [floatingPos, setFloatingPos] = useState<{ x: number; y: number } | null>(null);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; elementId: string | null } | null>(null);

  const inlineEditor = useInlineEditor({
    wrapRef: wrapRef as any,
    stageRef: stageRef as any,
    zoom,
    activeSlide: slidesApi.activeSlide,
    updateElement: slidesApi.updateElement,
  });

  const handleSnap = useCallback((e: any, el: CanvasElement) => {
    const node = e.target;
    const snapped = computeSnap(el, node.x(), node.y(), slidesApi.activeSlide, showGrid);
    node.x(snapped.x);
    node.y(snapped.y);
    setGuides({ v: snapped.v, h: snapped.h });
  }, [slidesApi.activeSlide, showGrid]);

  const groupDrag = useGroupDrag({
    activeSlide: slidesApi.activeSlide,
    selectedIds: selection.selectedIds,
    setSelectedIds: selection.setSelectedIds,
    setSlides: slidesApi.setSlides,
    activeId: slidesApi.activeId,
    handleSnap,
    setFloatingPos,
  });

  const pointerPos = useCallback(() => {
    const stage = stageRef.current;
    if (!stage) return { x: 0, y: 0 };
    const p = stage.getPointerPosition();
    if (!p) return { x: 0, y: 0 };
    return { x: p.x / zoom, y: p.y / zoom };
  }, [zoom]);

  const rubberBand = useRubberBand({
    stageRef: stageRef as any,
    zoom,
    activeSlide: slidesApi.activeSlide,
    setSelectedIds: selection.setSelectedIds,
  });

  const fillModeApi = useFillMode({
    activeSlide: slidesApi.activeSlide,
    updateElement: slidesApi.updateElement,
    addElement: slidesApi.addElement,
    pointerPos,
    onElementSelected: (id) => selection.select(id),
  });

  /* ================= Операции ================= */

  const removeSelected = useCallback(() => {
    if (!selection.selectedIds.length) return;
    const newSlides = slidesApi.slides.map((s) =>
      s.id !== slidesApi.activeId
        ? s
        : { ...s, elements: s.elements.filter((e) => !selection.selectedIds.includes(e.id)) },
    );
    slidesApi.setSlides(newSlides);
    history.push(newSlides, slidesApi.activeId);
    selection.clear();
    setFloatingPos(null);
  }, [selection, slidesApi, history]);

  const updateWithHistory = useCallback((id: string, patch: Partial<CanvasElement>) => {
    const newSlides = slidesApi.slides.map((s) =>
      s.id !== slidesApi.activeId
        ? s
        : { ...s, elements: s.elements.map((el) => (el.id === id ? ({ ...el, ...patch } as CanvasElement) : el)) },
    );
    slidesApi.setSlides(newSlides);
    history.push(newSlides, slidesApi.activeId);
  }, [slidesApi, history]);

  const addElementWithHistory = useCallback((el: CanvasElement) => {
    const newSlides = slidesApi.slides.map((s) =>
      s.id !== slidesApi.activeId ? s : { ...s, elements: [...s.elements, el] },
    );
    slidesApi.setSlides(newSlides);
    selection.setSelectedIds([el.id]);
    history.push(newSlides, slidesApi.activeId);
  }, [slidesApi, selection, history]);

  const undo = useCallback(() => {
    const prev = history.undo();
    if (!prev) return;
    slidesApi.setSlides(prev.slides);
    slidesApi.setActiveId(prev.activeId);
    selection.clear();
    setGuides({ v: [], h: [] });
  }, [history, slidesApi, selection]);

  const redo = useCallback(() => {
    const next = history.redo();
    if (!next) return;
    slidesApi.setSlides(next.slides);
    slidesApi.setActiveId(next.activeId);
    selection.clear();
    setGuides({ v: [], h: [] });
  }, [history, slidesApi, selection]);

  /* ================= Clipboard ================= */

  const copy = useCallback(() => {
    const els = slidesApi.activeSlide.elements.filter((el) =>
      selection.selectedIds.includes(el.id),
    );
    if (els.length) setClipboard(JSON.parse(JSON.stringify(els)));
  }, [slidesApi.activeSlide, selection.selectedIds]);

  const cut = useCallback(() => {
    const els = slidesApi.activeSlide.elements.filter((el) =>
      selection.selectedIds.includes(el.id),
    );
    if (els.length) {
      setClipboard(JSON.parse(JSON.stringify(els)));
      removeSelected();
    }
  }, [slidesApi.activeSlide, selection.selectedIds, removeSelected]);

  const paste = useCallback(() => {
    if (!clipboard.length) return;
    const pasted = clipboard.map((el) => ({
      ...JSON.parse(JSON.stringify(el)),
      id: uid(),
      x: el.x + 20,
      y: el.y + 20,
    }));
    const newSlides = slidesApi.slides.map((s) =>
      s.id !== slidesApi.activeId ? s : { ...s, elements: [...s.elements, ...pasted] },
    );
    slidesApi.setSlides(newSlides);
    selection.setSelectedIds(pasted.map((el) => el.id));
    history.push(newSlides, slidesApi.activeId);
  }, [clipboard, slidesApi, selection, history]);

  const duplicate = useCallback(() => {
    const els = slidesApi.activeSlide.elements.filter((el) =>
      selection.selectedIds.includes(el.id),
    );
    if (!els.length) return;
    const pasted = els.map((el) => ({
      ...JSON.parse(JSON.stringify(el)),
      id: uid(),
      x: el.x + 20,
      y: el.y + 20,
    }));
    const newSlides = slidesApi.slides.map((s) =>
      s.id !== slidesApi.activeId ? s : { ...s, elements: [...s.elements, ...pasted] },
    );
    slidesApi.setSlides(newSlides);
    selection.setSelectedIds(pasted.map((el) => el.id));
    history.push(newSlides, slidesApi.activeId);
  }, [slidesApi, selection, history]);

  /* ================= Горячие клавиши ================= */

  useKeyboardShortcuts({
    onUndo: undo,
    onRedo: redo,
    onCopy: copy,
    onPaste: paste,
    onDuplicate: duplicate,
    onDelete: removeSelected,
    onEscape: () => {
      if (fillModeApi.points.length) fillModeApi.cancel();
    },
    onEnter: () => {
      if (fillModeApi.fillMode && fillModeApi.points.length >= 6) fillModeApi.closePolygon();
    },
    disabled: !!inlineEditor.editing,
  });

  /* ================= Line anchors ================= */

  const appendAnchor = useCallback((el: LineElement) => {
    const pts = el.points && el.points.length >= 4 ? el.points : [0, el.height / 2, el.width, el.height / 2];
    const lastX = pts[pts.length - 2];
    const lastY = pts[pts.length - 1];
    const prevX = pts[pts.length - 4];
    const prevY = pts[pts.length - 3];
    const dx = lastX - prevX;
    const dy = lastY - prevY;
    updateWithHistory(el.id, { points: [...pts, lastX + dx, lastY + dy] });
  }, [updateWithHistory]);

  const removeLastAnchor = useCallback((el: LineElement) => {
    const pts = el.points && el.points.length >= 4 ? el.points : [];
    if (pts.length <= 4) return;
    updateWithHistory(el.id, { points: pts.slice(0, pts.length - 2) });
  }, [updateWithHistory]);

  /* ================= Прочее ================= */

  const moveLayer = useCallback((dir: 1 | -1) => {
    if (!selection.selectedId) return;
    slidesApi.moveLayer(selection.selectedId, dir);
  }, [selection.selectedId, slidesApi]);

  const updateSelected = useCallback((patch: Partial<CanvasElement>) => {
    if (!selection.selectedId) return;
    updateWithHistory(selection.selectedId, patch);
  }, [selection.selectedId, updateWithHistory]);

  const copyStyle = useCallback(() => {
    const el = selection.selected;
    if (!el) return;
    const { id, x, y, rotation, type, ...style } = el as any;
    setCopiedStyle(style);
  }, [selection.selected]);

  const applyStyle = useCallback(() => {
    if (!selection.selectedId || !copiedStyle) return;
    updateWithHistory(selection.selectedId, copiedStyle);
    setCopiedStyle(null);
  }, [selection.selectedId, copiedStyle, updateWithHistory]);

  /* ================= File IO ================= */

  const fileIO = useFileIO({
    slides: slidesApi.slides,
    setSlides: slidesApi.setSlides,
    activeId: slidesApi.activeId,
    setActiveId: slidesApi.setActiveId,
    activeSlide: slidesApi.activeSlide,
    data: dataApi.data,
    setData: dataApi.setData,
    addElementWithHistory,
    onImported: () => {
      selection.clear();
      setGuides({ v: [], h: [] });
      setContextMenu(null);
      setFloatingPos(null);
      inlineEditor.setEditing(null);
      inlineEditor.setShowToolbar(false);
    },
  });

  return {
    // refs
    wrapRef, stageRef, trRef, layerRef,

    // slides
    slides: slidesApi.slides,
    activeSlide: slidesApi.activeSlide,
    activeId: slidesApi.activeId,
    setActiveId: slidesApi.setActiveId,
    setSlides: slidesApi.setSlides,
    customSize: slidesApi.customSize,
    changeCustomSize: slidesApi.changeCustomSize,
    changeFormat: slidesApi.changeFormat,
    changeOrientation: slidesApi.changeOrientation,
    updateSlide: slidesApi.updateSlide,
    addSlide: slidesApi.addSlide,
    removeSlide: slidesApi.removeSlide,

    // selection
    selectedIds: selection.selectedIds,
    selectedId: selection.selectedId,
    selected: selection.selected,
    select: selection.select,
    clearSelection: selection.clear,
    selectMany: selection.selectMany,
    isSelected: selection.isSelected,
    setSelectedIds: selection.setSelectedIds,

    // history
    undo, redo,
    canUndo: history.canUndo,
    canRedo: history.canRedo,

    // data
    data: dataApi.data,
    setData: dataApi.setData,

    // inline editor
    editing: inlineEditor.editing,
    setEditing: inlineEditor.setEditing,
    showTextToolbar: inlineEditor.showToolbar,
    setShowTextToolbar: inlineEditor.setShowToolbar,
    openEditor: inlineEditor.open,
    openCellEditor: inlineEditor.openCell,
    commitEdit: inlineEditor.commit,
    onToolbarChange: inlineEditor.onToolbarChange,

    // overlays
    contextMenu, setContextMenu,
    floatingPos, setFloatingPos,
    copiedStyle, setCopiedStyle,

    // view
    zoom, setZoom,
    showGrid, setShowGrid,
    showMargins, setShowMargins,
    guides, setGuides,

    // operations
    updateWithHistory,
    addElementWithHistory,
    removeSelected,
    moveLayer,
    updateSelected,
    handleSnap,
    handleElDragStart: groupDrag.onDragStart,
    handleElDragMove: groupDrag.onDragMove,
    handleElDragEnd: (el: CanvasElement, e: any) => {
      groupDrag.onDragEnd(el, e);
      setGuides({ v: [], h: [] });
    },

    // clipboard
    copy, cut, paste, duplicate,
    copyStyle, applyStyle,

    // line anchors
    appendAnchor,
    removeLastAnchor,

    // file IO
    exportJson: fileIO.exportJson,
    importJson: fileIO.importJson,
    exportSvg: fileIO.exportSvg,
    addImage: fileIO.addImage,
    setBackgroundImage: fileIO.setBackgroundImage,
    removeBackgroundImage: fileIO.removeBackgroundImage,

    // rubber band
    rubberBand: rubberBand.band,
    rubberBandStart: rubberBand.start,
    rubberBandMove: rubberBand.move,
    rubberBandEnd: rubberBand.end,

    // fill mode
    fillMode: fillModeApi.fillMode,
    setFillMode: fillModeApi.setFillMode,
    fillColor: fillModeApi.fillColor,
    setFillColor: fillModeApi.setFillColor,
    fillPoints: fillModeApi.points,
    handleFillClick: fillModeApi.handleClick,
    closePolygon: fillModeApi.closePolygon,
  };
}

export type EditorApi = ReturnType<typeof useEditor>;