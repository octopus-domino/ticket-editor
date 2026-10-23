/* ============================================================
   lib/stamps/library.ts

   Реестр штампов: builtin + banking + service + special + custom.
   Определение StampTemplate — в ./types (разрыв цикла).
   ============================================================ */

import type { StampShapeItem, StampTextItem } from '@/shared/types';
import { uid } from '../uid';
import { BANKING_STAMPS } from './bankingStamps';
import { BANKING_STAMPS_FILLED } from './bankingStampsFilled';
import { SERVICE_STAMPS } from './serviceStamps';
import { SPECIAL_STAMPS } from './specialStamps';
import { BANKING_STAMPS_WITH_IMAGES } from './bankingStampsWithImages';
import type { StampTemplate } from './types';

export type { StampTemplate } from './types';

const STORAGE_KEY = 'stamp_library_v1';

const shape = (o: Partial<StampShapeItem> & { kind: StampShapeItem['kind'] }): StampShapeItem => ({
  id: uid(),
  x: 0, y: 0, width: 100, height: 100,
  cornerRadius: 0,
  stroke: '#1a1a1a', strokeWidth: 1, dash: 'solid',
  ...o,
});

const text = (o: Partial<StampTextItem> & { text: string; mode: 'straight' | 'arc' }): StampTextItem => ({
  id: uid(),
  x: 0, y: 0, width: 200, align: 'center',
  arcCx: 100, arcCy: 100, arcRadius: 60,
  arcStartDeg: -150, arcEndDeg: -30, arcFlip: false,
  fontSize: 14, fontFamily: 'Arial', fontStyle: 'normal',
  textDecoration: '', fill: '#1a1a1a',
  ...o,
});

/* ============================================================
   Универсальные штампы
   ============================================================ */

export const BUILTIN_STAMPS: StampTemplate[] = [
  {
    id: 'theatre-classic',
    name: 'Печать',
    description: 'Круглая печать с двумя обводками',
    icon: '📜',
    width: 200,
    height: 200,
    shapes: [
      shape({ kind: 'ellipse', x: 4, y: 4, width: 192, height: 192, strokeWidth: 2 }),
      shape({ kind: 'ellipse', x: 24, y: 24, width: 152, height: 152, strokeWidth: 1 }),
    ],
    texts: [
      text({
        text: 'НАЗВАНИЕ', mode: 'arc',
        arcCx: 100, arcCy: 100, arcRadius: 68, arcStartDeg: -150, arcEndDeg: -30,
        fontSize: 14, fontStyle: 'bold',
      }),
      text({
        text: 'ГОРОД · 2026', mode: 'arc',
        arcCx: 100, arcCy: 100, arcRadius: 68, arcStartDeg: 150, arcEndDeg: 30, arcFlip: true,
        fontSize: 11,
      }),
      text({
        text: '2026', mode: 'straight', x: 40, y: 88, width: 120,
        fontSize: 22, fontStyle: 'bold',
      }),
    ],
  },
  {
    id: 'rect-rounded',
    name: 'Прямоугольная',
    description: 'Печать с закруглением и подписями',
    icon: '▭',
    width: 260,
    height: 120,
    shapes: [
      shape({ kind: 'rect', x: 4, y: 4, width: 252, height: 112, cornerRadius: 12, strokeWidth: 2 }),
      shape({ kind: 'rect', x: 14, y: 14, width: 232, height: 92, cornerRadius: 8, strokeWidth: 1 }),
    ],
    texts: [
      text({ text: 'ООО «КОМПАНИЯ»', mode: 'straight', x: 20, y: 28, width: 220, fontSize: 16, fontStyle: 'bold' }),
      text({ text: 'ГОРОД КАЗАНЬ', mode: 'straight', x: 20, y: 54, width: 220, fontSize: 11 }),
      text({ text: 'ИНН 7700000000', mode: 'straight', x: 20, y: 74, width: 220, fontSize: 10 }),
    ],
  },
  {
    id: 'school',
    name: 'Школа',
    description: 'Круглая печать школы',
    icon: '🏫',
    width: 200,
    height: 200,
    shapes: [
      shape({ kind: 'ellipse', x: 4, y: 4, width: 192, height: 192, stroke: '#1e40af', strokeWidth: 2 }),
      shape({ kind: 'ellipse', x: 24, y: 24, width: 152, height: 152, stroke: '#1e40af', strokeWidth: 1 }),
    ],
    texts: [
      text({
        text: 'МУНИЦИПАЛЬНОЕ БЮДЖЕТНОЕ ОБЩЕОБРАЗОВАТЕЛЬНОЕ УЧРЕЖДЕНИЕ', mode: 'arc',
        arcCx: 100, arcCy: 100, arcRadius: 68, arcStartDeg: -160, arcEndDeg: -20,
        fontSize: 9, fontStyle: 'bold', fill: '#1e40af',
      }),
      text({
        text: 'ШКОЛА № 1', mode: 'straight', x: 40, y: 88, width: 120,
        fontSize: 22, fontStyle: 'bold', fill: '#1e40af',
      }),
    ],
  },
];

/* ============================================================
   Пользовательские штампы
   ============================================================ */

export function loadCustomStamps(): StampTemplate[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr : [];
  } catch { return []; }
}

export function saveCustomStamps(stamps: StampTemplate[]): void {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(stamps)); } catch { /* ignore */ }
}

/* ------------------------------------------------------------
   Определение встроенности
   ------------------------------------------------------------ */

const BUILTIN_IDS = new Set<string>([
  ...BUILTIN_STAMPS.map((s) => s.id),
  ...BANKING_STAMPS.map((s) => s.id),
  ...BANKING_STAMPS_FILLED.map((s) => s.id),
  ...SERVICE_STAMPS.map((s) => s.id),
  ...SPECIAL_STAMPS.map((s) => s.id),
  ...BANKING_STAMPS_WITH_IMAGES.map((s) => s.id),
]);

export function isBuiltinStamp(id: string): boolean {
  return BUILTIN_IDS.has(id);
}

/* ------------------------------------------------------------
   Публичный доступ
   ------------------------------------------------------------ */

export function getAllStamps(): StampTemplate[] {
  const banking = BANKING_STAMPS.map((s) => ({ ...s, banking: true }));
  const bankingFilled = BANKING_STAMPS_FILLED.map((s) => ({ ...s, banking: true }));
  const services = SERVICE_STAMPS.map((s) => ({ ...s, banking: true }));
  const specials = SPECIAL_STAMPS.map((s) => ({ ...s, banking: true }));
  const withImages = BANKING_STAMPS_WITH_IMAGES.map((s) => ({ ...s, banking: true }));
  return [
    ...BUILTIN_STAMPS,
    ...banking,
    ...bankingFilled,
    ...services,
    ...specials,
    ...withImages,
    ...loadCustomStamps(),
  ];
}

export function addCustomStamp(t: StampTemplate): void {
  const list = loadCustomStamps();
  list.push({ ...t, custom: true, banking: false });
  saveCustomStamps(list);
}

export function removeCustomStamp(id: string): void {
  const list = loadCustomStamps().filter((s) => s.id !== id);
  saveCustomStamps(list);
}

export function updateCustomStamp(id: string, patch: Partial<StampTemplate>): void {
  const list = loadCustomStamps();
  const idx = list.findIndex((s) => s.id === id);
  if (idx < 0) return;
  list[idx] = { ...list[idx], ...patch };
  saveCustomStamps(list);
}

/* ------------------------------------------------------------
   Создание пользовательской копии из встроенного.
   ------------------------------------------------------------ */

export function forkStampAsCustom(source: StampTemplate): StampTemplate {
  const copy: StampTemplate = {
    ...JSON.parse(JSON.stringify(source)),
    id: `custom-${Date.now()}`,
    name: `${source.name} (моя)`,
    custom: true,
    banking: false,
  };
  copy.shapes = copy.shapes.map((s) => ({ ...s, id: uid() }));
  copy.texts = copy.texts.map((t) => ({ ...t, id: uid() }));
  copy.images = (copy.images || []).map((im) => ({ ...im, id: uid() }));
  return copy;
}