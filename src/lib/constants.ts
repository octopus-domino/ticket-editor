import type { Padding } from '@/shared/types';

export const DEFAULT_PADDING: Padding = { top: 20, right: 20, bottom: 20, left: 20 };

/**
 * Текст-подсказка для пустого текстового элемента.
 * Показывается серым курсивом на канвасе, но не мешает печати —
 * при двойном клике поле открывается пустым.
 */
export const TEXT_PLACEHOLDER = 'Введите текст';