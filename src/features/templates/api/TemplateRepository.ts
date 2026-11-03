import type {
  SaveTemplateInput,
  Template,
  TemplateSummary,
} from '../domain/Template';

/**
 * Порт репозитория шаблонов. Реализации:
 *   - HttpTemplateRepository — через authFetch
 *   - MockTemplateRepository — для тестов
 */
export interface TemplateRepository {
  list(schemaId?: string): Promise<TemplateSummary[]>;
  get(id: string): Promise<Template | null>;
  create(input: SaveTemplateInput): Promise<Template>;
  update(id: string, input: SaveTemplateInput): Promise<Template>;
  rename(id: string, name: string): Promise<Template>;
  delete(id: string): Promise<void>;
}