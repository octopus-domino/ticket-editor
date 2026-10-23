/* ============================================================
   lib/stamps/types.ts

   Общие типы штампов. Вынесено из library.ts, чтобы убрать
   циклы: library.ts импортирует данные из bankingStamps.ts,
   а bankingStamps.ts импортирует StampTemplate из ./types.
   ============================================================ */

import type {
  StampShapeItem,
  StampTextItem,
  StampImageItem,
} from '@/shared/types';

export interface StampTemplate {
  id: string;
  name: string;
  description?: string;
  icon?: string;
  width: number;
  height: number;
  shapes: StampShapeItem[];
  texts: StampTextItem[];
  images?: StampImageItem[];
  custom?: boolean;
  /** Помечаем штампы из банковской библиотеки для группировки/подсветки. */
  banking?: boolean;
}