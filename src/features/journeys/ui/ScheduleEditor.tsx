import { t } from '@/shared/i18n';
import { lessons } from '../domain/schedule';
export function ScheduleEditor({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  const items = lessons(value);
  return (
    <fieldset>
      <legend>{t('Занятия')}</legend>
      {items.map((item, index) => (
        <div key={item.id}>
          {(['date', 'time', 'title', 'location'] as const).map((key) => (
            <label key={key}>
              {
                { date: t('Дата'), time: t('Время'), title: t('Занятие'), location: t('Место') }[
                  key
                ]
              }
              <input
                type={key === 'date' || key === 'time' ? key : 'text'}
                required={key !== 'location'}
                maxLength={200}
                value={item[key]}
                onChange={(e) =>
                  onChange(
                    JSON.stringify(
                      items.map((v, i) => (i === index ? { ...v, [key]: e.target.value } : v)),
                    ),
                  )
                }
              />
            </label>
          ))}
          <label>
            {t('Длительность, минут')}
            <input
              type="number"
              min={1}
              max={1440}
              required
              value={item.durationMinutes ?? 60}
              onChange={(e) =>
                onChange(
                  JSON.stringify(
                    items.map((v, i) =>
                      i === index ? { ...v, durationMinutes: Number(e.target.value) } : v,
                    ),
                  ),
                )
              }
            />
          </label>
          <button
            type="button"
            onClick={() => onChange(JSON.stringify(items.filter((_, i) => i !== index)))}
          >
            {t('Удалить занятие')}
            {index + 1}
          </button>
        </div>
      ))}
      <button
        type="button"
        disabled={items.length >= 100}
        onClick={() =>
          onChange(
            JSON.stringify([
              ...items,
              {
                id: crypto.randomUUID(),
                date: '',
                time: '',
                title: '',
                location: '',
                durationMinutes: 60,
              },
            ]),
          )
        }
      >
        {t('Добавить занятие')}
      </button>
      <small>{t('В календаре сохраняются часовой пояс и длительность каждого занятия.')}</small>
    </fieldset>
  );
}
