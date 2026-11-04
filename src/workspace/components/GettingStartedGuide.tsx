// src/workspace/components/GettingStartedGuide.tsx
import React from 'react';
import { Link } from 'react-router-dom';

export const GettingStartedGuide: React.FC = () => (
  <div className="getting-started">
    <h2>Давайте создадим первый документ</h2>
    <p className="muted">
      Начните с макета. Схема данных нужна только для подстановки значений.
    </p>

    <div className="steps-grid">
      <div className="step-card">
        <div className="step-icon">📋</div>
        <h3>Схема данных — по необходимости</h3>
        <p>Опишите поля (например, Имя, Дата, Номер билета), которые будут меняться в документе.</p>
        <Link to="/app/schemas/new" className="btn-primary">Создать схему</Link>
      </div>

      <div className="step-card">
        <div className="step-icon">🎨</div>
        <h3>Создайте шаблон</h3>
        <p>Нарисуйте макет и добавьте плейсхолдеры <code>{'{{field}}'}</code>.</p>
        <Link to="/app/templates/new" className="btn-primary">Создать шаблон</Link>
      </div>

      {/* Остальные шаги аналогично */}
    </div>
  </div>
);
