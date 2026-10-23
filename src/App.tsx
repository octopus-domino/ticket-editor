/**
 * Main App Component
 * Entry point with new architecture
 */

import React from 'react';
import { Editor } from './presentation/components';
import './App.css';

const App: React.FC = () => {
  return (
    <div className="app">
      <Editor />
    </div>
  );
};

export default App;
