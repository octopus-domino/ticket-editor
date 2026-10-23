import React from 'react';
import { useStore } from '@/shared/store/store';
import { useDocumentStore, useSelectionStore } from '../../providers/EditorProvider';
import { useArrange } from '../../hooks/editor/useArrange';

const btns: { mode: Parameters<ReturnType<typeof useArrange>['align']>[0]; label: string; icon: string }[] = [
  { mode: 'left', label: 'По левому краю', icon: '◧' },
  { mode: 'center', label: 'По центру', icon: '◫' },
  { mode: 'right', label: 'По правому краю', icon: '◨' },
  { mode: 'top', label: 'По верху', icon: '⬒' },
  { mode: 'middle', label: 'По середине', icon: '⬓' },
  { mode: 'bottom', label: 'По низу', icon: '⬓' },
];

export const ArrangePanel: React.FC = () => {
  const docStore = useDocumentStore();
  const selStore = useSelectionStore();
  const selectedIds = useStore(selStore, s => s.selectedIds);
  const { align, distribute } = useArrange(docStore, selStore);

  const disabledAlign = selectedIds.length < 2;
  const disabledDistribute = selectedIds.length < 3;

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 4, marginBottom: 8 }}>
        {btns.map(({ mode, label, icon }) => (
          <button
            key={mode}
            type="button"
            title={label}
            disabled={disabledAlign}
            onClick={() => align(mode)}
            style={{ padding: '6px 0', fontSize: 14 }}
          >
            {icon}
          </button>
        ))}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4 }}>
        <button
          type="button"
          disabled={disabledDistribute}
          onClick={() => distribute('horizontal')}
        >
          Распределить →
        </button>
        <button
          type="button"
          disabled={disabledDistribute}
          onClick={() => distribute('vertical')}
        >
          Распределить ↓
        </button>
      </div>
      <p style={{ fontSize: 11, color: '#94a3b8', marginTop: 6 }}>
        Align ≥ 2 элементов, Distribute ≥ 3.
      </p>
    </div>
  );
};