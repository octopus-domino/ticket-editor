import React, { useState } from 'react';
import { useDocumentStore, useSelectionStore } from '../../providers/EditorProvider';
import { generateBarChart, generateDonutChart } from '@/lib/graphics/graphs';

type ChartKind = 'bar' | 'donut';

export const GraphToolPanel: React.FC = () => {
  const docStore = useDocumentStore();
  const selStore = useSelectionStore();
  const [kind, setKind] = useState<ChartKind>('bar');
  const [data, setData] = useState('10, 20, 15, 30, 25');
  const [error, setError] = useState('');

  const generate = () => {
    setError('');
    const values = data.split(/[,;\s]+/).map(Number).filter(v => Number.isFinite(v) && v >= 0);
    if (!values.length) { setError('Введите числа через запятую'); return; }

    const elements = kind === 'bar'
      ? generateBarChart(values)
      : generateDonutChart(values);

    if (!elements.length) { setError('Не удалось сгенерировать'); return; }

    docStore.commit((draft) => {
      const s = draft.slides.find(x => x.id === draft.activeId);
      if (s) s.elements.push(...elements);
    }, `graph-${kind}`);
    selStore.setIds(elements.map(e => e.id));
  };

  return (
    <div>
      <input
        type="text"
        value={data}
        onChange={e => setData(e.target.value)}
        placeholder="10, 20, 15, 30"
        style={{ width: '100%', padding: '5px 8px', fontSize: 12, border: '1px solid #cbd5e1', borderRadius: 4, marginBottom: 6 }}
      />
      <select
        value={kind}
        onChange={e => setKind(e.target.value as ChartKind)}
        style={{ width: '100%', padding: '5px 8px', fontSize: 12, border: '1px solid #cbd5e1', borderRadius: 4, marginBottom: 6 }}
      >
        <option value="bar">Гистограмма</option>
        <option value="donut">Пончик</option>
      </select>
      <button
        type="button"
        onClick={generate}
        style={{ width: '100%', padding: '6px 10px', background: '#6366f1', color: '#fff', border: 'none', borderRadius: 5, fontWeight: 600, cursor: 'pointer' }}
      >
        Сгенерировать
      </button>
      {error && <p style={{ fontSize: 11, color: '#dc2626', marginTop: 6 }}>{error}</p>}
      <p style={{ fontSize: 11, color: '#94a3b8', marginTop: 6 }}>
        Bars — 5 цветов из палитры. Donut — сегменты по долям.
      </p>
    </div>
  );
};