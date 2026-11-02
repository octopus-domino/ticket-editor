export type BindingSource = 'auto' | 'legacy' | 'manual';

export interface Binding {
  readonly elementId: string;
  readonly elementLabel: string;  // для UI: "Text (шапка)" или "{{event.title}}"
  readonly placeholder: string;   // что нашли: "{{event.title}}" или "fieldPath"
  readonly schemaPath: string;    // выбранное поле схемы
  readonly source: BindingSource;
  readonly status: 'linked' | 'missing' | 'invalid-type';
  readonly inferred: string;      // авто-значение (для отката)
}