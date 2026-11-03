import ReactDOM from 'react-dom/client';
import App from './App';
import { configureTelemetry } from '@/infra/telemetry';
import { installSessionLifecycle } from './sessionLifecycle';
import './index.css';
import './App.css';
import '@/features/email/email.css';
import { registerAllElements } from './presentation/components/elements/register-all';
import { EmailModals } from '@/features/email';
import { Toaster } from '@/presentation/components/toast';

registerAllElements();
installSessionLifecycle();
void configureTelemetry();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <>
    <App />
    <EmailModals />
    <Toaster />
  </>,
);
