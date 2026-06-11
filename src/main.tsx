import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { setupTiksShim } from './tiks-fallback';

// Initialize bulletproof fallback system
setupTiksShim();

// Setup first-click/first-touch activation
let tiksInitialized = false;
const handleFirstClick = () => {
  if (tiksInitialized) return;
  tiksInitialized = true;
  const globalTiks = (window as any).tiks;
  if (globalTiks && typeof globalTiks.init === 'function') {
    try {
      globalTiks.init({ theme: 'soft', volume: 0.3 });
      console.log("[Tiks] Initialized via first user interaction");
    } catch (e) {
      console.error("[Tiks] Initialization error on first click:", e);
    }
  }
  document.removeEventListener('click', handleFirstClick);
  document.removeEventListener('touchstart', handleFirstClick);
};
document.addEventListener('click', handleFirstClick, { capture: true, passive: true });
document.addEventListener('touchstart', handleFirstClick, { capture: true, passive: true });

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
