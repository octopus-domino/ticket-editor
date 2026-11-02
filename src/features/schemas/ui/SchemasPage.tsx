import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useSchemas } from '../state/useSchemas';
import { schemaStore } from '../state/SchemaStore';

export const SchemasPage: React.FC = () => {
  const { schemas, loading, error } = useSchemas();
  const [actionError, setActionError] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const doDelete = async (id: string): Promise<void> => {
    try {
      await schemaStore.delete(id);
      setConfirmDeleteId(null);
      setActionError(null);
    } catch (e) {
      setActionError((e as Error).message);
    }
  };

  return (
    <div className="schema-page">
      <div className="schema-fields-header">
        <h2>Схемы данных</h2>
        <Link to="/schemas/new" className="schema-btn-fill">+ Новая схема</Link>
      </div>
      {loading && <div className="schema-hint">Загрузка…</div>}
      {error && <div className="schema-error">{error}</div>}
      {actionError && <div className="schema-error">{actionError}</div>}
      {schemas.length === 0 && !loading && (
        <p className="schema-hint">Схем нет. Создайте первую.</p>
      )}
      <div className="schema-fields-list">
        {schemas.map((s) => (
          <div key={s.id} className="schema-root-card">
            <div className="schema-root-head">
              <Link to={`/schemas/${s.id}`} className="schema-root-name">{s.name}</Link>
              <span className="schema-hint">{s.fields.length} полей</span>
              {confirmDeleteId === s.id ? (
                <span className="inline-confirm">
                  Удалить?{' '}
                  <button type="button" onClick={() => void doDelete(s.id)}>Да</button>{' '}
                  <button type="button" onClick={() => setConfirmDeleteId(null)}>Нет</button>
                </span>
              ) : (
                <button
                  className="schema-btn-remove"
                  onClick={() => setConfirmDeleteId(s.id)}
                  title="Удалить схему"
                >×</button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};