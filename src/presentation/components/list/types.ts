import type { ReactNode } from 'react';

export interface ListItemAdapter<T> {
  getId(item: T): string;
  getLabel(item: T): string;
  getSearchText?(item: T): string;
  getMeta?(item: T): ReactNode;
  getBadge?(item: T): ReactNode;
}

export interface BulkAction<T> {
  readonly key: string;
  readonly label: string;
  readonly icon?: string;
  readonly variant?: 'default' | 'danger';
  readonly disabled?: boolean;
  readonly confirm?:
    | string
    | { readonly title: string; readonly description?: string };
  readonly onRun: (
    selectedIds: readonly string[],
    selectedItems: readonly T[],
  ) => Promise<void> | void;
}

export interface ListRenderContext {
  readonly isActive: boolean;
  readonly isSelected: boolean;
}

export type ListItemRenderer<T> = (item: T, ctx: ListRenderContext) => ReactNode;