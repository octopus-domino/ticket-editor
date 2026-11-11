import { useEffect, useState } from 'react';
import { authFetch, API_BASE } from '@/shared/api/client';
export type AddressStatus =
  'empty' | 'checking' | 'available' | 'taken' | 'reserved' | 'invalid' | 'failed';
export function useAddressAvailability(
  slug: string,
  namespace: 'sites' | 'workflows',
  editing = false,
) {
  const [result, setResult] = useState<{ slug: string; status: AddressStatus }>({
    slug: '',
    status: 'empty',
  });
  const syntax = /^[a-z][a-z0-9-]{1,46}[a-z0-9]$/.test(slug);
  useEffect(() => {
    if (editing || !slug || !syntax) return;
    const controller = new AbortController();
    let active = true;
    const timer = setTimeout(() => {
      const url =
        namespace === 'sites'
          ? `/api/journey-sites/availability?slug=${encodeURIComponent(slug)}`
          : `/api/workflows/availability?slug=${encodeURIComponent(slug)}`;
      void (
        namespace === 'sites'
          ? fetch(API_BASE + url, { signal: controller.signal })
          : authFetch(url, { signal: controller.signal })
      )
        .then(async (response) => {
          if (!response.ok) throw new Error();
          const body = (await response.json()) as { status: AddressStatus };
          if (!['available', 'taken', 'reserved', 'invalid'].includes(body.status))
            throw new Error();
          if (active) setResult({ slug, status: body.status });
        })
        .catch(() => {
          if (active) setResult({ slug, status: 'failed' });
        });
    }, 400);
    return () => {
      active = false;
      clearTimeout(timer);
      controller.abort();
    };
  }, [slug, namespace, editing, syntax]);
  const status: AddressStatus = editing
    ? 'available'
    : !slug
      ? 'empty'
      : !syntax
        ? 'invalid'
        : result.slug === slug
          ? result.status
          : 'checking';
  return {
    status,
    valid: status === 'available',
    markTaken: () => setResult({ slug, status: 'taken' }),
  };
}
