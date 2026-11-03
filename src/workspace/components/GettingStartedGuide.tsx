// src/workspace/components/GettingStartedGuide.tsx
import React from 'react';
import { Link } from 'react-router-dom';

export const GettingStartedGuide: React.FC = () => (
  <div className="getting-started">
    <h2>Давайте создадим первый документ</h2>
    <p className="muted">
      Процесс состоит из 5 шагов. Вы можете прерваться на любом этапе — редактор сохранит прогресс.
    </p>

    <div className="steps-grid">
      <div className="step-card">
        <div className="step-icon">📋</div>
        <h3>1. Создайте схему</h3>
        <p>Опишите поля (например, Имя, Дата, Номер билета), которые будут меняться в документе.</p>
        <Link to="/app/schemas/new" className="btn-primary">Создать схему</Link>
      </div>

      <div className="step-card disabled">
        <div className="step-icon">🎨</div>
        <h3>2. Создайте шаблон</h3>
        <p>Нарисуйте макет и добавьте плейсхолдеры <code>{'{{field}}'}</code>.</p>
        <span className="hint">Доступно после создания схемы</span>
      </div>

      {/* Остальные шаги аналогично */}
    </div>
  </div>
);
