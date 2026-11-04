import type { Slide } from '@/shared/types';
import type { Binding } from '@/features/bindings/domain/Binding';

export interface Template {
  readonly folderId?: string | null;
  readonly id: string;
  readonly schemaId: string | null;
  readonly name: string;
  readonly slides: Slide[];
  readonly bindings: Binding[];
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface TemplateSummary {
  readonly folderId?: string | null;
  readonly id: string;
  readonly schemaId: string | null;
  readonly name: string;
  readonly slideCount: number;
  readonly updatedAt: string;
}

export interface SaveTemplateInput {
  readonly folderId?: string | null;
  readonly schemaId: string | null;
  readonly name: string;
  readonly slides: Slide[];
  readonly bindings: Binding[];
}
