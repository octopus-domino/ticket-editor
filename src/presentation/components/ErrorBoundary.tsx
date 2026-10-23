/* ============================================================
   ErrorBoundary.tsx
   NFR-OBS-01: перехват ошибок на уровне App и панелей.
   NFR-OBS-02: prod-ошибки → logger (Sentry-хук подключается позже).
   ============================================================ */

import React, { Component, type ErrorInfo, type ReactNode } from 'react';
import { logger } from '@/shared/logger';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public override state: State = { hasError: false, error: null };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public override componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    logger.error('ui.crash', error, {
      componentStack: errorInfo.componentStack ?? undefined,
    });
  }

  public override render(): ReactNode {
    if (this.state.hasError) {
      return this.props.fallback || (
        <div style={{ padding: 40, textAlign: 'center', color: '#dc2626', fontFamily: 'sans-serif' }}>
          <h2>Что-то пошло не так</h2>
          <p style={{ color: '#64748b' }}>Попробуйте обновить страницу.</p>
          <pre style={{ marginTop: 20, padding: 12, background: '#fef2f2', borderRadius: 6, textAlign: 'left', fontSize: 12, overflowX: 'auto' }}>
            {this.state.error?.message}
          </pre>
          <button
            onClick={() => window.location.reload()}
            style={{ marginTop: 20, padding: '8px 16px', background: '#6366f1', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer' }}
          >
            Обновить страницу
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}