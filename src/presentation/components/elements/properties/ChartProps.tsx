import React from 'react';
import type { ChartElement } from '@/shared/types';
import { Group, L, inputStyle } from './ui';

export const ChartProps: React.FC<{
  el: ChartElement;
  update: (p: Partial<ChartElement>) => void;
}> = ({ el, update }) => {
  const onValuesChange = (txt: string) => {
    const nums = txt
      .split(/[,;\s]+/)
      .map((s) => parseFloat(s))
      .filter((n) => Number.isFinite(n) && n >= 0);
    update({ values: nums });
  };

  return (
    <>
      <Group title="Тип">
        <L label="Вид графика">
          <select
            style={inputStyle}
            value={el.chartKind}
            onChange={(e) => update({ chartKind: e.target.value as 'bar' | 'donut' })}
          >
            <option value="bar">Гистограмма</option>
            <option value="donut">Пончик</option>
          </select>
        </L>
      </Group>

      <Group title="Данные">
        <L label="Значения (через запятую)">
          <textarea
            style={{ ...inputStyle, minHeight: 60 }}
            value={el.values.join(', ')}
            onChange={(e) => onValuesChange(e.target.value)}
          />
        </L>
        <L label="Привязка (data path)">
          <input
            style={inputStyle}
            value={el.dataPath ?? ''}
            placeholder="например, catalog.items"
            onChange={(e) => update({ dataPath: e.target.value || null })}
          />
        </L>
        <p style={{ fontSize: 11, color: '#94a3b8', margin: '4px 0 0', lineHeight: 1.4 }}>
          Если задан путь — значения берутся из панели «Данные».
          Иначе — из списка выше.
        </p>
      </Group>

      <Group title="Геометрия">
        {el.chartKind === 'bar' && (
          <>
            <L label="Ширина столбика">
              <input
                type="number" min={4} style={inputStyle}
                value={el.barWidth}
                onChange={(e) => update({ barWidth: Math.max(4, +e.target.value) })}
              />
            </L>
            <L label="Зазор">
              <input
                type="number" min={0} style={inputStyle}
                value={el.gap}
                onChange={(e) => update({ gap: Math.max(0, +e.target.value) })}
              />
            </L>
          </>
        )}
        {el.chartKind === 'donut' && (
          <L label={`Внутренний радиус: ${Math.round(el.donutInnerRatio * 100)}%`}>
            <input
              type="range" min={0} max={0.95} step={0.01}
              value={el.donutInnerRatio}
              onChange={(e) => update({ donutInnerRatio: +e.target.value })}
              style={{ width: '100%' }}
            />
          </L>
        )}
      </Group>
    </>
  );
};