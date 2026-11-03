import React, { forwardRef } from 'react';
import type { ListItemAdapter, ListItemRenderer } from './types';

export interface ListRowProps<T> {
  readonly item: T;
  readonly adapter: ListItemAdapter<T>;
  readonly isActive: boolean;
  readonly isSelected: boolean;
  readonly onToggle: () => void;
  readonly onClick?: () => void;
  readonly renderItem?: ListItemRenderer<T>;
  readonly onKeyDown?: (e: React.KeyboardEvent<HTMLDivElement>) => void;
  readonly tabIndex?: number;
}

function ListRowInner<T>(
  {
    item,
    adapter,
    isActive,
    isSelected,
    onToggle,
    onClick,
    renderItem,
    onKeyDown,
    tabIndex = 0,
  }: ListRowProps<T>,
  ref: React.ForwardedRef<HTMLDivElement>,
): React.ReactElement {
  const handleRowClick = (e: React.MouseEvent): void => {
    if ((e.target as HTMLElement).closest('input[type="checkbox"]')) return;
    onClick?.();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>): void => {
    if (e.key === ' ') {
      e.preventDefault();
      onToggle();
      return;
    }
    if (e.key === 'Enter' && onClick) {
      e.preventDefault();
      onClick();
      return;
    }
    onKeyDown?.(e);
  };

  const className = [
    'ssl-row',
    isActive ? 'ssl-row-active' : '',
    isSelected ? 'ssl-row-selected' : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div
      ref={ref}
      className={className}
      onClick={handleRowClick}
      onKeyDown={handleKeyDown}
      role={onClick ? 'button' : undefined}
      aria-selected={isSelected}
      tabIndex={tabIndex}
      data-row="true"
    >
      <input
        type="checkbox"
        className="ssl-item-checkbox"
        checked={isSelected}
        onChange={onToggle}
        onClick={(e) => e.stopPropagation()}
        aria-label={isSelected ? 'Снять выбор' : 'Выбрать'}
        tabIndex={-1}
      />

      {renderItem ? (
        renderItem(item, { isActive, isSelected })
      ) : (
        <DefaultRowContent item={item} adapter={adapter} isActive={isActive} />
      )}
    </div>
  );
}

function DefaultRowContent<T>({
  item,
  adapter,
  isActive,
}: {
  item: T;
  adapter: ListItemAdapter<T>;
  isActive: boolean;
}): React.ReactElement {
  const badge = adapter.getBadge?.(item);
  const meta = adapter.getMeta?.(item);
  return (
    <>
      {badge && <span className="ssl-row-badge">{badge}</span>}
      <span
        className="ssl-row-label"
        style={{ fontWeight: isActive ? 600 : 400 }}
      >
        {adapter.getLabel(item)}
      </span>
      {meta && <span className="ssl-row-meta">{meta}</span>}
    </>
  );
}

export const ListRow = forwardRef(ListRowInner) as <T>(
  props: ListRowProps<T> & { ref?: React.Ref<HTMLDivElement> },
) => React.ReactElement;