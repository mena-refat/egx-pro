import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App.tsx';
import { ErrorBoundary } from './components/shared/ErrorBoundary';
import './index.css';
import './lib/i18n';
import { initWebPerformanceTracking } from './lib/performance';

if (import.meta.env.PROD && import.meta.env.VITE_SENTRY_DSN) {
  import('@sentry/react').then((Sentry) => {
    Sentry.init({
      dsn: import.meta.env.VITE_SENTRY_DSN,
      environment: import.meta.env.MODE,
      tracesSampleRate: 0.1,
      replaysSessionSampleRate: 0.05,
      replaysOnErrorSampleRate: 1.0,
      beforeSend(event) {
        if (event.user) {
          delete event.user.email;
          delete event.user.ip_address;
        }
        return event;
      },
    });
  });
}

// إخفاء الـ splash screen لما React يتحمل
const splash = document.getElementById('app-splash');
if (splash) {
  splash.style.opacity = '0';
  splash.style.pointerEvents = 'none';
  setTimeout(() => splash.remove(), 300);
}

initWebPerformanceTracking();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <ErrorBoundary>
        <App />
      </ErrorBoundary>
    </BrowserRouter>
  </StrictMode>,
);
