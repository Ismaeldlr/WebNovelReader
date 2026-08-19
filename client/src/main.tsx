import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { registerSW } from 'virtual:pwa-register';
import ServiceWorkerUpdateBanner from './components/ServiceWorkerUpdateBanner';
import './styles/globals.css';
import App from './App';

const updateSW = registerSW({
  onNeedRefresh() {
    window.dispatchEvent(new Event('webnovelhub:update-available'));
  },
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ServiceWorkerUpdateBanner updateSW={updateSW} />
    <App />
  </StrictMode>
);
