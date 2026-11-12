import { t } from '@/shared/i18n';
import { useState } from 'react';
import { ProposalLineList } from './ProposalLineList';
import { JourneyButton } from './JourneyButton';
import { readProposalWorkbook } from '../api/readProposalWorkbook';
import { proposalItems, proposalNumber, type ProposalItem } from '../domain/proposal';

export function ProposalEditor({
  value,
  onChange,
  currency = 'RUB',
}: {
  value: string;
  onChange: (value: string) => void;
  currency?: string;
}) {
  const [importVersion, setImportVersion] = useState(0);
  const [sheet, setSheet] = useState<string[][]>([]);
  const [columns, setColumns] = useState([0, 1, 2]);
  const [headerRow, setHeaderRow] = useState(0);
  const [error, setError] = useState('');
  const items = proposalItems(value);
  function update(rows: ProposalItem[]) {
    onChange(JSON.stringify(rows));
  }
  function apply() {
    try {
      if (new Set(columns).size !== 3) throw new Error(t('Выберите три разные колонки.'));
      const result = sheet
        .slice(headerRow + 1)
        .filter((row) => columns.some((col) => row[col]?.trim()))
        .map((row, index) => {
          const name = (row[columns[0]] ?? '').trim();
          const quantity = proposalNumber(row[columns[1]] ?? '');
          const price = proposalNumber(row[columns[2]] ?? '');
          if (!name || name.length > 200 || Number(quantity) <= 0)
            throw new Error(
              t('Проверьте строку {0}: название и количество.', index + headerRow + 2),
            );
          return { name, quantity, price };
        });
      if (!result.length || result.length > 200) throw new Error(t('Нужно от 1 до 200 позиций.'));
      update(result);
      setImportVersion((v) => v + 1);
      setSheet([]);
      setError('');
    } catch (reason) {
      setError((reason as Error).message);
    }
  }
  return (
    <fieldset className="proposal-editor">
      <legend>{t('Товары и услуги')}</legend>
      <label>
        {t('Загрузить из Excel (.xlsx)')}
        <input
          type="file"
          accept=".xlsx"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (!file) return;
            void readProposalWorkbook(file)
              .then((rows) => {
                setSheet(rows);
                setError('');
                const foundRow = rows
                  .slice(0, 20)
                  .findIndex(
                    (row) =>
                      row.some((h) => /наимен|назван|товар|услуг|name|product/i.test(h)) &&
                      row.some((h) => /цена|price/i.test(h)),
                  );
                const header = foundRow < 0 ? 0 : foundRow;
                setHeaderRow(header);
                const headers = rows[header] ?? [];
                setColumns(
                  [
                    /наимен|назван|товар|услуг|name|product/i,
                    /колич|кол-во|quantity|qty/i,
                    /цена|price/i,
                  ].map((pattern, index) => {
                    const found = headers.findIndex((h) => pattern.test(h));
                    return found < 0 ? index : found;
                  }),
                );
              })
              .catch((reason) => setError((reason as Error).message));
            event.target.value = '';
          }}
        />
      </label>
      <small>
        {t(
          'Первый лист: выберите строку заголовков и колонки. До 200 позиций. Формулы замените значениями. Файл остаётся в браузере.',
        )}
      </small>
      {!!sheet.length && (
        <div>
          <label>
            {t('Строка заголовков')}
            <select value={headerRow} onChange={(e) => setHeaderRow(Number(e.target.value))}>
              {sheet.slice(0, 20).map((row, index) => (
                <option key={index} value={index}>
                  {index + 1}: {row.filter(Boolean).join(' / ').slice(0, 100)}
                </option>
              ))}
            </select>
          </label>
          {[t('Название'), t('Количество'), t('Цена за единицу')].map((label, index) => (
            <label key={label}>
              {label}
              <select
                value={columns[index]}
                onChange={(event) =>
                  setColumns((old) =>
                    old.map((v, i) => (i === index ? Number(event.target.value) : v)),
                  )
                }
              >
                {Array.from({ length: sheet[headerRow].length }, (_, col) => (
                  <option key={col} value={col}>
                    {sheet[headerRow][col] || t('Колонка {0}', col + 1)}
                  </option>
                ))}
              </select>
            </label>
          ))}
          <p>
            {t('Будет проверено строк:')} {sheet.length - headerRow - 1}
            {t('. Импорт заменит текущие позиции.')}
          </p>
          <JourneyButton variant="primary" onClick={apply}>
            {t('Проверить и добавить позиции')}
          </JourneyButton>
        </div>
      )}
      <ProposalLineList key={importVersion} items={items} onChange={update} currency={currency} />
      {error && <p role="alert">{error}</p>}
    </fieldset>
  );
}
