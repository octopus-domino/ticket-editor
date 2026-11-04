import { t as __tr } from '@/shared/i18n';
import React, { useCallback, useMemo, useRef, useState } from 'react';
import { ConfirmDialog } from '@/presentation/components/dialog';
import { toast } from '@/presentation/components/toast';
import type { BulkAction, ListItemAdapter, ListItemRenderer } from './types';
import { useListSelection } from './useListSelection';
import { useListSearch } from './useListSearch';
import { ListToolbar } from './ListToolbar';
import { ListRow } from './ListRow';
import './search-select-list.css';

export interface SearchSelectListProps<T> {
  readonly items: readonly T[];
  readonly adapter: ListItemAdapter<T>;

  readonly selectedIds: ReadonlySet<string>;
  readonly onSelectionChange: (next: Set<string>) => void;

  readonly activeId?: string | null;
  readonly onItemClick?: (item: T) => void;

  /**
   * When true, clicking any row toggles selection (Gmail-style).
   * Ignored if `onItemClick` is provided AND `rowClickTogglesSelection` is false.
   */
  readonly rowClickTogglesSelection?: boolean;

  readonly bulkActions?: readonly BulkAction<T>[];

  readonly searchPlaceholder?: string;
  readonly emptyText?: React.ReactNode;
  readonly loading?: boolean;

  readonly renderItem?: ListItemRenderer<T>;
  readonly className?: string;

  /**
   * Constrains the list height. Use when the parent is NOT a flex column
   * (e.g. an `overflow-y: auto` sidebar). When omitted, the list uses
   * `flex: 1; min-height: 0` — sized by the parent flex context.
   */
  readonly maxHeight?: number | string;

  /**
   * Minimum list height in px — prevents "narrow strip" look when there
   * are only 1–2 items. Defaults to 120 when `maxHeight` is set, 0 otherwise.
   */
  readonly minHeight?: number;
}

interface PendingConfirm<T> {
  readonly action: BulkAction<T>;
  readonly resolve: (ok: boolean) => void;
}

export function SearchSelectList<T>(props: SearchSelectListProps<T>): React.ReactElement {
  const {
    items,
    adapter,
    selectedIds,
    onSelectionChange,
    activeId,
    onItemClick,
    rowClickTogglesSelection = false,
    bulkActions = [],
    searchPlaceholder = __tr("Поиск…"),
    emptyText = __tr("Ничего не найдено"),
    loading = false,
    renderItem,
    className,
    maxHeight,
    minHeight,
  } = props;

  const [searchQuery, setSearchQuery] = useState('');
  const [bulkBusy, setBulkBusy] = useState(false);
  const [confirm, setConfirm] = useState<PendingConfirm<T> | null>(null);

  const searchRef = useRef<HTMLInputElement>(null);
  const rowRefs = useRef<Array<HTMLDivElement | null>>([]);

  const filtered = useListSearch(items, adapter, searchQuery);
  const visibleIds = useMemo(
    () => filtered.map((item) => adapter.getId(item)),
    [filtered, adapter],
  );

  const selection = useListSelection(items, adapter, selectedIds, onSelectionChange);

  const allVisibleSelected = selection.areAllSelected(visibleIds);
  const someVisibleSelected = selection.arePartiallySelected(visibleIds);

  const askConfirm = useCallback(
    (action: BulkAction<T>): Promise<boolean> =>
      new Promise((resolve) => setConfirm({ action, resolve })),
    [],
  );

  const runAction = useCallback(
    async (action: BulkAction<T>) => {
      if (selection.count === 0 || bulkBusy) return;
      if (action.confirm) {
        const ok = await askConfirm(action);
        if (!ok) return;
      }
      setBulkBusy(true);
      try {
        await action.onRun(Array.from(selectedIds), selection.selectedItems);
      } catch (e) {
        toast.error(__tr("Не удалось выполнить «{0}»", action.label), (e as Error).message);
      } finally {
        setBulkBusy(false);
      }
    },
    [selection.count, selection.selectedItems, selectedIds, bulkBusy, askConfirm],
  );

  const onRootKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      const target = e.target as HTMLElement;
      const inField = !!target.closest('input, textarea, select');

      if (e.key === '/' && !inField) {
        e.preventDefault();
        searchRef.current?.focus();
        return;
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'a' && !inField) {
        e.preventDefault();
        selection.toggleAll(visibleIds);
        return;
      }
      if (e.key === 'Escape') {
        if (selection.count > 0) {
          e.preventDefault();
          selection.clear();
        } else if (searchQuery.length > 0) {
          e.preventDefault();
          setSearchQuery('');
        }
        return;
      }
      if ((e.key === 'ArrowDown' || e.key === 'ArrowUp') && !inField && visibleIds.length > 0) {
        const idx = rowRefs.current.findIndex((el) => el === document.activeElement);
        let next: number;
        if (idx === -1) next = e.key === 'ArrowDown' ? 0 : visibleIds.length - 1;
        else if (e.key === 'ArrowDown') next = Math.min(idx + 1, visibleIds.length - 1);
        else next = Math.max(idx - 1, 0);
        e.preventDefault();
        rowRefs.current[next]?.focus();
      }
    },
    [visibleIds, selection, searchQuery],
  );

  const handleConfirmOk = useCallback(() => {
    const c = confirm;
    setConfirm(null);
    c?.resolve(true);
  }, [confirm]);

  const handleConfirmCancel = useCallback(() => {
    const c = confirm;
    setConfirm(null);
    c?.resolve(false);
  }, [confirm]);

  const rowClick =
    rowClickTogglesSelection || onItemClick
      ? (item: T): void => {
          if (rowClickTogglesSelection) selection.toggle(adapter.getId(item));
          else onItemClick?.(item);
        }
      : undefined;

  const rootClass = ['ssl-root', className].filter(Boolean).join(' ');
  const confirmation =
    confirm &&
    (typeof confirm.action.confirm === 'function'
      ? confirm.action.confirm(Array.from(selectedIds))
      : confirm.action.confirm);
  const rootStyle: React.CSSProperties =
    maxHeight !== undefined
      ? {
          flex: 'none',
          maxHeight: typeof maxHeight === 'number' ? `${maxHeight}px` : maxHeight,
        }
      : {};

  const listStyle: React.CSSProperties =
    maxHeight !== undefined
      ? {
          minHeight: minHeight ?? 120,
          // important: prevent collapse when parent is not flex
          flex: '1 1 auto',
        }
      : minHeight !== undefined
        ? { minHeight }
        : {};

  return (
    <div className={rootClass} style={rootStyle} onKeyDown={onRootKeyDown}>
      <ListToolbar
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        searchPlaceholder={searchPlaceholder}
        searchRef={searchRef}
        visibleCount={filtered.length}
        totalCount={items.length}
        selectedCount={selection.count}
        allVisibleSelected={allVisibleSelected}
        someVisibleSelected={someVisibleSelected}
        onToggleAll={() => selection.toggleAll(visibleIds)}
        onClearSelection={selection.clear}
        bulkActions={bulkActions}
        onRunBulk={(a) => void runAction(a)}
        bulkBusy={bulkBusy}
      />

      <div className="ssl-list" role="listbox" aria-multiselectable="true" style={listStyle}>
        {loading && <div className="ssl-empty">{__tr("Загрузка…")}</div>}

        {!loading && filtered.length === 0 && <div className="ssl-empty">{emptyText}</div>}

        {!loading &&
          filtered.map((item, i) => {
            const id = adapter.getId(item);
            return (
              <ListRow
                key={id}
                ref={(el) => {
                  rowRefs.current[i] = el;
                }}
                item={item}
                adapter={adapter}
                isActive={activeId === id}
                isSelected={selection.isSelected(id)}
                onToggle={() => selection.toggle(id)}
                onClick={rowClick ? () => rowClick(item) : undefined}
                renderItem={renderItem}
              />
            );
          })}
      </div>

      <ConfirmDialog
        isOpen={confirm !== null}
        title={typeof confirmation === 'string' ? confirmation : (confirmation?.title ?? '')}
        description={
          confirmation && typeof confirmation === 'object' ? confirmation.description : undefined
        }
        variant={confirm?.action.variant === 'danger' ? 'danger' : 'default'}
        confirmLabel={confirm?.action.label}
        onConfirm={handleConfirmOk}
        onCancel={handleConfirmCancel}
      />
    </div>
  );
}
