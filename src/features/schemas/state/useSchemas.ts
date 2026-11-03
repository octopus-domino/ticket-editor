import { useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useStore } from '@/shared/store/store';
import { schemaStore } from './SchemaStore';

export interface UseSchemasResult {
  schemas: ReturnType<typeof schemaStore.getState>['schemas'];
  activeId: string | null;
  activeSchema: ReturnType<typeof schemaStore.getActive>;
  loading: boolean;
  error: string | null;
}

export function useSchemas(): UseSchemasResult {
  const [params] = useSearchParams();
  const requestedSchemaId = params.get('schemaId');
  const schemas = useStore(schemaStore, (s) => s.schemas);
  const activeId = useStore(schemaStore, (s) => s.activeId);
  const loading = useStore(schemaStore, (s) => s.loading);
  const error = useStore(schemaStore, (s) => s.error);

  useEffect(() => {
    if (schemas.length === 0 && !loading && !error) {
      void schemaStore.loadAll();
    }
  }, [schemas.length, loading, error]);

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
  return { schemas, activeId, activeSchema, loading, error };
}
