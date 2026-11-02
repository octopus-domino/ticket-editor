import { schemaStore } from '../state/SchemaStore';

/** @deprecated Используйте `schemaStore.getState().activeId`. */
export function getSelectedSchemaId(): string | null {
  return schemaStore.getState().activeId;
}

/** @deprecated Используйте `schemaStore.setActive(id)`. */
export function setSelectedSchemaId(id: string | null): void {
  if (id) schemaStore.setActive(id);
}