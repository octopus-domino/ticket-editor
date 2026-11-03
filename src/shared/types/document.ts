import type { Slide, DataRoot } from './index';
export interface DocumentBinding {
  readonly elementId: string;
  readonly elementLabel: string;
  readonly placeholder: string;
  readonly schemaPath: string;
  readonly source: 'auto' | 'legacy' | 'manual';
  readonly status: 'linked' | 'missing' | 'invalid-type' | 'ignored';
  readonly inferred: string;
  readonly expectedType?: string;
}
export interface EditorInitialDoc {
  slides: Slide[];
  data: DataRoot[];
  activeId: string;
  bindings?: DocumentBinding[];
}
