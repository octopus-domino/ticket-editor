import type { ReactNode } from 'react';
import { backgroundUrl } from './catalog';
import './background-library.css';

export function BackgroundSurface({ id, children }: { id?: string | null; children: ReactNode }) {
  const url = backgroundUrl(id);
  return url ? <div className="journey-site-background" style={{ backgroundImage: `url("${url}")` }}>{children}</div> : <>{children}</>;
}
