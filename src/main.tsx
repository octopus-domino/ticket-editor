import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import './App.css';
import { registerAllElements } from './presentation/components/elements/register-all';

registerAllElements();

ReactDOM.createRoot(document.getElementById('root')!).render(<App />);