import { t as __tr } from '@/shared/i18n';
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
  string: __tr("Строка"), number: __tr("Число"), date: __tr("Дата"), boolean: __tr("Да/Нет"),
  image: __tr("Картинка"), object: __tr("Объект"), array: __tr("Массив"),
};