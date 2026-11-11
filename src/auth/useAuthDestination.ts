import { useSearchParams } from 'react-router-dom';

const OAUTH_DESTINATION_KEY = 'codoc:oauth-destination';
const DESTINATIONS = new Set([
  '/app',
  '/app/templates/new',
  '/app/publications',
  '/app/workflows',
  '/sites/new',
]);
const safeDestination = (value: string | null) =>
  value && DESTINATIONS.has(value) ? value : '/app';

export function consumeOAuthDestination(): string {
  try {
    const next = sessionStorage.getItem(OAUTH_DESTINATION_KEY);
    sessionStorage.removeItem(OAUTH_DESTINATION_KEY);
    return safeDestination(next);
  } catch {
    return '/app';
  }
}

/** Explicit allowlist prevents untrusted return URLs and open redirects. */
export function useAuthDestination() {
  const [params] = useSearchParams();
  const destination = safeDestination(params.get('next'));
  const suffix = destination === '/app' ? '' : `?next=${encodeURIComponent(destination)}`;
  const rememberOAuthDestination = () => {
    try {
      sessionStorage.setItem(OAUTH_DESTINATION_KEY, destination);
    } catch {
      /* Storage may be disabled; the workspace remains the fallback. */
    }
  };
  return { destination, suffix, rememberOAuthDestination };
}
