import { t } from '@/shared/i18n';
/** Public forms share the same localized transport errors as authenticated screens. */
export async function publicFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  try {
    return await fetch(input, init);
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') throw error;
    throw new Error(t('Network error. Check your connection.'));
  }
}
