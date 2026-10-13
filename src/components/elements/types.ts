export interface CommonProps {
  onSelect: (e?: any) => void;
  onDragStart?: (e: any) => void;
  onDragMove?: (e: any) => void;
  onDragEnd?: (e: any) => void;
  onContextMenu?: (e: any) => void;
  isSelected?: boolean;
}