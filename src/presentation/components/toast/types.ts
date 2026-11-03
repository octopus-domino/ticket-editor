export type ToastVariant = 'info' | 'success' | 'warn' | 'error';

export interface Toast {
  readonly id: string;
  readonly variant: ToastVariant;
  readonly title: string;
  readonly description?: string;
  readonly durationMs?: number;
}