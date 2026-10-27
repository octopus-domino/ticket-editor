import React from 'react';
import { WorkspaceSidebar } from './WorkspaceSidebar';

export const WorkspacePage: React.FC = () => (
  <div style={{ display: 'flex', height: '100vh' }}>
    <WorkspaceSidebar />
    <main style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8' }}>
      Выберите документ слева или создайте новый
    </main>
  </div>
);