import { useEffect, useRef, useState } from 'react';
import { getLocale } from '@/shared/i18n';
import { journeyRequest } from '../api/journeys';
import type { CityPoint } from '../api/tripDraft';

export function useMapCityPicker(resolveName: boolean) {
  const [point, setPoint] = useState<CityPoint>();
  const [name, setName] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'unknown'>('idle');
  const request = useRef<AbortController>();
  useEffect(() => () => request.current?.abort(), []);

  function changeName(value: string) {
    request.current?.abort();
    setName(value);
    setStatus('idle');
  }

  function clear() {
    changeName('');
    setPoint(undefined);
  }

  async function pick(next: CityPoint) {
    clear();
    setPoint(next);
    if (!resolveName) return;

    const controller = new AbortController();
    request.current = controller;
    setStatus('loading');
    const { signal } = controller;
    const query = new URLSearchParams({
      longitude: String(next.longitude),
      latitude: String(next.latitude),
      language: getLocale().split('-')[0],
    });
    const lookup = () => journeyRequest<{ city: string | null }>(`/api/walks/v1/addresses/city?${query}`, { signal });
    try {
      const location = await lookup().catch(async error => {
        if (signal.aborted || error.status !== 429) throw error;
        await new Promise(resolve => setTimeout(resolve, 1150));
        if (signal.aborted) throw error;
        return lookup();
      });
      if (signal.aborted) return;
      const city = location?.city?.trim().slice(0, 180) ?? '';
      setName(city);
      setStatus(city ? 'idle' : 'unknown');
    } catch {
      if (!signal.aborted) setStatus('unknown');
    } finally {
      if (request.current === controller) request.current = undefined;
    }
  }

  return { point, name, status, pick, changeName, clear };
}
