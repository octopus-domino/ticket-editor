import { t as __tr } from '@/shared/i18n';
// src/workspace/components/WorkspaceHome.tsx
import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import '../../marketing/journey-discovery.css';
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

  const displayName = user?.name?.split(' ')[0] || __tr("коллега");

  return (
    <div className="workspace-home">
      <header className="workspace-home-head">
        <h1>{__tr("С чего начнём,")}{displayName}?</h1>
        <p>
          {__tr("Выберите удобную точку входа. Схему данных и наборы данных можно создать прямо во время работы — в панели «Данные» справа от холста.")}</p>
      </header>

      <div className="workspace-entry-grid">
        <button
          type="button"
          className="workspace-entry-card workspace-entry-template"
          onClick={startWithTemplate}
        >
          <div className="workspace-entry-icon" aria-hidden>🎨</div>
          <h2>{__tr("Начать с шаблона")}</h2>
          <p>
            {__tr("Откроется редактор. Справа — панель «Данные»: создайте схему, добавьте наборы данных, перетащите поля на холст.")}</p>
          <span className="workspace-entry-cta">{__tr("Открыть редактор →")}</span>
        </button>

        <button
          type="button"
          className="workspace-entry-card workspace-entry-data"
          onClick={startWithData}
        >
          <div className="workspace-entry-icon" aria-hidden>📊</div>
          <h2>{__tr("Начать с данных")}</h2>
          <p>
            {__tr("Опишите схему данных — список полей — и заполните наборы данных значениями. Затем примените к любому шаблону одной кнопкой.")}</p>
          <span className="workspace-entry-cta">{__tr("Создать схему →")}</span>
        </button>
      </div>

      <section className="workspace-services">
        <h2>{__tr('Ready-to-use services')}</h2>
        <p>{__tr('Choose an invitation, certificates or a QR menu. Fill in a form and get a page, PDF and a link to share.')}</p>
        <div className="workspace-services-links">
          <Link to="/sites/new">{__tr('Create a website')} ↗</Link>
          <Link to="/start/invite">{__tr('Create an invitation')}</Link>
          <Link to="/start/certificates">{__tr('Create certificates')}</Link>
          <Link to="/start/menu">{__tr('Create a QR menu')}</Link>
        </div>
      </section>
      <div className="workspace-home-hint">
        <strong>{__tr("Совет:")}</strong> {__tr("если не знаете, с чего начать, — начните с шаблона. Схема данных и наборы данных создаются прямо в редакторе, никуда не нужно уходить.")}</div>
    </div>
  );
};
