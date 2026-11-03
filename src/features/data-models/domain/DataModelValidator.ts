import type { DataSchema, FieldDef } from '@/features/schemas/domain/DataSchema';
import { flattenFields } from '@/features/schemas/domain/SchemaInference';
import type { DataModel } from './DataModel';
import { getByPath, setByPath } from '@/lib/path';

export const getPath = getByPath;
export const setPath = setByPath;

export interface ValidationIssue {
  readonly path: string;
  readonly message: string;
}

function isChildOfArray(fields: readonly FieldDef[], fieldPath: string): boolean {
  const parts = fieldPath.split('.');
  for (let i = 1; i < parts.length; i++) {
    const parentPath = parts.slice(0, i).join('.');
    const parent = fields.find((f) => f.path === parentPath);
    if (parent && parent.type === 'array') return true;
  }
  return false;
}

export function validateModel(
  model: Pick<DataModel, 'values'>,
  schema: DataSchema,
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const flat = flattenFields(schema.fields);

  // 1. Корневые скаляры
  for (const f of flat) {
    if (f.type === 'object' || f.type === 'array') continue;
    if (isChildOfArray(schema.fields, f.path)) continue;

    const v = getByPath(model.values, f.path);
    if (f.required && (v === undefined || v === null || String(v).trim() === '')) {
      issues.push({ path: f.path, message: 'Обязательное поле не заполнено' });
    }
    if (v !== undefined && v !== null && String(v).trim() !== '') {
      const valid =
        f.type === 'number'
          ? Number.isFinite(Number(v))
          : f.type === 'boolean'
            ? typeof v === 'boolean' || v === 'true' || v === 'false'
            : f.type === 'date'
              ? /^\d{4}-\d{2}-\d{2}$/.test(String(v)) && !Number.isNaN(Date.parse(String(v)))
              : typeof v === 'string';
      if (!valid) issues.push({ path: f.path, message: `Неверный тип: ${f.type}` });
    }
  }

  // 2. Элементы массивов
  for (const f of flat) {
    if (f.type !== 'array') continue;

    const arr = getByPath(model.values, f.path);
    if (arr === undefined || arr === null) {
      if (f.required)
        issues.push({
          path: f.path,
          message: 'Обязательный массив не заполнен',
        });
      continue;
    }
    if (!Array.isArray(arr)) {
      issues.push({ path: f.path, message: 'Ожидался массив' });
      continue;
    }
    if (f.required && arr.length === 0) {
      issues.push({ path: f.path, message: 'Обязательный массив пуст' });
    }

    const prefix = f.path + '.';
    const children = flat.filter(
      (c) => c.path.startsWith(prefix) && !c.path.slice(prefix.length).includes('.'),
    );

    arr.forEach((item, idx) => {
      for (const child of children) {
        if (!child.required) continue;
        const childName = child.path.slice(prefix.length);
        const val =
          item && typeof item === 'object'
            ? (item as Record<string, unknown>)[childName]
            : undefined;
        if (val === undefined || val === null || String(val).trim() === '') {
          issues.push({
            path: `${f.path}[${idx}].${childName}`,
            message: `Обязательное поле не заполнено (строка ${idx + 1})`,
          });
        }
      }
    });
  }

  return issues;
}

export function leafFieldsOf(schema: DataSchema): FieldDef[] {
  return flattenFields(schema.fields).filter((f) => f.type !== 'object' && f.type !== 'array');
}
