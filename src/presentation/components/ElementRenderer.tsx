import React from 'react';
import type Konva from 'konva';
import type { CanvasElement, SymbolDef } from '@/shared/types';
import { getElementStrategy } from './elements/registry';
import type { ElementSelectEvent } from './elements/types';
import { useGraphicsStore } from '../providers/EditorProvider';
import { useStore } from '@/shared/store/store';

export interface ElementRendererProps {
  element: CanvasElement;
  elements?: CanvasElement[];
  isSelected: boolean;
  isEditing?: boolean;
  onSelect: (e?: ElementSelectEvent) => void;
  onUpdate: (patch: Partial<CanvasElement>, newElement?: CanvasElement) => void;
  onDblClick?: (e?: ElementSelectEvent) => void;
  onContextMenu?: (e: Konva.KonvaEventObject<PointerEvent>) => void;
  onDragStart?: (e: Konva.KonvaEventObject<DragEvent>) => void;
  onDragMove?: (e: Konva.KonvaEventObject<DragEvent>) => void;
  onDragEnd?: (e: Konva.KonvaEventObject<DragEvent>) => void;
  onCellDblClick?: (r: number, c: number) => void;
}

const NOOP = (): void => {};

const ElementRendererInner: React.FC<ElementRendererProps> = ({
  element, elements, isSelected, isEditing,
  onSelect, onUpdate, onDblClick, onContextMenu,
  onDragStart, onDragMove, onDragEnd, onCellDblClick,
}) => {
  const graphicsStore = useGraphicsStore();
  const symbolId = element.symbolId ?? null;

  const symbol: SymbolDef | null = useStore(
    graphicsStore,
    React.useCallback(
      (s) => {
        if (!symbolId) return null;
        return s.symbols.find(sym => sym.id === symbolId) ?? null;
      },
      [symbolId],
    ),
  );

  const effectiveElement: CanvasElement = React.useMemo(() => {
    if (!symbol) return element;
    return {
      ...symbol.prototype,
      id: element.id,
      x: element.x,
      y: element.y,
      rotation: element.rotation,
      width: element.width,
      height: element.height,
      symbolId: element.symbolId,
    } as CanvasElement;
  }, [element, symbol]);

  const strategy = getElementStrategy(effectiveElement.type);
  if (!strategy) return null;

  const View = strategy.KonvaView;

  return (
    <View
      el={effectiveElement as never}
      elements={elements ?? []}
      isSelected={isSelected}
      isEditing={!!isEditing}
      onSelect={onSelect}
      onUpdate={onUpdate as never}
      onDblClick={onDblClick ?? NOOP}
      onContextMenu={onContextMenu ?? NOOP}
      onDragStart={onDragStart ?? NOOP}
      onDragMove={onDragMove ?? NOOP}
      onDragEnd={onDragEnd ?? NOOP}
      onCellDblClick={onCellDblClick}
      symbolName={symbol?.name}
    />
  );
};

export const ElementRenderer = React.memo(ElementRendererInner, (prev, next) => {
  if (prev.element !== next.element) return false;
  if (prev.isSelected !== next.isSelected) return false;
  if (prev.isEditing !== next.isEditing) return false;
  if (next.element.type === 'connector' && prev.elements !== next.elements) return false;
  return true;
});