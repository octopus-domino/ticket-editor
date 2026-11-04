import ReactDOM from 'react-dom/client';
import App from './App';
import { configureTelemetry } from '@/infra/telemetry';
import { installSessionLifecycle } from './sessionLifecycle';
import './index.css';
import './App.css';
import './mobile.css';
import './shared/product-ui.css';
import { getLocale } from '@/shared/i18n';
import { Toaster } from '@/presentation/components/toast';

installSessionLifecycle();
document.documentElement.lang = getLocale();
void configureTelemetry();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <>
    <App />
    <Toaster />
  </>,
);
