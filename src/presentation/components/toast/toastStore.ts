import { SimpleStore } from '@/shared/store/store';
import type { Toast } from './types';

export interface ToastState {
  readonly items: readonly Toast[];
}

export const toastStore = new SimpleStore<ToastState>({ items: [] });