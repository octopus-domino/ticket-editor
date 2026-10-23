import type React from 'react';
import type Konva from 'konva';
import type { CanvasElement } from '@/shared/types';
import type { ElementSelectEvent } from './types';

export interface CommonHandlers<T extends CanvasElement = CanvasElement> {
  onSelect: (e?: ElementSelectEvent) => void;
  onUpdate: (patch: Partial<T>, newElement?: CanvasElement) => void;
  onDragStart: (e: Konva.KonvaEventObject<DragEvent>) => void;
  onDragMove: (e: Konva.KonvaEventObject<DragEvent>) => void;
  onDragEnd: (e: Konva.KonvaEventObject<DragEvent>) => void;
  onContextMenu: (e: Konva.KonvaEventObject<PointerEvent>) => void;
  isSelected: boolean;
  onDblClick?: (e?: ElementSelectEvent) => void;
}

export interface ElementStrategy<T extends CanvasElement = CanvasElement> {
  type: T['type'];
  KonvaView: React.ComponentType<{
    el: T;
    elements?: CanvasElement[];
    isSelected?: boolean;
    isEditing?: boolean;
    onSelect: (e?: ElementSelectEvent) => void;
    onUpdate: (patch: Partial<T>, newElement?: CanvasElement) => void;
    onDragStart: (e: Konva.KonvaEventObject<DragEvent>) => void;
    onDragMove: (e: Konva.KonvaEventObject<DragEvent>) => void;
    onDragEnd: (e: Konva.KonvaEventObject<DragEvent>) => void;
    onContextMenu: (e: Konva.KonvaEventObject<PointerEvent>) => void;
    onDblClick?: (e?: ElementSelectEvent) => void;
    onCellDblClick?: (row: number, col: number) => void;
    symbolName?: string | null; // <--- ДОБАВЛЕНО
  }>;
  PropertiesPanel?: React.ComponentType<{
    el: T;
    update: (p: Partial<T>) => void;
  }>;
  toSvg: (el: T, ctx?: { allElements: CanvasElement[] }) => string;
}

const registry = new Map<string, ElementStrategy>();

export function registerElement<T extends CanvasElement>(strategy: ElementStrategy<T>): void {
  registry.set(strategy.type, strategy as unknown as ElementStrategy);
}

export function getElementStrategy(type: string): ElementStrategy | null {
  return registry.get(type) ?? null;
}