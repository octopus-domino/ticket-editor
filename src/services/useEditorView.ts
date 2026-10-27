import { useState, useCallback } from 'react';
import type { CanvasElement } from '../types';

export interface FloatingPos {
  x: number;
  y: number;
}

export interface ContextMenuState {
  x: number;
  y: number;
  elementId: string | null;
}

export interface Guides {
  v: number[];
  h: number[];
}

/**
 * Всё UI-состояние редактора: zoom, сетка, направляющие, плавающие панели.
 * Не знает ни про слайды, ни про историю.
 */
export function useEditorView() {
  const [zoom, setZoom] = useState(0.6);
  const [showGrid, setShowGrid] = useState(true);
  const [showMargins, setShowMargins] = useState(true);
  const [guides, setGuides] = useState<Guides>({ v: [], h: [] });
  const [floatingPos, setFloatingPos] = useState<FloatingPos | null>(null);
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);
  const [copiedStyle, setCopiedStyle] = useState<Partial<CanvasElement> | null>(null);

  const clearGuides = useCallback(() => setGuides({ v: [], h: [] }), []);

  return {
    zoom, setZoom,
    showGrid, setShowGrid,
    showMargins, setShowMargins,
    guides, setGuides, clearGuides,
    floatingPos, setFloatingPos,
    contextMenu, setContextMenu,
    copiedStyle, setCopiedStyle,
  };
}

export type EditorViewApi = ReturnType<typeof useEditorView>;