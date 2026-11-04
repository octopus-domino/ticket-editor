import { useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useStore } from '@/shared/store/store';
import { schemaStore } from './SchemaStore';

export interface UseSchemasResult {
  schemas: ReturnType<typeof schemaStore.getState>['schemas'];
  activeId: string | null;
  activeSchema: ReturnType<typeof schemaStore.getActive>;
  loading: boolean;
  error: string | null;
  selectSchema: (id: string) => void;
}

export function useSchemas(): UseSchemasResult {
  const [params, setParams] = useSearchParams();
  const requestedSchemaId = params.get('schemaId');
  const schemas = useStore(schemaStore, (s) => s.schemas);
  const activeId = useStore(schemaStore, (s) => s.activeId);
  const loading = useStore(schemaStore, (s) => s.loading);
  const loaded = useStore(schemaStore, (s) => s.loaded);
  const error = useStore(schemaStore, (s) => s.error);

  useEffect(() => {
    if (!loaded && !loading && !error) {
      void schemaStore.loadAll();
    }
  }, [loaded, loading, error]);

  const activeSchema = schemas.find((s) => s.id === activeId) ?? null;
  useEffect(() => {
    if (
      requestedSchemaId &&
      requestedSchemaId !== activeId &&
      schemas.some((s) => s.id === requestedSchemaId)
    ) {
      schemaStore.setActive(requestedSchemaId);
    }
  }, [requestedSchemaId, activeId, schemas]);
  const selectSchema = useCallback(
    (id: string) => {
      schemaStore.setActive(id || null);
      const next = new URLSearchParams(params);
      if (id) next.set('schemaId', id);
      else next.delete('schemaId');
      next.delete('modelId');
      setParams(next, { replace: true });
    },
    [params, setParams],
  );
  return { schemas, activeId, activeSchema, loading, error, selectSchema };
}
