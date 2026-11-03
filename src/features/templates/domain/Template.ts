import type { Slide } from '@/shared/types';
import type { Binding } from '@/features/bindings/domain/Binding';

export interface Template {
  readonly id: string;
  readonly schemaId: string | null;
  readonly name: string;
  readonly slides: Slide[];
  readonly bindings: Binding[];
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface TemplateSummary {
  readonly id: string;
  readonly schemaId: string | null;
  readonly name: string;
  readonly slideCount: number;
  readonly updatedAt: string;
}

export interface SaveTemplateInput {
  readonly schemaId: string | null;
  readonly name: string;
  readonly slides: Slide[];
  readonly bindings: Binding[];
}