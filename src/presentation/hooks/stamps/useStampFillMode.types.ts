import type {
  StampShapeItem,
  StampTextItem,
  StampImageItem,
} from '@/shared/types';

export interface UseStampFillModeArgs {
  shapes: StampShapeItem[];
  texts: StampTextItem[];
  images: StampImageItem[];
  width: number;
  height: number;
  commit: (s: StampShapeItem[], t: StampTextItem[], i: StampImageItem[]) => void;
  select: (id: string | null, type: 'shape' | 'text' | 'image') => void;
}

export interface UseStampFillModeReturn {
  fillMode: boolean;
  setFillMode: (v: boolean) => void;
  fillColor: string;
  setFillColor: (v: string) => void;
  handleCanvasClick: (px: number, py: number) => void;
}