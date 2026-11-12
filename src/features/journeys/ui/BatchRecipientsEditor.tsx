import { t } from '@/shared/i18n';
import { useState } from 'react';
import { readProposalWorkbook } from '../api/readProposalWorkbook';
import type { JourneyField } from '../domain/definitions';

/** Maps an external workbook to recipient records; never saves partial imports. */
export function BatchRecipientsEditor({
  names,
  fields,
  onChange,
  products = false,
  singleRecipient,
}: {
  names: string;
  fields: JourneyField[];
  onChange: (names: string, rows: Record<string, string>[]) => void;
  products?: boolean;
  singleRecipient?: string;
}) {
  const [sheet, setSheet] = useState<string[][]>([]);
  const [mapping, setMapping] = useState<Record<string, number>>({ recipient: 0 });
  const [error, setError] = useState('');
  const columns = [
    { name: 'recipient', label: products ? t('Product name') : t('Имя получателя') },
    ...fields.filter((f) => f.name !== 'recipient'),
  ];
  return (
    <fieldset>
      <legend>{products ? t('Product labels') : t('Получатели')}</legend>
      <label>
        {t('Загрузить список из Excel (.xlsx)')}
        <input
          type="file"
          accept=".xlsx"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (!file) return;
            void readProposalWorkbook(file)
              .then((rows) => {
                setSheet(rows);
                setError('');
                const headers = rows[0] ?? [];
                const mapped: Record<string, number> = {};
                for (const field of columns) {
                  const index = headers.findIndex(
                    (h) =>
                      h?.trim().toLocaleLowerCase() === field.name ||
                      h?.trim().toLocaleLowerCase() === field.label.toLocaleLowerCase() ||
                      (field.name === 'recipient' &&
                        /фио|имя|name|recipient|товар|название|product/i.test(h)),
                  );
                  mapped[field.name] = index;
                }
                setMapping(mapped);
              })
              .catch((reason) => setError((reason as Error).message));
            e.target.value = '';
          }}
        />
      </label>
      {!!sheet.length && (
        <div>
          <p>{t('Первая строка — заголовки. Для общих данных оставьте «Из формы».')}</p>
          {columns.map((field) => (
            <label key={field.name}>
              {field.label}
              <select
                value={mapping[field.name] ?? -1}
                onChange={(e) =>
                  setMapping((v) => ({ ...v, [field.name]: Number(e.target.value) }))
                }
              >
                <option value={-1}>
                  {field.name === 'recipient' ? t('Выберите колонку') : t('Из формы')}
                </option>
                {Array.from({ length: sheet[0].length }, (_, index) => (
                  <option key={index} value={index}>
                    {sheet[0][index] || t('Колонка {0}', index + 1)}
                  </option>
                ))}
              </select>
            </label>
          ))}
          <button
            type="button"
            onClick={() => {
              try {
                if ((mapping.recipient ?? -1) < 0)
                  throw new Error(t('Выберите колонку с именами.'));
                const rows = sheet
                  .slice(1)
                  .filter((row) => row.some(Boolean))
                  .map((row, index) => {
                    const values: Record<string, string> = {};
                    for (const field of columns) {
                      const col = mapping[field.name];
                      if (col >= 0 && row[col]?.trim()) values[field.name] = row[col].trim();
                    }
                    if (!values.recipient || values.recipient.length > 100)
                      throw new Error(t('Проверьте имя в строке {0}.', index + 2));
                    return values;
                  });
                if (!rows.length || rows.length > 100)
                  throw new Error(t('Нужно от 1 до 100 получателей.'));
                onChange(rows.map((row) => row.recipient).join('\n'), rows);
                setSheet([]);
                setError('');
              } catch (reason) {
                setError((reason as Error).message);
              }
            }}
          >
            {t('Проверить и добавить получателей')}
          </button>
        </div>
      )}
      <label>
        {products
          ? t('Product names, one per line')
          : t('Имена участников — каждое с новой строки')}
        <textarea
          required={!singleRecipient?.trim()}
          value={names}
          onChange={(e) => onChange(e.target.value, [])}
          placeholder={t('Анна Иванова\nМихаил Петров')}
        />
      </label>
      <small>
        {t(
          'До 100 получателей. При ручном изменении списка используются общие значения из формы. Файл Excel остаётся в браузере.',
        )}
      </small>
      {error && <p role="alert">{error}</p>}
    </fieldset>
  );
}
