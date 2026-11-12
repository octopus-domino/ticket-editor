import { t } from '@/shared/i18n';
import { useId, useRef, useState } from 'react';
import {
  proposalItemError,
  proposalMoney,
  proposalTotal,
  type ProposalItem,
} from '../domain/proposal';
import { JourneyButton } from './JourneyButton';

const PAGE_SIZE = 10;
export function ProposalLineList({
  items,
  onChange,
  currency = 'RUB',
}: {
  items: ProposalItem[];
  onChange: (items: ProposalItem[]) => void;
  currency?: string;
}) {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const [invalidOnly, setInvalidOnly] = useState(false);
  const prefix = useId();
  const list = useRef<HTMLDivElement>(null);
  const rows = items.map((item, index) => ({ item, index, error: proposalItemError(item) }));
  const query = search.trim().toLocaleLowerCase();
  const filtered = rows.filter(
    (row) =>
      (!invalidOnly || row.error) &&
      (!query ||
        (/^#?\d+$/.test(query)
          ? row.index + 1 === Number(query.replace('#', ''))
          : row.item.name.toLocaleLowerCase().includes(query))),
  );
  const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const current = Math.min(page, pages - 1);
  const visible = filtered.slice(current * PAGE_SIZE, (current + 1) * PAGE_SIZE);
  function changePage(next: number) {
    setPage(next);
    if (list.current) list.current.scrollTop = 0;
  }
  function update(index: number, patch: Partial<ProposalItem>) {
    onChange(items.map((item, i) => (i === index ? { ...item, ...patch } : item)));
  }
  return (
    <section className="proposal-lines-editor" aria-label={t('Список позиций')}>
      <div className="proposal-lines-toolbar">
        <div>
          <strong>
            {t('Позиций:')} {items.length}
          </strong>
          <small>{t('До 200 товаров и услуг')}</small>
        </div>
        <JourneyButton
          disabled={items.length >= 200}
          onClick={() => {
            onChange([...items, { name: '', quantity: '1', price: '0' }]);
            setSearch('');
            setInvalidOnly(false);
            changePage(Math.floor(items.length / PAGE_SIZE));
            requestAnimationFrame(() =>
              window.document.getElementById(`${prefix}-${items.length}`)?.focus(),
            );
          }}
        >
          {t('＋ Добавить позицию')}
        </JourneyButton>
      </div>
      {!!items.length && (
        <>
          <div className="proposal-lines-search">
            <label>
              {t('Найти позицию')}
              <input
                type="search"
                placeholder={t('Название или номер')}
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  changePage(0);
                }}
              />
            </label>
            <label className="proposal-filter">
              <input
                type="checkbox"
                checked={invalidOnly}
                onChange={(e) => {
                  setInvalidOnly(e.target.checked);
                  changePage(0);
                }}
              />
              {t('Требуют проверки (')}
              {rows.filter((row) => row.error).length})
            </label>
          </div>
          <div className="proposal-lines-scroll" ref={list}>
            {visible.map(({ item, index, error }) => {
              let sum = '—';
              try {
                sum = proposalMoney(proposalTotal([item]), currency);
              } catch {
                /* Draft row. */
              }
              return (
                <div className="proposal-line" key={index}>
                  <div className="proposal-line-heading">
                    <span>№ {index + 1}</span>
                    <JourneyButton
                      variant="danger"
                      aria-label={t('Удалить позицию {0}', index + 1)}
                      onClick={() => onChange(items.filter((_, i) => i !== index))}
                    >
                      {t('Удалить')}
                    </JourneyButton>
                  </div>
                  <label className="proposal-line-name">
                    {t('Наименование')}
                    <input
                      id={`${prefix}-${index}`}
                      required
                      maxLength={200}
                      value={item.name}
                      onChange={(e) => update(index, { name: e.target.value })}
                    />
                  </label>
                  <label>
                    {t('Количество')}
                    <input
                      required
                      inputMode="decimal"
                      value={item.quantity}
                      onChange={(e) => update(index, { quantity: e.target.value })}
                    />
                  </label>
                  <label>
                    {t('Цена за единицу')}
                    <input
                      required
                      inputMode="decimal"
                      value={item.price}
                      onChange={(e) => update(index, { price: e.target.value })}
                    />
                  </label>
                  <div className="proposal-line-sum">
                    <span>{t('Сумма')}</span>
                    <strong>{sum}</strong>
                  </div>
                  {error && <small className="proposal-line-error">{error}</small>}
                </div>
              );
            })}
            {!visible.length && (
              <p className="proposal-empty">{t('Ничего не найдено. Измените поиск или фильтр.')}</p>
            )}
          </div>
          <nav className="proposal-pagination" aria-label={t('Страницы позиций')}>
            <JourneyButton disabled={current === 0} onClick={() => changePage(current - 1)}>
              {t('← Назад')}
            </JourneyButton>
            <label>
              {t('Страница')}
              <select value={current} onChange={(e) => changePage(Number(e.target.value))}>
                {Array.from({ length: pages }, (_, i) => (
                  <option value={i} key={i}>
                    {i + 1} {t('из')} {pages}
                  </option>
                ))}
              </select>
            </label>
            <JourneyButton disabled={current >= pages - 1} onClick={() => changePage(current + 1)}>
              {t('Далее →')}
            </JourneyButton>
            <small>
              {t('Показано')} {visible.length ? current * PAGE_SIZE + 1 : 0}–
              {Math.min((current + 1) * PAGE_SIZE, filtered.length)} {t('из')} {filtered.length}
            </small>
          </nav>
        </>
      )}
      {!items.length && (
        <p className="proposal-empty">{t('Загрузите Excel или добавьте первую позицию.')}</p>
      )}
    </section>
  );
}
