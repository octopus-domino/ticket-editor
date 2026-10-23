/* presentation/hooks/index.ts
   Публичный API хуков. Компоненты — в presentation/components. */

export * from './canvas';

export { useAutoFitZoom } from './useAutoFitZoom';
export { useAutoSave, loadAutoSave, clearAutoSave } from './useAutoSave';
export { useEditorShortcuts } from './useEditorShortcuts';
export { useFillRasterizer } from './useFillRasterizer';
export { useSelectedElement } from './useSelectedElement';
export { useStampFillMode } from './useStampFillMode';

export { useClipboardActions } from './editor/useClipboardActions';
export { useEditingCommit } from './editor/useEditingCommit';
export { useStampCommit } from './editor/useStampCommit';
export { useDiagramCommit } from './editor/useDiagramCommit';
export { useStyleClipboard } from './editor/useStyleClipboard';