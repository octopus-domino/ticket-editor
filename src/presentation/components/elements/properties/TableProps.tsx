import React from 'react';
import type { TableElement } from '@/shared/types';
import { Group, L, inputStyle, normalizeColor } from './ui';

export const TableProps: React.FC<{ el: TableElement; update: (p: Partial<TableElement>) => void }> = ({ el, update }) => (
  <Group title="Таблица">
    <L label="Строк"><input style={inputStyle} type="number" min={1} value={el.rows} onChange={(e) => {
      const rows = Math.max(1, +e.target.value);
      const data = el.data.slice(0, rows);
      while (data.length < rows) data.push(Array(el.cols).fill(''));
      update({ rows, data });
    }} /></L>
    <L label="Колонок"><input style={inputStyle} type="number" min={1} value={el.cols} onChange={(e) => {
      const cols = Math.max(1, +e.target.value);
      const data = el.data.map((r) => {
        const nr = r.slice(0, cols);
        while (nr.length < cols) nr.push('');
        return nr;
      });
      update({ cols, data });
    }} /></L>
    <L label="Цвет границ"><input style={inputStyle} type="color" value={normalizeColor(el.borderColor)} onChange={(e) => update({ borderColor: e.target.value })} /></L>
    <L label="Цвет шапки"><input style={inputStyle} type="color" value={normalizeColor(el.headerBg)} onChange={(e) => update({ headerBg: e.target.value })} /></L>
  </Group>
);