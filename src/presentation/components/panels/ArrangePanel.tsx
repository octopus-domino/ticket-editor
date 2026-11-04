import { t as __tr } from '@/shared/i18n';
import React from 'react';
import { useStore } from '@/shared/store/store';
import { useDocumentStore, useSelectionStore } from '../../providers/EditorProvider';
import { useArrange } from '../../hooks/editor/useArrange';

const btns: { mode: Parameters<ReturnType<typeof useArrange>['align']>[0]; label: string; icon: string }[] = [
  { mode: 'left', label: __tr("По левому краю"), icon: '◧' },
  { mode: 'center', label: __tr("По центру"), icon: '◫' },
  { mode: 'right', label: __tr("По правому краю"), icon: '◨' },
  { mode: 'top', label: __tr("По верху"), icon: '⬒' },
  { mode: 'middle', label: __tr("По середине"), icon: '⬓' },
  { mode: 'bottom', label: __tr("По низу"), icon: '⬓' },
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
          {__tr("Распределить →")}</button>
        <button
          type="button"
          disabled={disabledDistribute}
          onClick={() => distribute('vertical')}
        >
          {__tr("Распределить ↓")}</button>
      </div>
      <p style={{ fontSize: 11, color: '#94a3b8', marginTop: 6 }}>
        {__tr("Align ≥ 2 элементов, Distribute ≥ 3.")}</p>
    </div>
  );
};