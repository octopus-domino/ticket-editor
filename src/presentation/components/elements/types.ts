import type Konva from 'konva';
import type { CanvasElement } from '@/shared/types';

export type ElementSelectEvent =
  | Konva.KonvaEventObject<MouseEvent>
  | Konva.KonvaEventObject<TouchEvent>
  | Konva.KonvaEventObject<PointerEvent>
  | Konva.KonvaEventObject<Event>;

export interface CommonProps<T extends CanvasElement = CanvasElement> {
  onSelect: (e?: ElementSelectEvent) => void;
  onUpdate: (patch: Partial<T>, newElement?: CanvasElement) => void;
  onDragStart?: (e: Konva.KonvaEventObject<DragEvent>) => void;
  onDragMove?: (e: Konva.KonvaEventObject<DragEvent>) => void;
  onDragEnd?: (e: Konva.KonvaEventObject<DragEvent>) => void;
  onContextMenu?: (e: Konva.KonvaEventObject<PointerEvent>) => void;
  isSelected?: boolean;
  isEditing?: boolean;
  onDblClick?: (e?: ElementSelectEvent) => void;
  onCellDblClick?: (row: number, col: number) => void;
  /** Имя символа, если элемент — его инстанс */
  symbolName?: string | null; 
}