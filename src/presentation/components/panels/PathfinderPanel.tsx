import React from 'react';
import { useStore } from '@/shared/store/store';
import { useDocumentStore, useSelectionStore } from '../../providers/EditorProvider';
import { usePathfinder } from '../../hooks/editor/usePathfinder';
import { PATHFINDER_OPS } from '@/domain/arrange/pathfinder';
import { toast } from '@/presentation/components/toast';

export const PathfinderPanel: React.FC = () => {
  const docStore = useDocumentStore();
  const selStore = useSelectionStore();
  const selectedIds = useStore(selStore, (s) => s.selectedIds);
  const { run, busy } = usePathfinder(docStore, selStore);

  const disabled = busy || selectedIds.length < 2;

  const handleClick = (op: typeof PATHFINDER_OPS[number]['op']): void => {
    const result = run(op);
    if (!result.ok) {
      toast.error('Pathfinder не выполнен', result.error);
    }
  };

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4 }}>
        {PATHFINDER_OPS.map(({ op, label }) => (
          <button
            key={op}
            type="button"
            disabled={disabled}
            onClick={() => handleClick(op)}
          >
            {label}
          </button>
        ))}
      </div>
      <p style={{ fontSize: 11, color: '#94a3b8', marginTop: 6 }}>
        Boolean ops через polygon-clipping. Text и символы не участвуют.
      </p>
    </div>
  );
};