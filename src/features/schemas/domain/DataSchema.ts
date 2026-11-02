export type FieldType = 'string' | 'number' | 'date' | 'boolean' | 'image' | 'object' | 'array';

export interface FieldDef {
  readonly path: string;
  readonly type: FieldType;
  readonly required: boolean;
  readonly label?: string;
  readonly defaultValue?: string;
}

export interface DataSchema {
  readonly id: string;
  readonly name: string;
  readonly fields: readonly FieldDef[];
  readonly createdAt: string;
  readonly updatedAt: string;
}

export const FIELD_TYPE_LABEL: Record<FieldType, string> = {
  string: 'Строка', number: 'Число', date: 'Дата', boolean: 'Да/Нет',
  image: 'Картинка', object: 'Объект', array: 'Массив',
};