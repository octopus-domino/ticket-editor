import React, { useState } from 'react';
import { useStore } from '@/shared/store/store';
import { useSelectionStore } from '../providers/EditorProvider';
import { DataPanel } from './DataPanel';
import { PropertiesPanel } from './PropertiesPanel';

export const RightPanel: React.FC = () => {
  const selStore = useSelectionStore();
  const selectedIds = useStore(selStore, (s) => s.selectedIds);
  const [tab, setTab] = useState<'data' | 'props'>('props');

  return (
    <aside className="right-panel">
      <div className="rp-tabs">
        <button className={`rp-tab ${tab === 'data' ? 'active' : ''}`} onClick={() => setTab('data')}>📊 Данные</button>
        <button className={`rp-tab ${tab === 'props' ? 'active' : ''}`} onClick={() => setTab('props')}>
          ⚙️ Свойства {selectedIds.length > 0 && <span className="rp-tab-badge">{selectedIds.length}</span>}
        </button>
      </div>
      <div className="rp-body">
        {tab === 'data' && <DataPanel />}
        {tab === 'props' && <PropertiesPanel />}
      </div>
    </aside>
  );
};