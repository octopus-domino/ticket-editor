import React from 'react';
import { Outlet } from 'react-router-dom';
import { WorkspaceSidebar } from './WorkspaceSidebar';

/**
 * Общий layout: Sidebar монтируется ОДИН раз и не пересоздаётся
 * при навигации между /  и /editor/:docId. Благодаря этому:
 * - раскрытые папки остаются раскрытыми;
 * - состояние hover/rename не сбрасывается.
 */
export const WorkspaceLayout: React.FC = () => (
  <div style={{ display: 'flex', height: '100vh' }}>
    <WorkspaceSidebar />
    <main
      style={{
        flex: 1,
        minWidth: 0,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      <Outlet />
    </main>
  </div>
);