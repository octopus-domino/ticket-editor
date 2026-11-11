import { t } from '@/shared/i18n';
import type { AddressStatus } from './useAddressAvailability';
const messages: Record<AddressStatus, string> = {
  empty: 'Use 3–48 lowercase Latin letters, numbers or hyphens.',
  checking: 'Checking address…',
  available: 'This address is available.',
  taken: 'This address is already taken. Choose another.',
  reserved: 'This address is reserved. Choose another.',
  invalid: 'Use 3–48 lowercase Latin letters, numbers or hyphens.',
  failed: 'Could not check the address. Try editing it again.',
};
export function AddressFeedback({ status, id }: { status: AddressStatus; id: string }) {
  return (
    <small id={id} aria-live="polite" className={`address-feedback address-feedback--${status}`}>
      {t(messages[status])}
    </small>
  );
}
