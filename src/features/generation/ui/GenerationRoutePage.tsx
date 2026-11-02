import React, { useEffect, useState } from 'react';
import { GenerationPage } from './GenerationPage';

interface Autosave {
  slides?: unknown[];
  savedAt?: string;
}

/**
 * Route-обёртка для /generate.
 * P0: берёт slides из autosave-ключа редактора (ticket-editor:autosave).
 * P1: загружает slides по templateId из URL.
 */
export const GenerationRoutePage: React.FC = () => {
  const [slides, setSlides] = useState<unknown[] | null>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem('ticket-editor:autosave');
      if (raw) {
        const parsed = JSON.parse(raw) as Autosave;
        if (Array.isArray(parsed.slides) && parsed.slides.length > 0) {
          setSlides(parsed.slides);
          return;
        }
      }
    } catch {
      /* fall through */
    }
    setSlides([]);
  }, []);

  if (slides === null) {
    return <div style={{ padding: 24, color: '#64748b' }}>Загрузка…</div>;
  }
  if (slides.length === 0) {
    return (
      <div style={{ padding: 24 }}>
        <h2 style={{ marginTop: 0 }}>Нет активного документа</h2>
        <p style={{ color: '#64748b', fontSize: 13 }}>
          Откройте документ в <a href="/">редакторе</a> и вернитесь сюда.
        </p>
      </div>
    );
  }
  return <GenerationPage slides={slides} documentName="Активный документ" />;
};