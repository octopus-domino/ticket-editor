import { SimpleStore } from '@/shared/store/store';
import type { CanvasElement, TextAlign, TextVerticalAlign, Padding } from '@/shared/types';

export type EditingKind = 'text' | 'shape' | 'footer' | 'stamp' | 'table' | 'placeholder';

export type EditingField = 'text' | 'footerText' | 'shapeText' | 'tableCell' | 'topText' | 'centerText' | 'bottomText';

export interface EditingState {
  id: string; field: EditingField; kind: EditingKind; zone?: 'top' | 'center' | 'bottom';
  tableRow?: number; tableCol?: number; value: string; html?: string;
  x: number; y: number; width: number; height: number;
  fontSize: number; fontFamily: string; fontStyle: string; textDecoration: string;
  fill: string; align: TextAlign; verticalAlign: TextVerticalAlign; lineHeight: number;
  padding: Padding; background: string; isRich: boolean;
}

export interface ContextMenuState { x: number; y: number; elementId: string | null; }

export type EditorMode = 'print' | 'schema';

export interface ModalsState {
  editing: EditingState | null;
  floatingPos: { x: number; y: number } | null;
  contextMenu: ContextMenuState | null;
  stampEditorTarget: string | null;
  diagramEditorTarget: string | null;
  fillMode: boolean;
  fillColor: string;
  fillPoints: number[];
  showGrid: boolean;
  showMargins: boolean;
  clipboardJson: string | null;
  clipSource: string | null;
  editorMode: EditorMode;
}

const INITIAL: ModalsState = {
  editing: null,
  floatingPos: null,
  contextMenu: null,
  stampEditorTarget: null,
  diagramEditorTarget: null,
  fillMode: false,
  fillColor: '#fbbf24',
  fillPoints: [],
  showGrid: true,
  showMargins: true,
  clipboardJson: null,
  clipSource: null,
  editorMode: 'print',
};

export class ModalsStore extends SimpleStore<ModalsState> {
  private clipboard: CanvasElement[] = [];
  private styleClipboard: Partial<CanvasElement> | null = null;

  constructor() { super(INITIAL); }

  openEditor(state: EditingState) {
    this.setState((prev) => ({ ...prev, editing: state, floatingPos: null, contextMenu: null }));
  }
  setEditing(state: EditingState | null) { this.setState((prev) => ({ ...prev, editing: state })); }
  closeEditor() { this.setState((prev) => ({ ...prev, editing: null })); }
  setFloatingPos(p: { x: number; y: number } | null) { this.setState((prev) => ({ ...prev, floatingPos: p })); }
  setContextMenu(m: ContextMenuState | null) { this.setState((prev) => ({ ...prev, contextMenu: m })); }
  
  openStampEditor(id: string) {
    this.setState((prev) => ({ ...prev, stampEditorTarget: id, floatingPos: null, contextMenu: null, editing: null }));
  }
  closeStampEditor() { this.setState((prev) => ({ ...prev, stampEditorTarget: null })); }

  openDiagramEditor(id: string) {
    this.setState((prev) => ({ ...prev, diagramEditorTarget: id, floatingPos: null, contextMenu: null, editing: null }));
  }
  closeDiagramEditor() { this.setState((prev) => ({ ...prev, diagramEditorTarget: null })); }

  setFillMode(v: boolean) { this.setState((prev) => ({ ...prev, fillMode: v, fillPoints: v ? prev.fillPoints : [] })); }
  setFillColor(c: string) { this.setState((prev) => ({ ...prev, fillColor: c })); }
  setFillPoints(pts: number[]) { this.setState((prev) => ({ ...prev, fillPoints: pts })); }
  setShowGrid(v: boolean) { this.setState((prev) => ({ ...prev, showGrid: v })); }
  setShowMargins(v: boolean) { this.setState((prev) => ({ ...prev, showMargins: v })); }

  setEditorMode(mode: EditorMode) { this.setState((prev) => ({ ...prev, editorMode: mode })); }

  copy(elements: CanvasElement[]) { this.clipboard = elements.map((el) => JSON.parse(JSON.stringify(el)) as CanvasElement); }
  getClipboard(): CanvasElement[] { return this.clipboard; }

  copyStyle(element: CanvasElement) {
    const { id: _id, x: _x, y: _y, rotation: _r, type: _t, ...rest } = element as Partial<CanvasElement> & { id?: string; x?: number; y?: number; rotation?: number; type?: string; };
    this.styleClipboard = rest as Partial<CanvasElement>;
  }
  getStyleClipboard(): Partial<CanvasElement> | null { return this.styleClipboard; }
  clearStyle() { this.styleClipboard = null; }

  setClipboardJson(json: string | null) { this.setState((prev) => ({ ...prev, clipboardJson: json })); }
  getClipboardJson(): string | null { return this.getState().clipboardJson; }
  setClipSource(id: string | null) { this.setState((prev) => ({ ...prev, clipSource: id })); }
  getClipSource(): string | null { return this.getState().clipSource; }
}