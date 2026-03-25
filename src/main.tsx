import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

declare global {
  interface Window {
    __SW_REG__?: any;
  }
}


if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then((reg) => {
        window.__SW_REG__ = reg;

        if (reg.waiting) {
          window.dispatchEvent(new CustomEvent('sw:update'));
        }

        reg.addEventListener('updatefound', () => {
          const newWorker = reg.installing;
          if (!newWorker) return;
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              window.dispatchEvent(new CustomEvent('sw:update'));
            }
          });
        });

        navigator.serviceWorker.addEventListener('controllerchange', () => {
          window.dispatchEvent(new CustomEvent('sw:controllerchange'));
        });
      })
      .catch((err) => {
        console.warn('Service worker registration failed:', err);
      });
  });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
