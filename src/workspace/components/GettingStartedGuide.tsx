import { t as __tr } from '@/shared/i18n';
// src/workspace/components/GettingStartedGuide.tsx
import React from 'react';
import { Link } from 'react-router-dom';

export const GettingStartedGuide: React.FC = () => (
  <div className="getting-started">
    <h2>{__tr("Давайте создадим первый документ")}</h2>
    <p className="muted">
      {__tr("Начните с макета. Схема данных нужна только для подстановки значений.")}</p>

    <div className="steps-grid">
      <div className="step-card">
        <div className="step-icon">📋</div>
        <h3>{__tr("Схема данных — по необходимости")}</h3>
        <p>{__tr("Опишите поля (например, Имя, Дата, Номер билета), которые будут меняться в документе.")}</p>
        <Link to="/app/schemas/new" className="btn-primary">{__tr("Создать схему")}</Link>
      </div>

      <div className="step-card">
        <div className="step-icon">🎨</div>
        <h3>{__tr("Создайте шаблон")}</h3>
        <p>{__tr("Нарисуйте макет и добавьте плейсхолдеры")}<code>{'{{field}}'}</code>.</p>
        <Link to="/app/templates/new" className="btn-primary">{__tr("Создать шаблон")}</Link>
      </div>

      {/* Остальные шаги аналогично */}
    </div>
  </div>
);
