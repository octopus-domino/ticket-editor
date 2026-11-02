import React, { useState } from 'react';
import { useStore } from '@/shared/store/store';
import { useSelectionStore } from '../providers/EditorProvider';
import { DataPanel } from './DataPanel';
import { PropertiesPanel } from './PropertiesPanel';
import { GenerationPanel } from '@/features/generation/ui/GenerationPanel';
import { BindingMatrix } from '@/features/bindings/ui/BindingMatrix';

export const RightPanel: React.FC = () => {
  const selStore = useSelectionStore();
  const selectedIds = useStore(selStore, (s) => s.selectedIds);
  const [tab, setTab] = useState<'props' | 'data' | 'generate' | 'bindings'>('props');

  return (
    <aside className="right-panel">
      <div className="rp-tabs" style={{ overflowX: 'auto' }}>
        <button className={`rp-tab ${tab === 'props' ? 'active' : ''}`} onClick={() => setTab('props')}>
          ⚙️ {selectedIds.length > 0 && <span className="rp-tab-badge">{selectedIds.length}</span>}
        </button>
        <button className={`rp-tab ${tab === 'data' ? 'active' : ''}`} onClick={() => setTab('data')}>
          📊 Данные
        </button>
        <button className={`rp-tab ${tab === 'generate' ? 'active' : ''}`} onClick={() => setTab('generate')}>
          📦 Генерация
        </button>
        <button className={`rp-tab ${tab === 'bindings' ? 'active' : ''}`} onClick={() => setTab('bindings')}>
          🔗 Связи
        </button>
      </div>
      <div className="rp-body">
        {tab === 'props' && <PropertiesPanel />}
        {tab === 'data' && <DataPanel />}
        {tab === 'generate' && <GenerationPanel />}
        {tab === 'bindings' && <BindingMatrix />}
      </div>
    </aside>
  );
};