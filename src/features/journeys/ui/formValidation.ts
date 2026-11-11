import type { SyntheticEvent } from 'react';
import { t } from '@/shared/i18n';
function control(event: SyntheticEvent) {
  const target = event.target;
  return target instanceof HTMLInputElement ||
    target instanceof HTMLSelectElement ||
    target instanceof HTMLTextAreaElement
    ? target
    : null;
}
export function localizeInvalidField(event: SyntheticEvent) {
  const field = control(event);
  if (field)
    field.setCustomValidity(
      field.validity.valueMissing ? t('Complete this field.') : t('Check the form and try again.'),
    );
}
export function clearFieldValidation(event: SyntheticEvent) {
  control(event)?.setCustomValidity('');
}
