/**
 * Application constants - centralized configuration
 */

// ============================================
// Format Constants
// ============================================

export interface FormatConfig {
  readonly label: string;
  readonly portrait: { readonly w: number; readonly h: number };
}

export const FORMATS: Readonly<Record<string, FormatConfig>> = {
  a4: { label: 'A4 (210×297 мм)', portrait: { w: 794, h: 1123 } },
  a5: { label: 'A5 (148×210 мм)', portrait: { w: 559, h: 794 } },
  a6: { label: 'A6 (105×148 мм)', portrait: { w: 397, h: 559 } },
  letter: { label: 'Letter (216×279 мм)', portrait: { w: 816, h: 1056 } },
  ticket: { label: 'Билет (200×80 мм)', portrait: { w: 302, h: 756 } },
  card: { label: 'Визитка (90×50 мм)', portrait: { w: 189, h: 340 } },
  custom: { label: 'Свой размер', portrait: { w: 794, h: 1123 } },
};

// ============================================
// Canvas Constants
// ============================================

export const GRID_SIZE = 10;
export const SNAP_THRESHOLD = 5;
export const DEFAULT_PADDING = { top: 20, right: 20, bottom: 20, left: 20 };
export const TEXT_PLACEHOLDER = 'Введите текст';
export const PORTRAIT_VISUAL_FACTOR = 1.65;

// ============================================
// Zoom Constants
// ============================================

export const MIN_ZOOM = 0.2;
export const MAX_ZOOM = 2.0;
export const ZOOM_STEP = 0.05;

// ============================================
// History Constants
// ============================================

export const MAX_HISTORY = 100;
export const MERGE_THRESHOLD_MS = 600;

// ============================================
// Transformer Constants
// ============================================

export const TRANSFORMER_MIN_SIZE = 20;
export const TRANSFORMER_ROTATION_SNAP = 15;
export const TRANSFORMER_ROTATION_TOLERANCE = 6;
export const TRANSFORMER_BORDER_COLOR = '#f59e0b';
export const TRANSFORMER_ANCHOR_COLOR = '#f59e0b';
export const TRANSFORMER_ANCHOR_FILL = '#fbbf24';
export const TRANSFORMER_ANCHOR_SIZE = 10;

// ============================================
// Element Constraints
// ============================================

export const CONSTRAINTS = {
  text: { minWidth: 20, minHeight: 20 },
  shape: { minWidth: 10, minHeight: 10 },
  table: { minWidth: 100, minHeight: 60 },
  footer: { minWidth: 20, minHeight: 20 },
  stamp: { minWidth: 40, minHeight: 40 },
  image: { minWidth: 20, minHeight: 20 },
  line: { minPoints: 2 },
  fill: { minPoints: 3 },
} as const;

// ============================================
// Colors
// ============================================

export const COLORS = {
  grid: '#eef2f7',
  margin: '#3b82f6',
  selection: '#6366f1',
  guide: '#ef4444',
  anchor: '#fbbf24',
  anchorStroke: '#f59e0b',
  placeholder: '#9ca3af',
} as const;

// ============================================
// Auto-save
// ============================================

export const AUTO_SAVE_KEY = 'ticket-editor:autosave';
export const AUTO_SAVE_INTERVAL_MS = 30000;
export const AUTO_SAVE_MAX_AGE_MS = 24 * 60 * 60 * 1000; // 24 hours
