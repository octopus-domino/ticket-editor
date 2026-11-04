import { t as __tr } from '@/shared/i18n';
// src/presentation/components/RightPanel.tsx
import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useStore } from '@/shared/store/store';
import { useDocumentStore, useSelectionStore } from '../providers/EditorProvider';
import { DataPanel } from './DataPanel';
import { PropertiesPanel } from './PropertiesPanel';
import { GenerationPanel } from '@/features/generation/ui/GenerationPanel';
import { BindingMatrix } from '@/features/bindings/ui/BindingMatrix';
import { useSchemas } from '@/features/schemas/state/useSchemas';

type Tab = 'props' | 'data' | 'generate' | 'bindings';

const VALID_TABS: Tab[] = ['props', 'data', 'generate', 'bindings'];

function isTab(value: string | null): value is Tab {
  return !!value && (VALID_TABS as string[]).includes(value);
}

export const RightPanel: React.FC = () => {
  const selStore = useSelectionStore();
  const docStore = useDocumentStore();
  const [searchParams] = useSearchParams();

  const selectedIds = useStore(selStore, (s) => s.selectedIds);
  const activeSlide = useStore(docStore, (s) =>
    s.slides.find((x) => x.id === s.activeId),
  );
  const { activeSchema } = useSchemas();

  const urlTab = searchParams.get('tab');

  const [tab, setTab] = useState<Tab>(() => {
    if (isTab(urlTab)) return urlTab;
    // Пустой документ без схемы — сразу «Данные», чтобы пользователь
    // увидел, откуда брать поля для перетаскивания на холст.
    const isEmpty = (activeSlide?.elements.length ?? 0) === 0;
    if (isEmpty && !activeSchema) return 'data';
    return 'props';
  });

  // Если пользователь пришёл по ссылке с ?tab=..., уважаем это.
  useEffect(() => {
    if (isTab(urlTab) && urlTab !== tab) setTab(urlTab);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [urlTab]);

  return (
    <aside className="right-panel">
      <div className="rp-tabs" style={{ overflowX: 'auto' }}>
        <button
          className={`rp-tab ${tab === 'props' ? 'active' : ''}`}
          onClick={() => setTab('props')}
        >
          ⚙️ {selectedIds.length > 0 && <span className="rp-tab-badge">{selectedIds.length}</span>}
        </button>
        <button
          className={`rp-tab ${tab === 'data' ? 'active' : ''}`}
          onClick={() => setTab('data')}
        >
          {__tr("📊 Данные")}</button>
        <button
          className={`rp-tab ${tab === 'generate' ? 'active' : ''}`}
          onClick={() => setTab('generate')}
        >
          {__tr("📦 Генерация")}</button>
        <button
          className={`rp-tab ${tab === 'bindings' ? 'active' : ''}`}
          onClick={() => setTab('bindings')}
        >
          {__tr("🔗 Связи")}</button>
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