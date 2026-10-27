import React, { useState } from 'react';
import { DataPanel } from '../../DataPanel';
import { PropertiesPanel } from './PropertiesPanel';
import { useSelectionContext } from '../../editor/contexts/SelectionContext';

type TabKey = 'data' | 'props';

export const RightPanel: React.FC = () => {
  const selection = useSelectionContext();
  const [tab, setTab] = useState<TabKey>('data');

  return (
    <aside className="right-panel">
      <div className="rp-tabs">
        <button
          type="button"
          className={`rp-tab ${tab === 'data' ? 'active' : ''}`}
          onClick={() => setTab('data')}
        >
          📊 Данные
        </button>
        <button
          type="button"
          className={`rp-tab ${tab === 'props' ? 'active' : ''}`}
          onClick={() => setTab('props')}
        >
          ⚙️ Свойства
          {selection.selectedIds.length > 0 && (
            <span className="rp-tab-badge">{selection.selectedIds.length}</span>
          )}
        </button>
      </div>

      <div className="rp-body">
        {tab === 'data' && <DataPanel />}
        {tab === 'props' && <PropertiesPanel />}
      </div>
    </aside>
  );
};