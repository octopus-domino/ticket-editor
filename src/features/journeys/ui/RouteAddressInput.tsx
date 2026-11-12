import { useEffect, useId, useRef, useState } from 'react';
import { getLocale, t } from '@/shared/i18n';
import { journeyRequest } from '../api/journeys';

export interface RouteAddress {
  label: string;
  longitude: number;
  latitude: number;
}
export function RouteAddressInput({
  value,
  onSelect,
}: {
  value: string;
  onSelect: (address: RouteAddress) => void;
}) {
  const [query, setQuery] = useState(value);
  const [options, setOptions] = useState<RouteAddress[]>([]);
  const [active, setActive] = useState(-1);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const sequence = useRef(0);
  const listId = useId();
  useEffect(() => {
    setQuery(value);
    setOptions([]);
  }, [value]);
  useEffect(() => {
    const request = ++sequence.current;
    setOptions([]);
    setActive(-1);
    setError('');
    if (query.trim().length < 3 || query === value) {
      setBusy(false);
      return;
    }
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setBusy(true);
      try {
        const search = () =>
          journeyRequest<RouteAddress[]>(
            `/api/journeys/routes/addresses?q=${encodeURIComponent(query.trim())}&language=${getLocale().split('-')[0]}`,
            { signal: controller.signal },
          );
        let found: RouteAddress[];
        try {
          found = await search();
        } catch (reason) {
          if ((reason as { status?: number }).status !== 429 || controller.signal.aborted)
            throw reason;
          await new Promise<void>((resolve) => setTimeout(resolve, 1150));
          if (controller.signal.aborted) return;
          found = await search();
        }
        if (request === sequence.current) setOptions(found);
      } catch (reason) {
        if (!controller.signal.aborted && request === sequence.current)
          setError((reason as Error).message);
      } finally {
        if (request === sequence.current) setBusy(false);
      }
    }, 650);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query, value]);
  const select = (address: RouteAddress) => {
    sequence.current++;
    setQuery(address.label);
    setOptions([]);
    onSelect(address);
  };
  return (
    <div className="route-address">
      <input
        aria-label={t('Address')}
        role="combobox"
        aria-autocomplete="list"
        aria-expanded={options.length > 0}
        aria-controls={listId}
        aria-activedescendant={active >= 0 ? `${listId}-${active}` : undefined}
        value={query}
        maxLength={180}
        placeholder={t('Start typing an address')}
        onChange={(event) => setQuery(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === 'Escape') {
            setOptions([]);
            setActive(-1);
          }
          if (event.key === 'ArrowDown' && options.length) {
            event.preventDefault();
            setActive((index) => (index + 1) % options.length);
          }
          if (event.key === 'ArrowUp' && options.length) {
            event.preventDefault();
            setActive((index) => (index + options.length - 1) % options.length);
          }
          if (event.key === 'Enter') {
            event.preventDefault();
            if (active >= 0 && options[active]) select(options[active]);
          }
        }}
      />
      {options.length > 0 && (
        <ul id={listId} role="listbox">
          {options.map((option, index) => (
            <li
              key={`${option.longitude}:${option.latitude}:${index}`}
              id={`${listId}-${index}`}
              role="option"
              aria-selected={active === index}
            >
              <button type="button" onClick={() => select(option)}>
                {option.label}
              </button>
            </li>
          ))}
        </ul>
      )}
      {busy && <small role="status">{t('Searching for addresses…')}</small>}
      {error && <small role="alert">{error}</small>}
      {!busy && query.length >= 3 && query !== value && !options.length && !error && (
        <small>
          {t('Select an address from the suggestions. Add the city to narrow the search.')}
        </small>
      )}
    </div>
  );
}
