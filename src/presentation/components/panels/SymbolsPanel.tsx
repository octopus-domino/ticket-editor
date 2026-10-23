import React from 'react';
import { useStore } from '@/shared/store/store';
import {
  useDocumentStore, useSelectionStore, useGraphicsStore,
} from '../../providers/EditorProvider';
import { useSymbols } from '../../hooks/editor/useSymbols';
import type { SymbolDef } from '@/shared/types';

function previewIcon(sym: SymbolDef): string {
  const p = sym.prototype;
  if (p.type === 'shape') {
    if (p.shape === 'circle') return '○';
    if (p.shape === 'triangle') return '△';
    if (p.shape === 'star') return '☆';
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
  const symbols = useStore(graphicsStore, s => s.symbols);
  const selectedIds = useStore(selStore, s => s.selectedIds);
  const { createFromSelection, instantiate } = useSymbols(docStore, selStore, graphicsStore);

  const handleCreate = () => {
    const name = prompt('Название символа:', `Символ ${symbols.length + 1}`);
    if (!name) return;
    createFromSelection(name);
  };

  return (
    <div>
      <button
        type="button"
        disabled={!selectedIds.length}
        onClick={handleCreate}
        style={{
          width: '100%', padding: '7px 10px',
          background: selectedIds.length ? '#6366f1' : '#e2e8f0',
          color: selectedIds.length ? '#fff' : '#94a3b8',
          border: 'none', borderRadius: 5, fontWeight: 600,
          cursor: selectedIds.length ? 'pointer' : 'not-allowed',
          marginBottom: 8,
        }}
      >
        + Создать из выделенного
      </button>

      {symbols.length === 0 && (
        <p style={{ fontSize: 11, color: '#94a3b8', lineHeight: 1.5 }}>
          Выделите элемент на холсте и создайте из него символ. Затем вставляйте его на любой слайд — все копии будут связаны с оригиналом.
        </p>
      )}

      {symbols.map(sym => (
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
            title="Вставить экземпляр"
            onClick={() => instantiate(sym.id)}
            style={{
              padding: '4px 8px', fontSize: 11,
              background: '#6366f1', color: '#fff',
              border: 'none', borderRadius: 3, cursor: 'pointer',
            }}
          >
            Вставить
          </button>
          <button
            type="button"
            title="Удалить символ"
            onClick={() => {
              if (confirm(`Удалить символ «${sym.name}»?\n\nСуществующие экземпляры на холсте станут обычными элементами.`)) {
                graphicsStore.removeSymbol(sym.id);
              }
            }}
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
    </div>
  );
};