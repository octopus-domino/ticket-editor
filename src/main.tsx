import ReactDOM from 'react-dom/client';
import App from './App';
import { configureTelemetry } from '@/infra/telemetry';
import { installSessionLifecycle } from './sessionLifecycle';
import './index.css';
import './App.css';
import { Toaster } from '@/presentation/components/toast';

installSessionLifecycle();
void configureTelemetry();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <>
    <App />
    <Toaster />
  </>,
);
