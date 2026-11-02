/**
 * Только тип. Вся логика — в DataModelValidator.ts.
 */
export interface DataModel {
  readonly id: string;
  readonly schemaId: string;
  readonly name: string;
  readonly values: Readonly<Record<string, unknown>>;
  readonly createdAt: string;
  readonly updatedAt: string;
}