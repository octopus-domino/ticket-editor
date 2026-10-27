import React, { createContext, useContext } from 'react';
import type { CanvasElement, StampShapeItem, StampTextItem, StampImageItem } from '../../types';

export interface EditingState {
  id: string;
  field: any;
  kind: any;
  zone?: any;
  tableRow?: number;
  tableCol?: number;
  value: string;
  html?: string;
  x: number;
  y: number;
  width: number;
  height: number;
  fontSize: number;
  fontFamily: string;
  fontStyle: string;
  textDecoration: string;
  align: any;
  fill: string;
  lineHeight?: number;
  verticalAlign?: 'top' | 'middle' | 'bottom';
  padding?: { top: number; right: number; bottom: number; left: number };
  clickX?: number;
  clickY?: number;
}

export interface ContextMenuState {
  x: number;
  y: number;
  elementId: string | null;
}

export interface ModalsApi {
  /* ---------- Inline-редактор ---------- */
  editing: EditingState | null;
  setEditing: (e: EditingState | null) => void;
  showTextToolbar: boolean;
  setShowTextToolbar: (v: boolean) => void;
  openEditor: (el: CanvasElement, field: any, clickPos?: { x: number; y: number }) => void;
  openCellEditor: (el: CanvasElement, r: number, c: number) => void;
  commitEdit: () => void;
  onToolbarChange: (patch: any) => void;

  /* ---------- Плавающие панели ---------- */
  floatingPos: { x: number; y: number } | null;
  setFloatingPos: (p: { x: number; y: number } | null) => void;
  contextMenu: ContextMenuState | null;
  setContextMenu: (m: ContextMenuState | null) => void;

  /* ---------- Модалка штампа ---------- */
  stampEditorTarget: string | null;
  openStampEditor: (id: string) => void;
  closeStampEditor: () => void;
  saveStampEditor: (data: {
    name: string;
    width: number;
    height: number;
    shapes: StampShapeItem[];
    texts: StampTextItem[];
    images: StampImageItem[];
  }) => void;

  /* ---------- Модалка диаграммы ---------- */
  diagramEditorTarget: string | null;
  openDiagramEditor: (id: string) => void;
  closeDiagramEditor: () => void;
  saveDiagramEditor: (svg: string, xml: string) => void;
}

const Ctx = createContext<ModalsApi | null>(null);

export const ModalsProvider = Ctx.Provider;

export function useModalsContext(): ModalsApi {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('[editor] useModalsContext outside provider');
  return ctx;
}