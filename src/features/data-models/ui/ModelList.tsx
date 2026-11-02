import React, { useState } from 'react';
import type { DataModel } from '../domain/DataModel';

export const ModelList: React.FC<{
  models: DataModel[];
  selectedId: string | null;
  checkedForExport: Set<string>;
  onSelect: (id: string) => void;
  onToggleCheck: (id: string) => void;
  onRemove: (id: string) => void;
}> = ({ models, selectedId, checkedForExport, onSelect, onToggleCheck, onRemove }) => {
  const [confirmId, setConfirmId] = useState<string | null>(null);

  return (
    <div className="dm-list">
      {models.map((m) => (
        <div
          key={m.id}
          className={`dm-list-item ${m.id === selectedId ? 'active' : ''}`}
          onClick={() => onSelect(m.id)}
        >
          <input
            type="checkbox"
            checked={checkedForExport.has(m.id)}
            onChange={(e) => { e.stopPropagation(); onToggleCheck(m.id); }}
            onClick={(e) => e.stopPropagation()}
            title="Выбрать для экспорта"
            style={{ width: 14, height: 14, accentColor: '#6366f1', cursor: 'pointer' }}
          />
          <span className="dm-list-item-name">{m.name}</span>
          {confirmId === m.id ? (
            <span
              className="inline-confirm"
              onClick={(e) => e.stopPropagation()}
            >
              Удалить?{' '}
              <button type="button" onClick={() => { onRemove(m.id); setConfirmId(null); }}>Да</button>{' '}
              <button type="button" onClick={() => setConfirmId(null)}>Нет</button>
            </span>
          ) : (
            <button
              className="dm-btn-remove"
              onClick={(e) => { e.stopPropagation(); setConfirmId(m.id); }}
              title="Удалить"
            >×</button>
          )}
        </div>
      ))}
      {models.length === 0 && <div className="dm-empty" style={{ padding: 16 }}>Пусто</div>}
    </div>
  );
};