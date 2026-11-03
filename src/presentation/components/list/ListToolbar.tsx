import React, { useEffect, useRef } from 'react';
import type { BulkAction } from './types';

interface HeaderCheckboxProps {
  readonly checked: boolean;
  readonly indeterminate: boolean;
  readonly onChange: () => void;
  readonly title: string;
}

const HeaderCheckbox: React.FC<HeaderCheckboxProps> = ({
  checked,
  indeterminate,
  onChange,
  title,
}) => {
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (ref.current) ref.current.indeterminate = indeterminate;
  }, [indeterminate]);
  return (
    <input
      ref={ref}
      type="checkbox"
      className="ssl-item-checkbox"
      checked={checked}
      onChange={onChange}
      title={title}
    />
  );
};

export interface ListToolbarProps<T> {
  readonly searchQuery: string;
  readonly onSearchChange: (v: string) => void;
  readonly searchPlaceholder: string;
  readonly searchRef?: React.RefObject<HTMLInputElement | null>;

  readonly visibleCount: number;
  readonly totalCount: number;
  readonly selectedCount: number;

  readonly allVisibleSelected: boolean;
  readonly someVisibleSelected: boolean;
  readonly onToggleAll: () => void;
  readonly onClearSelection: () => void;

  readonly bulkActions: readonly BulkAction<T>[];
  readonly onRunBulk: (action: BulkAction<T>) => void;
  readonly bulkBusy: boolean;
}

export function ListToolbar<T>({
  searchQuery,
  onSearchChange,
  searchPlaceholder,
  searchRef,
  visibleCount,
  totalCount,
  selectedCount,
  allVisibleSelected,
  someVisibleSelected,
  onToggleAll,
  onClearSelection,
  bulkActions,
  onRunBulk,
  bulkBusy,
}: ListToolbarProps<T>): React.ReactElement {
  const showFilteredHint =
    searchQuery.trim().length > 0 && visibleCount !== totalCount;

  return (
    <div className="ssl-toolbar">
      <div className="ssl-search-row">
        <label className="ssl-select-all">
          <HeaderCheckbox
            checked={allVisibleSelected}
            indeterminate={someVisibleSelected}
            onChange={onToggleAll}
            title={
              allVisibleSelected
                ? 'Снять выбор со всех'
                : 'Выбрать всех в списке'
            }
          />
          <span>
            {selectedCount > 0 ? `Выбрано: ${selectedCount}` : 'Выбрать все'}
          </span>
        </label>

        <div className="ssl-search">
          <span className="ssl-search-icon" aria-hidden>🔍</span>
          <input
            ref={searchRef}
            type="text"
            value={searchQuery}
            placeholder={searchPlaceholder}
            onChange={(e) => onSearchChange(e.target.value)}
            className="ssl-search-input"
            aria-label="Поиск по списку"
          />
          {searchQuery && (
            <button
              type="button"
              className="ssl-search-clear"
              onClick={() => onSearchChange('')}
              title="Очистить поиск"
              aria-label="Очистить поиск"
            >
              ×
            </button>
          )}
        </div>
      </div>

      {showFilteredHint && (
        <div className="ssl-hint">
          Показано {visibleCount} из {totalCount}
        </div>
      )}

      {selectedCount > 0 && bulkActions.length > 0 && (
        <div className="ssl-bulk-bar" role="toolbar" aria-label="Действия с выбранными">
          <span className="ssl-bulk-count">{selectedCount} выбрано</span>
          {bulkActions.map((action) => (
            <button
              key={action.key}
              type="button"
              className={`ssl-btn ${
                action.variant === 'danger' ? 'ssl-btn-danger' : 'ssl-btn-ghost'
              }`}
              disabled={bulkBusy || action.disabled}
              onClick={() => onRunBulk(action)}
              title={action.label}
            >
              {action.icon && <span className="ssl-btn-icon">{action.icon}</span>}
              {action.label}
            </button>
          ))}
          <button
            type="button"
            className="ssl-btn ssl-btn-ghost"
            onClick={onClearSelection}
            disabled={bulkBusy}
            title="Снять выделение (Esc)"
          >
            Снять
          </button>
        </div>
      )}
    </div>
  );
}