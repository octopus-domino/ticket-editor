import { useSearchParams } from 'react-router-dom';

const OAUTH_DESTINATION_KEY = 'codoc:oauth-destination';

export function consumeOAuthDestination(): string {
  try {
    const next = sessionStorage.getItem(OAUTH_DESTINATION_KEY);
    sessionStorage.removeItem(OAUTH_DESTINATION_KEY);
    return next === '/app/templates/new' ? next : '/app';
  } catch {
    return '/app';
  }
}

/** Explicit allowlist prevents untrusted return URLs and open redirects. */
export function useAuthDestination() {
  const [params] = useSearchParams();
  const destination = params.get('next') === '/app/templates/new' ? '/app/templates/new' : '/app';
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
