// src/workspace/components/WorkspaceHome.tsx
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '@/shared/store/store';
import { authStore } from '@/auth/store';

export const WorkspaceHome: React.FC = () => {
  const navigate = useNavigate();
  const user = useStore(authStore, (s) => s.user);

  /** Старт с шаблона: открываем новый редактор, панель «Данные» уже открыта. */
  const startWithTemplate = (): void => {
    navigate('/app/templates/new');
  };

  /** Старт с данных: создаём схему, после сохранения возвращаемся в «Данные». */
  const startWithData = (): void => {
    navigate('/app/schemas/new', {
      state: { from: '/app/data-models?welcome=1' },
    });
  };

  const displayName = user?.name?.split(' ')[0] || 'коллега';

  return (
    <div className="workspace-home">
      <header className="workspace-home-head">
        <h1>С чего начнём, {displayName}?</h1>
        <p>
          Выберите удобную точку входа. Схему данных и наборы данных можно создать прямо во время работы —
          в панели «Данные» справа от холста.
        </p>
      </header>

      <div className="workspace-entry-grid">
        <button
          type="button"
          className="workspace-entry-card workspace-entry-template"
          onClick={startWithTemplate}
        >
          <div className="workspace-entry-icon" aria-hidden>🎨</div>
          <h2>Начать с шаблона</h2>
          <p>
            Откроется редактор. Справа — панель «Данные»: создайте схему, добавьте наборы данных,
            перетащите поля на холст.
          </p>
          <span className="workspace-entry-cta">Открыть редактор →</span>
        </button>

        <button
          type="button"
          className="workspace-entry-card workspace-entry-data"
          onClick={startWithData}
        >
          <div className="workspace-entry-icon" aria-hidden>📊</div>
          <h2>Начать с данных</h2>
          <p>
            Опишите схему данных — список полей — и заполните наборы данных значениями.
            Затем примените к любому шаблону одной кнопкой.
          </p>
          <span className="workspace-entry-cta">Создать схему →</span>
        </button>
      </div>

      <div className="workspace-home-hint">
        <strong>Совет:</strong> если не знаете, с чего начать, — начните с шаблона.
        Схема данных и наборы данных создаются прямо в редакторе, никуда не нужно уходить.
      </div>
    </div>
  );
};
