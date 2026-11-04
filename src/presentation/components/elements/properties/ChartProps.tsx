import { t as __tr } from '@/shared/i18n';
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
      <Group title={__tr("Тип")}>
        <L label={__tr("Вид графика")}>
          <select
            style={inputStyle}
            value={el.chartKind}
            onChange={(e) => update({ chartKind: e.target.value as 'bar' | 'donut' })}
          >
            <option value="bar">{__tr("Гистограмма")}</option>
            <option value="donut">{__tr("Пончик")}</option>
          </select>
        </L>
      </Group>

      <Group title={__tr("Данные")}>
        <L label={__tr("Значения (через запятую)")}>
          <textarea
            style={{ ...inputStyle, minHeight: 60 }}
            value={el.values.join(', ')}
            onChange={(e) => onValuesChange(e.target.value)}
          />
        </L>
        <L label={__tr("Привязка (data path)")}>
          <input
            style={inputStyle}
            value={el.dataPath ?? ''}
            placeholder={__tr("например, catalog.items")}
            onChange={(e) => update({ dataPath: e.target.value || null })}
          />
        </L>
        <p style={{ fontSize: 11, color: '#94a3b8', margin: '4px 0 0', lineHeight: 1.4 }}>
          {__tr("Если задан путь — значения берутся из панели «Данные». Иначе — из списка выше.")}</p>
      </Group>

      <Group title={__tr("Геометрия")}>
        {el.chartKind === 'bar' && (
          <>
            <L label={__tr("Ширина столбика")}>
              <input
                type="number" min={4} style={inputStyle}
                value={el.barWidth}
                onChange={(e) => update({ barWidth: Math.max(4, +e.target.value) })}
              />
            </L>
            <L label={__tr("Зазор")}>
              <input
                type="number" min={0} style={inputStyle}
                value={el.gap}
                onChange={(e) => update({ gap: Math.max(0, +e.target.value) })}
              />
            </L>
          </>
        )}
        {el.chartKind === 'donut' && (
          <L label={__tr("Внутренний радиус: {0}%", Math.round(el.donutInnerRatio * 100))}>
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