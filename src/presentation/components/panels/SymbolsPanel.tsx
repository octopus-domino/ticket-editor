import { t as __tr } from '@/shared/i18n';
import React, { useState } from 'react';
import { useStore } from '@/shared/store/store';
import {
  useDocumentStore, useSelectionStore, useGraphicsStore,
} from '../../providers/EditorProvider';
import { useSymbols } from '../../hooks/editor/useSymbols';
import type { SymbolDef } from '@/shared/types';
import { ConfirmDialog } from '@/presentation/components/dialog';
import { InlineTextPrompt } from './InlineTextPrompt';

function previewIcon(sym: SymbolDef): string {
  const p = sym.prototype;
  if (p.type === 'shape') {
    if (p.shape === 'circle') return '○';
    if (p.shape === 'triangle') return '△';
    if (p.shape === 'star') return '★';
    if (p.shape === 'polygon') return '⬡';
    return '▭';
  }
  if (p.type === 'text') return 'T';
  if (p.type === 'line') return '╱';
  if (p.type === 'image') return '🖼';
  return '?';
}

export const SymbolsPanel: React.FC = () => {
  const docStore = useDocumentStore();
  const selStore = useSelectionStore();
  const graphicsStore = useGraphicsStore();
  const symbols = useStore(graphicsStore, (s) => s.symbols);
  const selectedIds = useStore(selStore, (s) => s.selectedIds);
  const { createFromSelection, instantiate } = useSymbols(docStore, selStore, graphicsStore);

  const [creating, setCreating] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const handleCreate = (name: string): void => {
    createFromSelection(name);
    setCreating(false);
  };

  const confirmDeleteSym = symbols.find((s) => s.id === confirmDeleteId) ?? null;

  return (
    <div>
      {!creating && (
        <button
          type="button"
          disabled={!selectedIds.length}
          onClick={() => setCreating(true)}
          style={{
            width: '100%', padding: '7px 10px',
            background: selectedIds.length ? '#6366f1' : '#e2e8f0',
            color: selectedIds.length ? '#fff' : '#94a3b8',
            border: 'none', borderRadius: 5, fontWeight: 600,
            cursor: selectedIds.length ? 'pointer' : 'not-allowed',
            marginBottom: 8,
          }}
        >
          {__tr("+ Создать из выделенного")}</button>
      )}

      {creating && (
        <div style={{ marginBottom: 8 }}>
          <InlineTextPrompt
            placeholder={__tr("Символ {0}", symbols.length + 1)}
            onSave={handleCreate}
            onCancel={() => setCreating(false)}
          />
        </div>
      )}

      {symbols.length === 0 && (
        <p style={{ fontSize: 11, color: '#94a3b8', lineHeight: 1.5 }}>
          {__tr("Выделите элемент на холсте и создайте из него символ. Затем вставляйте его на любой слайд — все копии будут связаны с оригиналом.")}</p>
      )}

      {symbols.map((sym) => (
        <div key={sym.id} style={{
          display: 'flex', alignItems: 'center', gap: 6,
          padding: '6px 8px', background: '#f8fafc',
          border: '1px solid #e2e8f0', borderRadius: 5,
          marginBottom: 4, fontSize: 12,
        }}>
          <span style={{
            width: 28, height: 28, display: 'flex',
            alignItems: 'center', justifyContent: 'center',
            background: '#eef2ff', color: '#4f46e5',
            borderRadius: 4, fontSize: 16, fontWeight: 700,
          }}>
            {previewIcon(sym)}
          </span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{
              fontWeight: 600, overflow: 'hidden',
              textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>
              {sym.name}
            </div>
            <div style={{ fontSize: 10, color: '#94a3b8' }}>
              {sym.prototype.width}×{sym.prototype.height}
            </div>
          </div>
          <button
            type="button"
            title={__tr("Вставить экземпляр")}
            onClick={() => instantiate(sym.id)}
            style={{
              padding: '4px 8px', fontSize: 11,
              background: '#6366f1', color: '#fff',
              border: 'none', borderRadius: 3, cursor: 'pointer',
            }}
          >
            {__tr("Вставить")}</button>
          <button
            type="button"
            title={__tr("Удалить символ")}
            onClick={() => setConfirmDeleteId(sym.id)}
            style={{
              background: 'transparent', border: 'none',
              color: '#dc2626', cursor: 'pointer', fontSize: 16,
              padding: '0 4px',
            }}
          >
            ×
          </button>
        </div>
      ))}

      <ConfirmDialog
        isOpen={!!confirmDeleteId}
        title={__tr("Удалить символ «{0}»?", confirmDeleteSym?.name ?? '')}
        description={__tr("Существующие экземпляры на холсте станут обычными элементами.")}
        variant="danger"
        confirmLabel={__tr("Удалить")}
        onConfirm={() => {
          if (confirmDeleteId) graphicsStore.removeSymbol(confirmDeleteId);
          setConfirmDeleteId(null);
        }}
        onCancel={() => setConfirmDeleteId(null)}
      />
    </div>
  );
};